import { InferenceSession, Tensor } from "onnxruntime-web";

export async function createModelCpu(url: string): Promise<InferenceSession> {
  try {
    // Explicitly specify 'wasm' as the backend
    const session = await InferenceSession.create(url, {
      executionProviders: ["wasm"], // Use WebAssembly
    });
    return session;
  } catch (error) {
    console.error(`ONNX Model Loading Error: ${error.message}`);
    throw new Error(`Failed to load ONNX model from ${url}: ${error.message}`);
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
