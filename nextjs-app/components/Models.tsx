import { useState, useEffect } from "react";
import ndarray from "ndarray";
import ops from "ndarray-ops";
import { Tensor } from "onnxruntime-web";
import PhotoUploadDetection from "./PhotoUploadDetection";
import VideoUploadDetection from "./VideoUploadDetection";
import CameraDetection from "./CameraDetection";
import { yoloClasses } from "../data/yolo_classes";
import { runModelUtils } from "../utils";
import { useModel } from "../context/ModelContext"; // Import the context

type Mode = "photo" | "video" | "livestream";

const COMPONENTS: Record<Mode, React.FC<any>> = {
  photo: PhotoUploadDetection,
  video: VideoUploadDetection,
  livestream: CameraDetection,
};

const Yolo = ({ mode }: { mode: string }) => {
  const { modelIndex, RES_TO_MODEL, modelName, modelResolution } = useModel(); // Get modelIndex from context
  const [session, setSession] = useState<any>(null);
  const [detectionResults, setDetectionResults] = useState<
    Array<{
      className: string;
      score: number;
      boundingBox: [number, number, number, number];
    }>
  >([]);

  useEffect(() => {
    // Load the model session
    const getSession = async () => {
      const session = await runModelUtils.createModelCpu(
        `./_next/static/chunks/pages/${modelName}`
      );
      setSession(session);
    };
    getSession();

    console.log(
      `Selected Model: ${modelName} (Resolution: ${modelResolution})`
    );
  }, [modelIndex]); // Re-run the effect whenever modelIndex changes

  const resizeCanvasCtx = (
    ctx: CanvasRenderingContext2D,
    targetWidth: number,
    targetHeight: number,
    inPlace = false
  ) => {
    let canvas: HTMLCanvasElement;

    if (inPlace) {
      canvas = ctx.canvas;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.scale(
        targetWidth / canvas.clientWidth,
        targetHeight / canvas.clientHeight
      );
    } else {
      canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas
        .getContext("2d")!
        .drawImage(ctx.canvas, 0, 0, targetWidth, targetHeight);
      ctx = canvas.getContext("2d")!;
    }

    return ctx;
  };

  const preprocess = (ctx: CanvasRenderingContext2D) => {
    const resizedCtx = resizeCanvasCtx(
      ctx,
      modelResolution[0],
      modelResolution[1]
    );

    const imageData = resizedCtx.getImageData(
      0,
      0,
      modelResolution[0],
      modelResolution[1]
    );
    const { data, width, height } = imageData;

    const dataTensor = ndarray(new Float32Array(data), [width, height, 4]);
    const dataProcessedTensor = ndarray(new Float32Array(width * height * 3), [
      1,
      3,
      width,
      height,
    ]);

    ops.assign(
      dataProcessedTensor.pick(0, 0, null, null),
      dataTensor.pick(null, null, 0)
    );
    ops.assign(
      dataProcessedTensor.pick(0, 1, null, null),
      dataTensor.pick(null, null, 1)
    );
    ops.assign(
      dataProcessedTensor.pick(0, 2, null, null),
      dataTensor.pick(null, null, 2)
    );

    ops.divseq(dataProcessedTensor, 255);

    const tensor = new Tensor("float32", new Float32Array(width * height * 3), [
      1,
      3,
      width,
      height,
    ]);

    (tensor.data as Float32Array).set(dataProcessedTensor.data);
    return tensor;
  };

  const conf2color = (conf: number) => {
    const r = Math.round(255 * (1 - conf));
    const g = Math.round(255 * conf);
    return `rgb(${r},${g},0)`;
  };

  interface Tensor {
    dims: number[];
    data: Float32Array | Int32Array | Uint8Array;
  }

  interface DetectionResult {
    className: string;
    score: number;
    boundingBox: [number, number, number, number];
  }

  const postprocess = async (
    tensor: Tensor,
    inferenceTime: number,
    ctx: CanvasRenderingContext2D,
    modelName: string
  ): Promise<void> => {
    const results: DetectionResult[] = [];
    const dx = ctx.canvas.width / modelResolution[0];
    const dy = ctx.canvas.height / modelResolution[1];

    // Convert tensor data to numbers and process in chunks of 6
    const data = Array.from(tensor.data);
    for (let i = 0; i < tensor.dims[1]; i += 6) {
      const [x0, y0, x1, y1, score, cls_id] = data.slice(i, i + 6).map(Number);

      if (score < 0.5) continue;

      // Scale coordinates
      const scaledX0 = x0 * dx;
      const scaledY0 = y0 * dy;
      const scaledX1 = x1 * dx;
      const scaledY1 = y1 * dy;

      // Round values only once when needed
      const roundedX0 = Math.round(scaledX0);
      const roundedY0 = Math.round(scaledY0);
      const roundedX1 = Math.round(scaledX1);
      const roundedY1 = Math.round(scaledY1);
      const roundedScore = Math.round(score * 1000) / 10;

      results.push({
        className: yoloClasses[cls_id],
        score: roundedScore,
        boundingBox: [roundedX0, roundedY0, roundedX1, roundedY1],
      });

      // Draw detection box and label
      const color = conf2color(score);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        scaledX0,
        scaledY0,
        scaledX1 - scaledX0,
        scaledY1 - scaledY0
      );

      // Draw label
      ctx.font = "16px Arial";
      ctx.fillStyle = color;
      ctx.fillText(
        `${yoloClasses[cls_id]} ${Math.round(score * 100)}%`,
        scaledX0,
        scaledY0 - 5
      );
    }

    setDetectionResults(results);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-500 rounded-full animate-ping"></div>
          <div className="text-center text-lg font-semibold text-gray-700 mt-4">
            Loading model...
          </div>
        </div>
      </div>
    );
  }

  const Component = COMPONENTS[mode as Mode]; // Assert mode is of type Mode

  return Component ? (
    <Component
      preprocess={preprocess}
      postprocess={postprocess}
      session={session}
      detectionResults={detectionResults}
      currentModelResolution={modelResolution}
      modelName={modelName}
    />
  ) : (
    <div>Invalid mode</div>
  );
};

export default Yolo;
