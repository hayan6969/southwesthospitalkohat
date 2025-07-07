
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { usePharmacyStats } from "@/hooks/usePharmacyStats";
import { Package, AlertTriangle, DollarSign, TrendingUp } from "lucide-react";

export default function DashboardPharmacy() {
  const { data: stats, isLoading } = usePharmacyStats();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pharmacy Dashboard</h1>
          <p className="text-gray-600 mt-1">Medicine inventory and sales overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Medicines"
            value={stats?.totalMedicines || 0}
            icon={<Package className="w-5 h-5 text-blue-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Low Stock Items"
            value={stats?.lowStock || 0}
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Expired Items"
            value={stats?.expired || 0}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Total Revenue"
            value={`₨${stats?.totalRevenue || 0}`}
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Sales
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Paracetamol 500mg</span>
                <span className="font-medium">₨120</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Amoxicillin 250mg</span>
                <span className="font-medium">₨350</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Vitamin D3</span>
                <span className="font-medium">₨250</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alerts
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm">5 medicines expired this month</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm">{stats?.lowStock || 0} items running low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">12 medicines expiring next month</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
