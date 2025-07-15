
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse h-[180px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gray-100 w-12 h-12"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-end">
          {chart && <div className="h-12 bg-gray-100 rounded w-full"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-200 h-[180px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
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
          <div className="h-12 w-full">
            {chart}
          </div>
        )}
      </div>
    </div>
  );
}
