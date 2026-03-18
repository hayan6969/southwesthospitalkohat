
import AppLayout from "@/layouts/AppLayout";
import { StoreRequestsView } from "@/components/inventory/StoreRequestsView";

const DashboardStore = () => {
  return (
    <AppLayout sidebarRole="store">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Dashboard</h1>
          <p className="text-muted-foreground">View approved requests and mark items as provided</p>
        </div>
        <StoreRequestsView />
      </div>
    </AppLayout>
  );
};

export default DashboardStore;
