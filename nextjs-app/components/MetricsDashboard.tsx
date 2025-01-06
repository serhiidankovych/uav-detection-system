import React from "react";
import { LucideIcon } from "lucide-react";

type ColorScheme = "blue" | "green" | "purple" | "orange" | "red";

interface Metric {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

interface MetricsDashboardProps {
  metrics: Metric[];
}

const colorClasses: Record<ColorScheme, string> = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  purple: "bg-purple-100 text-purple-800",
  orange: "bg-orange-100 text-orange-800",
  red: "bg-red-100 text-red-800",
};

const iconColors: Record<ColorScheme, string> = {
  blue: "text-blue-600",
  green: "text-green-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
  red: "text-red-600",
};

const MetricCard: React.FC<Metric> = ({
  icon: Icon,
  value,
  label,
  colorScheme,
}) => {
  return (
    <div
      className={`flex items-center p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${colorClasses[colorScheme]}`}
    >
      <Icon
        className={`w-6 h-6 ${iconColors[colorScheme]} mr-3 flex-shrink-0`}
      />
      <div className="min-w-0">
        <div className="font-medium text-sm sm:text-base truncate">
          {label} {value}
        </div>
      </div>
    </div>
  );
};

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics }) => {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className="flex-1 min-w-[200px]">
          <MetricCard {...metric} />
        </div>
      ))}
    </div>
  );
};

export default MetricsDashboard;
