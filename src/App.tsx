import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useRealTimeUpdates } from "./hooks/useRealTimeUpdates";
import ProtectedRoute from "./components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OfflineMode = lazy(() => import("./pages/OfflineMode"));
const OfflineModePharmacy = lazy(() => import("./pages/OfflineModePharmacy"));

const DashboardPatient = lazy(() => import("./pages/dashboard/DashboardPatient"));
const DashboardDoctor = lazy(() => import("./pages/dashboard/DashboardDoctor"));
const DashboardStaff = lazy(() => import("./pages/dashboard/DashboardStaff"));
const DashboardAdmin = lazy(() => import("./pages/dashboard/DashboardAdmin"));
const DashboardPharmacy = lazy(() => import("./pages/dashboard/DashboardPharmacy"));
const DashboardOTA = lazy(() => import("./pages/dashboard/DashboardOTA"));
const DashboardStore = lazy(() => import("./pages/dashboard/DashboardStore"));
const DashboardLab = lazy(() => import("./pages/dashboard/DashboardLab"));

const DoctorSchedule = lazy(() => import("./pages/dashboard/doctor/DoctorSchedule"));
const DoctorPatients = lazy(() => import("./pages/dashboard/doctor/DoctorPatients"));
const DoctorNotes = lazy(() => import("./pages/dashboard/doctor/DoctorNotes"));

const PatientAppointments = lazy(() => import("./pages/dashboard/patient/PatientAppointments"));
const PatientRecords = lazy(() => import("./pages/dashboard/patient/PatientRecords"));
const PatientInvoices = lazy(() => import("./pages/dashboard/patient/PatientInvoices"));
const PatientLabs = lazy(() => import("./pages/dashboard/patient/PatientLabs"));

const StaffPatients = lazy(() => import("./pages/dashboard/staff/StaffPatients"));
const StaffAppointments = lazy(() => import("./pages/dashboard/staff/StaffAppointments"));
const StaffInvoices = lazy(() => import("./pages/dashboard/staff/StaffInvoices"));
const StaffLabs = lazy(() => import("./pages/dashboard/staff/StaffLabs"));

const AdminDepartments = lazy(() => import("./pages/dashboard/admin/AdminDepartments"));
const AdminStaff = lazy(() => import("./pages/dashboard/admin/AdminStaff"));
const AdminDoctors = lazy(() => import("./pages/dashboard/admin/AdminDoctors"));
const AdminAuditLogs = lazy(() => import("./pages/dashboard/admin/AdminAuditLogs"));
const AdminSettings = lazy(() => import("./pages/dashboard/admin/AdminSettings"));
const AdminRegions = lazy(() => import("./pages/dashboard/admin/AdminRegions"));

const PharmacyMedicines = lazy(() => import("./pages/dashboard/pharmacy/PharmacyMedicines"));
const PharmacyInvoices = lazy(() => import("./pages/dashboard/pharmacy/PharmacyInvoices"));
const PharmacyExpiry = lazy(() => import("./pages/dashboard/pharmacy/PharmacyExpiry"));
const PharmacyAnalytics = lazy(() => import("./pages/dashboard/pharmacy/PharmacyAnalytics"));
const PharmacySell = lazy(() => import("./pages/dashboard/pharmacy/PharmacySell"));
const PharmacyStock = lazy(() => import("./pages/dashboard/pharmacy/PharmacyStock"));
const PharmacyReturns = lazy(() => import("./pages/dashboard/pharmacy/PharmacyReturns"));
const PharmacyLabReports = lazy(() => import("./pages/dashboard/pharmacy/PharmacyLabReports"));

const FinanceRoutes = lazy(() => import("./pages/dashboard/FinanceRoutes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchInterval: 1000 * 60,
      retry: 1,
    },
  },
});

const RealTimeProvider = ({ children }: { children: React.ReactNode }) => {
  useRealTimeUpdates();
  return <>{children}</>;
};

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="text-sm font-medium">Loading...</span>
    </div>
  </div>
);

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<RouteLoader />}>{element}</Suspense>
);

