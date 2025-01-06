import React, { useState, useEffect } from "react";

interface DetectionResult {
  className: string;
  score: number;
  boundingBox: number[];
  timestamp: string; // Add timestamp property
}

interface DetectionResultsProps {
  detectionResults?: DetectionResult[];
}

const DetectionResults: React.FC<DetectionResultsProps> = ({
  detectionResults,
}) => {
  const [allResults, setAllResults] = useState<DetectionResult[]>([]);

  useEffect(() => {
    if (detectionResults && detectionResults.length > 0) {
      const updatedResults = detectionResults.map((result) => ({
        ...result,
        timestamp: new Date().toLocaleString(), // Add a timestamp to each result
      }));
      setAllResults((prevResults) => [...prevResults, ...updatedResults]);
    }
  }, [detectionResults]);

  if (!allResults || allResults.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-100 p-2 rounded-lg">
      <div className="space-y-2">
        {allResults.map((result, index) => (
          <div
            key={index}
            className="bg-white p-3 rounded-md shadow-sm flex flex-col items-start space-y-1"
          >
            <span className="font-medium">
              {result.className} - {result.score}%
            </span>

            <span className="text-sm text-gray-500">
              Bounding Box: [
              {result.boundingBox.map((v) => v.toFixed(1)).join(", ")}]
            </span>

            <span className="text-xs text-gray-400">
              Detected at: {result.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetectionResults;
