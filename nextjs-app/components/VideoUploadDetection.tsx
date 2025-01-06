import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { runModelUtils } from "../utils";
import { InferenceSession, Tensor } from "onnxruntime-web";
import { Upload, Camera, Zap, Clock, Pause, Play, X, Info } from "lucide-react";
import MetricsDashboard from "./MetricsDashboard";
import DetectionResults from "./DetectionResults";

type DetectionResult = {
  className: string;
  score: number;
  boundingBox: [number, number, number, number];
  timestamp: string;
};

interface VideoUploadDetectionProps {
  modelName: string;
  session: InferenceSession;
  preprocess: (ctx: CanvasRenderingContext2D) => Tensor;
  postprocess: (
    outputTensor: Tensor,
    inferenceTime: number,
    ctx: CanvasRenderingContext2D,
    modelName: string
  ) => void;
  detectionResults?: DetectionResult[];
  maxFileSize?: number;
  allowedVideoFormats?: string[];
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024;
const DEFAULT_VIDEO_FORMATS = ["video/mp4", "video/webm", "video/ogg"];

const VideoUploadDetection: React.FC<VideoUploadDetectionProps> = ({
  modelName,
  session,
  preprocess,
  postprocess,
  detectionResults,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedVideoFormats = DEFAULT_VIDEO_FORMATS,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const processingTimeRef = useRef<number[]>([]);
  const videoUrlRef = useRef<string | null>(null);

  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<
    "idle" | "processing" | "paused"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);

  const resetStats = useCallback(() => {
    setInferenceTime(0);
    setFrameCount(0);
    setFps(0);
    processingTimeRef.current = [];
  }, []);

  const cleanupVideo = useCallback(() => {
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setIsVideoReady(false);
    if (videoRef.current) {
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  }, []);

  const handleVideoUpload = useCallback(
    async (file: File) => {
      if (!allowedVideoFormats.includes(file.type)) {
        setError(
          `Invalid format. Supported: ${allowedVideoFormats
            .map((f) => f.split("/")[1])
            .join(", ")}`
        );
        return;
      }

      if (file.size > maxFileSize) {
        setError(`File exceeds ${maxFileSize / (1024 * 1024)}MB limit`);
        return;
      }

      cleanupVideo();
      resetStats();
      setError(null);
      setVideoFile(file);

      try {
        if (!videoRef.current) throw new Error("Video element not found");

        const objectUrl = URL.createObjectURL(file);
        videoUrlRef.current = objectUrl;
        videoRef.current.src = objectUrl;

        await new Promise((resolve, reject) => {
          if (!videoRef.current) reject(new Error("Video element not found"));
          videoRef.current!.onloadedmetadata = () => resolve(true);
          videoRef.current!.onerror = () =>
            reject(new Error("Video load failed"));
        });

        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }

        setIsVideoReady(true);
      } catch (err) {
        console.error("Video setup error:", err);
        setError("Failed to load video. Please try again.");
        cleanupVideo();
      }
    },
    [allowedVideoFormats, maxFileSize, cleanupVideo, resetStats]
  );

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      setError("Failed to get canvas context");
      return;
    }

    const frameStartTime = performance.now();

    if (!video.paused && !video.ended) {
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = preprocess(context);
        const [outputTensor, modelTime] = await runModelUtils.runModel(
          session,
          data
        );

        postprocess(outputTensor, modelTime, context, modelName);

        const frameTime = performance.now() - frameStartTime;
        processingTimeRef.current.push(frameTime);

        if (processingTimeRef.current.length > 30) {
          processingTimeRef.current.shift();
        }

        const averageTime =
          processingTimeRef.current.reduce((a, b) => a + b, 0) /
          processingTimeRef.current.length;

        setFrameCount((prev) => prev + 1);
        setInferenceTime(modelTime);
        setFps(Math.round(1000 / averageTime));

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error("Frame processing error:", err);
        stopProcessing();
        setError("Error processing video frames. Please try again.");
      }
    }
  }, [preprocess, postprocess, session, modelName, isVideoReady]);

  const startProcessing = useCallback(() => {
    if (!videoRef.current || !isVideoReady) return;
    videoRef.current.play();
    setProcessingStatus("processing");
    processFrame();
  }, [processFrame, isVideoReady]);

  const pauseProcessing = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setProcessingStatus("paused");
  }, []);

  const stopProcessing = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setProcessingStatus("idle");
    resetStats();
  }, [resetStats]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cleanupVideo();
    };
  }, [cleanupVideo]);

  type ColorScheme = "blue" | "green" | "purple" | "orange" | "red";

  const metrics = useMemo(
    () => [
      {
        label: "Inference Time",
        icon: Clock,
        value: `${inferenceTime} ms`,
        colorScheme: "blue" as ColorScheme,
      },
      {
        label: "FPS",
        icon: Camera,
        value: fps,
        colorScheme: "green" as ColorScheme,
      },
      {
        label: "Frame Count",
        icon: Play,
        value: frameCount,
        colorScheme: "orange" as ColorScheme,
      },
    ],

    [inferenceTime]
  );
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-white shadow-lg rounded-xl p-6 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          UAV Video Detection
        </h1>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) =>
            e.target.files?.[0] && handleVideoUpload(e.target.files[0])
          }
          accept={allowedVideoFormats.join(",")}
          className="hidden"
          aria-label="Upload video file"
        />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <X className="w-6 h-6 text-red-600" />
            </span>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleVideoUpload(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer 
            transition-all duration-300 select-none
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            }
          `}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Drop zone for video upload"
        >
          <div className="flex flex-col items-center space-y-2">
            <Upload className="w-12 h-12 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">
              {videoFile
                ? videoFile.name
                : "Drag & Drop video or click to select"}
            </p>
          </div>
        </div>

        <div className={isVideoReady ? "space-y-6" : " space-y-6 hidden"}>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <video
                ref={videoRef}
                className="w-full rounded-lg shadow-md"
                controls={processingStatus === "idle"}
                playsInline
                onError={() =>
                  setError("Error loading video. Please try a different file.")
                }
              />
            </div>
            <div className="flex-1">
              <canvas ref={canvasRef} className="w-full rounded-lg shadow-md" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-start">
            {processingStatus === "idle" && (
              <button
                onClick={startProcessing}
                disabled={!isVideoReady}
                className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Camera className="w-5 h-5" />
                <span>Start Detection</span>
              </button>
            )}

            {processingStatus === "processing" && (
              <>
                <button
                  onClick={pauseProcessing}
                  className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={stopProcessing}
                  className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  <X className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              </>
            )}

            {processingStatus === "paused" && (
              <>
                <button
                  onClick={startProcessing}
                  className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  <Play className="w-5 h-5" />
                  <span>Resume</span>
                </button>
                <button
                  onClick={stopProcessing}
                  className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  <X className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
          <MetricsDashboard metrics={metrics} />

          <div className="bg-gray-100 p-4 rounded-md shadow-md">
            <h2 className="text-lg font-semibold mb-2">Detection Results</h2>
            <DetectionResults detectionResults={detectionResults} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadDetection;
