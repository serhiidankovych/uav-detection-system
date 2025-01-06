import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Webcam from "react-webcam";
import { runModelUtils } from "../utils";
import { InferenceSession, Tensor } from "onnxruntime-web";
import { Camera, Clock, Play, X, RotateCw } from "lucide-react";
import MetricsDashboard from "./MetricsDashboard";
import DetectionResults from "./DetectionResults";

type DetectionResult = {
  className: string;
  score: number;
  boundingBox: [number, number, number, number];
  timestamp: string;
};

interface WebcamDetectionProps {
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
}

const WebcamDetection: React.FC<WebcamDetectionProps> = ({
  modelName,
  session,
  preprocess,
  postprocess,
  detectionResults,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingTimeRef = useRef<number[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const requestRef = useRef<number>();

  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const resetStats = useCallback(() => {
    setInferenceTime(0);
    setFrameCount(0);
    setFps(0);
    processingTimeRef.current = [];
  }, []);

  const capture = useCallback(() => {
    if (!webcamRef.current?.video || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = webcamRef.current.video;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    if (facingMode === "user") {
      context.setTransform(-1, 0, 0, 1, canvas.width, 0);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (facingMode === "user") {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }

    return context;
  }, [facingMode]);

  const processFrame = useCallback(async () => {
    if (!isDetecting || isProcessingRef.current) return;

    isProcessingRef.current = true;
    const context = capture();

    if (context) {
      const frameStartTime = performance.now();

      try {
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
      } catch (err) {
        console.error("Frame processing error:", err);
        setError("Error processing video frames. Please try again.");
        setIsDetecting(false);
      }
    }

    isProcessingRef.current = false;
  }, [capture, isDetecting, preprocess, postprocess, session, modelName]);

  const animate = useCallback(() => {
    processFrame();
    requestRef.current = requestAnimationFrame(animate);
  }, [processFrame]);

  useEffect(() => {
    if (isDetecting) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isDetecting, animate]);

  const toggleDetection = useCallback(() => {
    if (!isDetecting) {
      resetStats();
    }
    setIsDetecting((prev) => !prev);
  }, [isDetecting, resetStats]);

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    if (isDetecting) {
      setIsDetecting(false);
      resetStats();
    }
  }, [isDetecting, resetStats]);

  type ColorScheme = "blue" | "green" | "orange";

  const metrics = useMemo(
    () => [
      {
        label: "Inference Time",
        icon: Clock,
        value: `${inferenceTime.toFixed(1)} ms`,
        colorScheme: "blue" as ColorScheme,
      },
      {
        label: "FPS",
        icon: Camera,
        value: fps,
        colorScheme: "green" as ColorScheme,
      },
      {
        label: "Frame Count" as ColorScheme,
        icon: Play,
        value: frameCount,
        colorScheme: "orange" as ColorScheme,
      },
    ],
    [inferenceTime, fps, frameCount]
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-white shadow-lg rounded-xl p-6 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          UAV Camera Detection
        </h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <X className="w-6 h-6 text-red-600" />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              mirrored={facingMode === "user"}
              videoConstraints={{
                facingMode,
                width: 640,
                height: 480,
              }}
              className="w-full rounded-lg shadow-md"
            />
          </div>
          <div className="flex-1">
            <canvas ref={canvasRef} className="w-full rounded-lg shadow-md" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-start">
          <button
            onClick={toggleDetection}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${
              isDetecting
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {isDetecting ? (
              <>
                <X className="w-5 h-5" />
                <span>Stop Detection</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>Start Detection</span>
              </>
            )}
          </button>

          <button
            onClick={switchCamera}
            className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
          >
            <RotateCw className="w-5 h-5" />
            <span>Switch Camera</span>
          </button>
        </div>

        {isDetecting && (
          <>
            <MetricsDashboard metrics={metrics} />
            <div className="bg-gray-100 p-4 rounded-md shadow-md">
              <h2 className="text-lg font-semibold mb-2">Detection Results</h2>
              <DetectionResults detectionResults={detectionResults} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WebcamDetection;
