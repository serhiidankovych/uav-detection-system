import { createContext, useContext, useState } from "react";

const ModelContext = createContext<any>(null);

export const ModelProvider = ({ children }: { children: React.ReactNode }) => {
  const [modelIndex, setModelIndex] = useState<number>(0);

  const RES_TO_MODEL: [number[], string][] = [
    [[160, 160], "yolov10n200e.onnx"],
    [[256, 256], "yolov10n200e.onnx"],
    [[320, 320], "yolov10n200e.onnx"],
    [[640, 640], "yolov10n200e.onnx"],
    [[160, 160], "yolov10m200e.onnx"],
    [[256, 256], "yolov10m200e.onnx"],
    [[320, 320], "yolov10m200e.onnx"],
    [[640, 640], "yolov10m200e.onnx"],
  ];

  const modelResolution = RES_TO_MODEL[modelIndex][0];
  const modelName = RES_TO_MODEL[modelIndex][1];

  return (
    <ModelContext.Provider
      value={{
        modelIndex,
        modelResolution,
        modelName,
        RES_TO_MODEL,
        setModelIndex,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => useContext(ModelContext);
