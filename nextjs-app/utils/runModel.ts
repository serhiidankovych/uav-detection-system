import { InferenceSession, Tensor } from "onnxruntime-web";

export async function createModelCpu(url: string): Promise<InferenceSession> {
  try {
    const session = await InferenceSession.create(url, {
      executionProviders: ["wasm"], // Use WebAssembly
    });
    return session;
  } catch (error: unknown) {
    // Assert that the error is of type Error
    if (error instanceof Error) {
      console.error(`ONNX Model Loading Error: ${error.message}`);
      throw new Error(
        `Failed to load ONNX model from ${url}: ${error.message}`
      );
    } else {
      console.error("An unknown error occurred while loading the ONNX model.");
      throw new Error(`Failed to load ONNX model from ${url}`);
    }
  }
}

export async function runModel(
  model: InferenceSession,
  preprocessedData: Tensor
): Promise<[Tensor, number]> {
  try {
    const feeds: Record<string, Tensor> = {};
    feeds[model.inputNames[0]] = preprocessedData;
    const start = Date.now();
    const outputData = await model.run(feeds);
    const end = Date.now();
    const inferenceTime = end - start;
    const output = outputData[model.outputNames[0]];
    return [output, inferenceTime];
  } catch (e) {
    console.error(e);
    throw new Error();
  }
}
