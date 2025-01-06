import { useRef, useState, useMemo } from "react";
import { runModelUtils } from "../utils";
import { InferenceSession, Tensor } from "onnxruntime-web";
import { Upload, Search, Zap, Clock } from "lucide-react";
import MetricsDashboard from "./MetricsDashboard";
import DetectionResults from "./DetectionResults";

interface DetectionResult {
  className: string;
  score: number;
  boundingBox: [number, number, number, number];
  timestamp: string;
}

interface PhotoUploadDetectionProps {
  modelName: string;
  session: InferenceSession;
  preprocess: (ctx: CanvasRenderingContext2D) => Tensor;
  postprocess: (
    outputTensor: Tensor,
    inferenceTime: number,
    ctx: CanvasRenderingContext2D,
    modelName: string
  ) => void;
  detectionResults?: Array<DetectionResult>;
}

const PhotoUploadDetection: React.FC<PhotoUploadDetectionProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d")!;
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const runModel = async (ctx: CanvasRenderingContext2D) => {
    const data = props.preprocess(ctx);
    let outputTensor: Tensor;
    let inferenceTime: number;
    [outputTensor, inferenceTime] = await runModelUtils.runModel(
      props.session,
      data
    );

    console.log("Model Output Tensor:", outputTensor);
    console.log("Inference Time:", inferenceTime);
    console.log("Total Time:", totalTime + inferenceTime);
    console.log("Model Name:", props.modelName);

    props.postprocess(outputTensor, inferenceTime, ctx, props.modelName);
    setInferenceTime(inferenceTime);
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d")!;
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const processImage = async () => {
    if (imageFile) {
      const img = new Image();
      img.onload = async () => {
        clearCanvas();
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d")!;
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        const startTime = Date.now();
        await runModel(context);
        setTotalTime(Date.now() - startTime);
      };
      img.src = URL.createObjectURL(imageFile);
    }
  };

  type ColorScheme = "blue" | "green" | "purple" | "orange" | "red";

  const metrics = useMemo(
    () => [
      {
        label: "Inference Time",
        icon: Clock,
        value: `${inferenceTime} ms`,
        colorScheme: "blue" as ColorScheme, // Explicitly cast to ColorScheme
      },
    ],
    [inferenceTime]
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-white shadow-lg rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          UAV Photo Detection
        </h1>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-4 md:p-8 text-center cursor-pointer 
            transition-all duration-300 ease-in-out
            ${
              isDragging
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-300 bg-gray-50 text-gray-600 hover:border-blue-500 hover:bg-blue-50"
            }
          `}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="w-8 md:w-12 h-8 md:h-12 text-gray-400" />
            {imageFile ? (
              <p className="text-sm md:text-base font-medium text-gray-800">
                {imageFile.name}
              </p>
            ) : (
              <p className="text-xs md:text-sm font-medium">
                Drag & Drop your image file here, or click to select
              </p>
            )}
          </div>
        </div>

        {imageFile && (
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 flex justify-center">
              <canvas
                ref={canvasRef}
                className="w-full max-h-[50vh] object-contain rounded-lg"
              />
            </div>

            <div className="flex flex-col space-y-4 lg:min-w-[300px]">
              <MetricsDashboard metrics={metrics} />
              <div className="bg-gray-100 p-4 rounded-md shadow-md">
                <h2 className="text-lg font-semibold mb-2">
                  Detection Results
                </h2>
                <DetectionResults detectionResults={props.detectionResults} />
              </div>
            </div>
          </div>
        )}

        {imageFile && (
          <button
            onClick={processImage}
            disabled={!imageFile}
            className={`w-full md:w-auto flex items-center justify-center space-x-2 px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out
              ${
                imageFile
                  ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
          >
            <Search className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base">Detect</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PhotoUploadDetection;
