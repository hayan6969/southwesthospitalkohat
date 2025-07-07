
import AppLayout from "@/layouts/AppLayout";
import { PharmacyOverview } from "@/components/PharmacyOverview";

export default function AdminPharmacy() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Pharmacy Overview</h2>
          <p className="text-gray-600">Monitor pharmacy operations and inventory</p>
        </div>
        <PharmacyOverview />
      </div>
    </AppLayout>
  );
}
