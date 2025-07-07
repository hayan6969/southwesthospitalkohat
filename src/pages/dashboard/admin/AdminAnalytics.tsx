
import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { AppointmentChart } from "@/components/AppointmentChart";
import { MiniChart } from "@/components/MiniChart";
import { useStats, useUsers } from "@/hooks/useDatabase";
import { Users, Activity, Shield, DollarSign } from "lucide-react";

const chartData = {
  doctors: [{ value: 180 }, { value: 200 }, { value: 247 }, { value: 230 }, { value: 247 }],
  patients: [{ value: 3800 }, { value: 4000 }, { value: 4178 }, { value: 4100 }, { value: 4178 }],
  appointments: [{ value: 11000 }, { value: 11500 }, { value: 12178 }, { value: 12000 }, { value: 12178 }],
  revenue: [{ value: 48000 }, { value: 52000 }, { value: 55240 }, { value: 54000 }, { value: 55240 }],
};

export default function AdminAnalytics() {
  const { data: stats } = useStats();
  const { data: users } = useUsers();

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={users?.length?.toString() || "0"}
          change="+12%"
          changeType="positive"
          icon={<Users className="w-5 h-5 text-blue-600" />}
          chart={<MiniChart data={chartData.doctors} type="bar" color="#3b82f6" />}
        />
        <StatsCard
          title="Active Sessions"
          value="45"
          change="+8%"
          changeType="positive"
          icon={<Activity className="w-5 h-5 text-green-600" />}
          chart={<MiniChart data={chartData.patients} type="area" color="#10b981" />}
        />
        <StatsCard
          title="System Uptime"
          value="99.9%"
          change="0%"
          changeType="neutral"
          icon={<Shield className="w-5 h-5 text-purple-600" />}
          chart={<MiniChart data={chartData.appointments} type="line" color="#8b5cf6" />}
        />
        <StatsCard
          title="Daily Transactions"
          value="1,234"
          change="+18%"
          changeType="positive"
          icon={<DollarSign className="w-5 h-5 text-orange-600" />}
          chart={<MiniChart data={chartData.revenue} type="bar" color="#f97316" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <AppointmentChart />
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">User Role Distribution</h3>
          <div className="space-y-3">
            {['doctor', 'staff', 'pharmacy', 'finance', 'admin'].map(role => {
              const count = users?.filter(u => u.role === role).length || 0;
              const percentage = users?.length ? Math.round((count / users.length) * 100) : 0;
              return (
                <div key={role} className="flex items-center justify-between">
                  <span className="capitalize font-medium">{role}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                    <div className="w-16 h-2 bg-gray-200 rounded">
                      <div 
                        className="h-full bg-blue-500 rounded" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
