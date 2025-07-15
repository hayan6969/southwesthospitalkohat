
import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative";
  icon: ReactNode;
  chart?: ReactNode;
  loading?: boolean;
};

export function StatsCard({ title, value, change, changeType, icon, chart, loading }: StatsCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse h-[120px] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 w-10 h-10"></div>
            <div>
              <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-end">
          {chart && <div className="h-8 bg-gray-100 rounded w-full"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200 h-[120px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-600 mb-1 truncate">{title}</p>
            <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
            changeType === "positive" 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {changeType === "positive" ? (
              <TrendingUp className="w-3 h-3 flex-shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="truncate">{change}</span>
          </div>
        )}
      </div>
      <div className="flex-1 flex items-end">
        {chart && (
          <div className="h-8 w-full">
            {chart}
          </div>
        )}
      </div>
    </div>
  );
}
