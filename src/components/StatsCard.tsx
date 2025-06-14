
import { ReactNode } from "react";

type StatsCardProps = {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative";
  icon: ReactNode;
  chart?: ReactNode;
};

export function StatsCard({ title, value, change, changeType, icon, chart }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/50">
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            changeType === "positive" 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          }`}>
            {change}
          </div>
        )}
      </div>
      {chart && (
        <div className="h-12">
          {chart}
        </div>
      )}
    </div>
  );
}