const protectedElement = (element: React.ReactNode, allowedRoles?: string[]) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{withSuspense(element)}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <RealTimeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={withSuspense(<Auth />)} />
              <Route path="/offline-mode" element={withSuspense(<OfflineMode />)} />
              <Route path="/offline-mode-pharmacy" element={withSuspense(<OfflineModePharmacy />)} />
              <Route path="/" element={protectedElement(<Index />)} />

              <Route path="/dashboard/patient" element={protectedElement(<DashboardPatient />, ['patient'])} />
              <Route path="/dashboard/patient/appointments" element={protectedElement(<PatientAppointments />, ['patient'])} />
              <Route path="/dashboard/patient/records" element={protectedElement(<PatientRecords />, ['patient'])} />
              <Route path="/dashboard/patient/invoices" element={protectedElement(<PatientInvoices />, ['patient'])} />
              <Route path="/dashboard/patient/labs" element={protectedElement(<PatientLabs />, ['patient'])} />

              <Route path="/dashboard/doctor" element={protectedElement(<DashboardDoctor />, ['doctor', 'admin'])} />
              <Route path="/dashboard/doctor/schedule" element={protectedElement(<DoctorSchedule />, ['doctor', 'admin'])} />
              <Route path="/dashboard/doctor/patients" element={protectedElement(<DoctorPatients />, ['doctor', 'admin'])} />
              <Route path="/dashboard/doctor/notes" element={protectedElement(<DoctorNotes />, ['doctor', 'admin'])} />

              <Route path="/dashboard/staff" element={protectedElement(<DashboardStaff />, ['staff', 'admin'])} />
              <Route path="/dashboard/staff/patients" element={protectedElement(<StaffPatients />, ['staff', 'admin'])} />
              <Route path="/dashboard/staff/appointments" element={protectedElement(<StaffAppointments />, ['staff', 'admin'])} />
              <Route path="/dashboard/staff/invoices" element={protectedElement(<StaffInvoices />, ['staff', 'admin'])} />
              <Route path="/dashboard/staff/labs" element={protectedElement(<StaffLabs />, ['staff', 'admin'])} />

              <Route path="/dashboard/ota" element={protectedElement(<DashboardOTA />, ['ota', 'nursing', 'admin'])} />

              <Route path="/dashboard/admin" element={protectedElement(<DashboardAdmin />, ['admin'])} />
              <Route path="/dashboard/admin/departments" element={protectedElement(<AdminDepartments />, ['admin'])} />
              <Route path="/dashboard/admin/staff" element={protectedElement(<AdminStaff />, ['admin'])} />
              <Route path="/dashboard/admin/doctors" element={protectedElement(<AdminDoctors />, ['admin'])} />
              <Route path="/dashboard/admin/audit-logs" element={protectedElement(<AdminAuditLogs />, ['admin'])} />
              <Route path="/dashboard/admin/settings" element={protectedElement(<AdminSettings />, ['admin'])} />
              <Route path="/dashboard/admin/regions" element={protectedElement(<AdminRegions />, ['admin'])} />

              <Route path="/dashboard/pharmacy" element={protectedElement(<DashboardPharmacy />, ['head_pharmacist', 'assistant_pharmacist', 'salesman_pharmacist', 'admin'])} />
              <Route path="/dashboard/head_pharmacist" element={<Navigate to="/dashboard/pharmacy" replace />} />
              <Route path="/dashboard/assistant_pharmacist" element={<Navigate to="/dashboard/pharmacy" replace />} />
              <Route path="/dashboard/salesman_pharmacist" element={<Navigate to="/dashboard/pharmacy" replace />} />
              <Route path="/dashboard/nursing" element={<Navigate to="/dashboard/ota" replace />} />
              <Route path="/dashboard/pharmacy/medicines" element={protectedElement(<PharmacyMedicines />, ['head_pharmacist', 'assistant_pharmacist', 'admin'])} />
              <Route path="/dashboard/pharmacy/invoices" element={protectedElement(<PharmacyInvoices />, ['head_pharmacist', 'assistant_pharmacist', 'admin'])} />
              <Route path="/dashboard/pharmacy/expiry" element={protectedElement(<PharmacyExpiry />, ['head_pharmacist', 'assistant_pharmacist', 'admin'])} />
              <Route path="/dashboard/pharmacy/analytics" element={protectedElement(<PharmacyAnalytics />, ['head_pharmacist', 'assistant_pharmacist', 'admin'])} />
              <Route path="/dashboard/pharmacy/sell" element={protectedElement(<PharmacySell />, ['head_pharmacist', 'assistant_pharmacist', 'salesman_pharmacist', 'admin'])} />
              <Route path="/dashboard/pharmacy/stock" element={protectedElement(<PharmacyStock />, ['head_pharmacist', 'assistant_pharmacist', 'admin'])} />
              <Route path="/dashboard/pharmacy/returns" element={protectedElement(<PharmacyReturns />, ['head_pharmacist', 'assistant_pharmacist', 'admin'])} />
              <Route path="/dashboard/pharmacy/lab-reports" element={protectedElement(<PharmacyLabReports />, ['head_pharmacist', 'assistant_pharmacist', 'admin'])} />

              <Route path="/dashboard/finance/*" element={protectedElement(<FinanceRoutes />, ['finance', 'admin'])} />

              <Route path="/dashboard/inventory_manager" element={<Navigate to="/dashboard/store" replace />} />
              <Route path="/dashboard/inventory_manager/*" element={<Navigate to="/dashboard/store" replace />} />
              <Route path="/dashboard/store" element={protectedElement(<DashboardStore />, ['store', 'inventory_manager', 'admin'])} />
              <Route path="/dashboard/store/*" element={protectedElement(<DashboardStore />, ['store', 'inventory_manager', 'admin'])} />

              <Route path="/dashboard/lab" element={protectedElement(<DashboardLab />, ['lab', 'admin'])} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="*" element={withSuspense(<NotFound />)} />
            </Routes>
          </BrowserRouter>
        </RealTimeProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
