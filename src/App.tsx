
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useRealTimeUpdates } from "./hooks/useRealTimeUpdates";
import { useOfflineDataSync } from "./hooks/useOfflineDataSync";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import OfflineMode from "./pages/OfflineMode";
import OfflineModePharmacy from "./pages/OfflineModePharmacy";
import VerifyReport from "./pages/VerifyReport";
import PrintPrescription from "./pages/PrintPrescription";
import AuthDebugOverlay from "./components/AuthDebugOverlay";
import LoginSuccessReport from "./components/LoginSuccessReport";


// Dashboard main pages
import DashboardPatient from "./pages/dashboard/DashboardPatient";
import DashboardDoctor from "./pages/dashboard/DashboardDoctor";
import DashboardStaff from "./pages/dashboard/DashboardStaff";
import DashboardAdmin from "./pages/dashboard/DashboardAdmin";
import DashboardPharmacy from "./pages/dashboard/DashboardPharmacy";
import DashboardFinance from "./pages/dashboard/DashboardFinance";
import DashboardOTA from "./pages/dashboard/DashboardOTA";
import DashboardStore from "./pages/dashboard/DashboardStore";
import DashboardLab from "./pages/dashboard/DashboardLab";
import DashboardIpd from "./pages/dashboard/DashboardIpd";

// Doctor pages
import DoctorSchedule from "./pages/dashboard/doctor/DoctorSchedule";
import DoctorPatients from "./pages/dashboard/doctor/DoctorPatients";
import DoctorNotes from "./pages/dashboard/doctor/DoctorNotes";

// Patient pages
import PatientAppointments from "./pages/dashboard/patient/PatientAppointments";
import PatientRecords from "./pages/dashboard/patient/PatientRecords";
import PatientInvoices from "./pages/dashboard/patient/PatientInvoices";
import PatientLabs from "./pages/dashboard/patient/PatientLabs";
import PatientIPD from "./pages/dashboard/patient/PatientIPD";

// Staff pages
import StaffPatients from "./pages/dashboard/staff/StaffPatients";
import StaffAppointments from "./pages/dashboard/staff/StaffAppointments";
import StaffInvoices from "./pages/dashboard/staff/StaffInvoices";
import StaffLabs from "./pages/dashboard/staff/StaffLabs";

// Admin pages
import AdminDepartments from "./pages/dashboard/admin/AdminDepartments";
import AdminStaff from "./pages/dashboard/admin/AdminStaff";
import AdminDoctors from "./pages/dashboard/admin/AdminDoctors";
import AdminAuditLogs from "./pages/dashboard/admin/AdminAuditLogs";
import AdminSettings from "./pages/dashboard/admin/AdminSettings";
import AdminRegions from "./pages/dashboard/admin/AdminRegions";
import AdminIPD from "./pages/dashboard/admin/AdminIPD";
import AdminLabs from "./pages/dashboard/admin/AdminLabs";
import InvoiceAuditTrail from "./pages/dashboard/admin/InvoiceAuditTrail";

// Pharmacy pages
import PharmacyMedicines from "./pages/dashboard/pharmacy/PharmacyMedicines";
import PharmacyInvoices from "./pages/dashboard/pharmacy/PharmacyInvoices";
import PharmacyExpiry from "./pages/dashboard/pharmacy/PharmacyExpiry";
import PharmacyAnalytics from "./pages/dashboard/pharmacy/PharmacyAnalytics";
import PharmacySell from "./pages/dashboard/pharmacy/PharmacySell";
import PharmacyStock from "./pages/dashboard/pharmacy/PharmacyStock";
import PharmacyReturns from "./pages/dashboard/pharmacy/PharmacyReturns";
import PharmacyLabReports from "./pages/dashboard/pharmacy/PharmacyLabReports";
import PharmacyStickers from "./pages/dashboard/pharmacy/PharmacyStickers";

// Finance routes component
import FinanceRoutes from "./pages/dashboard/FinanceRoutes";

const ADMIN_ROLES = ['admin', 'super_admin'];
const withAdmin = (...roles: string[]) => [...roles, ...ADMIN_ROLES];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds - shorter for real-time feel
      refetchInterval: 1000 * 60, // Refetch every minute as backup
      retry: 1,
    },
  },
});

// Component to initialize real-time updates only (no auto-sync in offline mode)
const RealTimeProvider = ({ children }: { children: React.ReactNode }) => {
  useRealTimeUpdates();
  // Removed useOfflineDataSync to prevent automatic uploads
  return <>{children}</>;
};

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <RealTimeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <AuthDebugOverlay />
          <LoginSuccessReport />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/offline-mode" element={<OfflineMode />} />
            <Route path="/offline-mode-pharmacy" element={<OfflineModePharmacy />} />
            <Route path="/verify-report/:reportNumber" element={<VerifyReport />} />

            {/* Print-ready prescription / clinical-record sheet (public print view) */}
            <Route path="/print/prescription/:patientId" element={<PrintPrescription />} />
            <Route path="/print/prescription" element={<PrintPrescription />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />

            {/* Patient dashboard routes */}
            <Route path="/dashboard/patient" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <DashboardPatient />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/patient/appointments" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientAppointments />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/patient/records" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientRecords />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/patient/invoices" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientInvoices />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/patient/labs" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientLabs />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/patient/ipd" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientIPD />
              </ProtectedRoute>
            } />

            {/* Doctor dashboard routes */}
            <Route path="/dashboard/doctor" element={
              <ProtectedRoute allowedRoles={withAdmin('doctor')}>
                <DashboardDoctor />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/doctor/schedule" element={
              <ProtectedRoute allowedRoles={withAdmin('doctor')}>
                <DoctorSchedule />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/doctor/patients" element={
              <ProtectedRoute allowedRoles={withAdmin('doctor')}>
                <DoctorPatients />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/doctor/notes" element={
              <ProtectedRoute allowedRoles={withAdmin('doctor')}>
                <DoctorNotes />
              </ProtectedRoute>
            } />

            {/* Staff dashboard routes */}
            <Route path="/dashboard/staff" element={
              <ProtectedRoute allowedRoles={withAdmin('staff')}>
                <DashboardStaff />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/patients" element={
              <ProtectedRoute allowedRoles={withAdmin('staff')}>
                <StaffPatients />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/appointments" element={
              <ProtectedRoute allowedRoles={withAdmin('staff')}>
                <StaffAppointments />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/invoices" element={
              <ProtectedRoute allowedRoles={withAdmin('staff')}>
                <StaffInvoices />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/labs" element={
              <ProtectedRoute allowedRoles={withAdmin('staff')}>
                <StaffLabs />
              </ProtectedRoute>
            } />

            {/* OTA dashboard routes */}
            <Route path="/dashboard/ota" element={
              <ProtectedRoute allowedRoles={withAdmin('ota', 'nursing')}>
                <DashboardOTA />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/ota/*" element={
              <ProtectedRoute allowedRoles={withAdmin('ota', 'nursing')}>
                <DashboardOTA />
              </ProtectedRoute>
            } />

            {/* IPD dashboard routes */}
            <Route path="/dashboard/ipd" element={
              <ProtectedRoute allowedRoles={withAdmin('ipd')}>
                <DashboardIpd />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/ipd/*" element={
              <ProtectedRoute allowedRoles={withAdmin('ipd')}>
                <DashboardIpd />
              </ProtectedRoute>
            } />

            {/* Admin dashboard routes */}
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <DashboardAdmin />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/departments" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminDepartments />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/staff" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminStaff />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/doctors" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminDoctors />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/audit-logs" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminAuditLogs />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/settings" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/regions" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminRegions />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/ipd" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminIPD />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/labs" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                <AdminLabs />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/invoice-audit" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <InvoiceAuditTrail />
              </ProtectedRoute>
            } />

            {/* Pharmacy dashboard routes */}
            <Route path="/dashboard/pharmacy" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist', 'salesman_pharmacist')}>
                <DashboardPharmacy />
              </ProtectedRoute>
            } />
            {/* Legacy redirects for pharmacist roles */}
            <Route path="/dashboard/head_pharmacist" element={<Navigate to="/dashboard/pharmacy" replace />} />
            <Route path="/dashboard/assistant_pharmacist" element={<Navigate to="/dashboard/pharmacy" replace />} />
            <Route path="/dashboard/salesman_pharmacist" element={<Navigate to="/dashboard/pharmacy" replace />} />
            
            {/* Nursing role redirect to OTA dashboard */}
            <Route path="/dashboard/nursing" element={<Navigate to="/dashboard/ota" replace />} />
            <Route path="/dashboard/pharmacy/medicines" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyMedicines />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/invoices" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyInvoices />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/expiry" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyExpiry />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/analytics" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/sell" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist', 'salesman_pharmacist')}>
                <PharmacySell />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/stock" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyStock />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/returns" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyReturns />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/lab-reports" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyLabReports />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/stickers" element={
              <ProtectedRoute allowedRoles={withAdmin('head_pharmacist', 'assistant_pharmacist')}>
                <PharmacyStickers />
              </ProtectedRoute>
            } />

            {/* Finance dashboard routes - All wrapped in FinanceLayout */}
            <Route path="/dashboard/finance/*" element={
              <ProtectedRoute allowedRoles={withAdmin('finance')}>
                <FinanceRoutes />
              </ProtectedRoute>
            } />

            {/* Inventory Manager redirect to store */}
            <Route path="/dashboard/inventory_manager" element={<Navigate to="/dashboard/store" replace />} />
            <Route path="/dashboard/inventory_manager/*" element={<Navigate to="/dashboard/store" replace />} />

            {/* Store & Inventory Manager dashboard */}
            <Route path="/dashboard/store" element={
              <ProtectedRoute allowedRoles={withAdmin('store', 'inventory_manager')}>
                <DashboardStore />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/store/*" element={
              <ProtectedRoute allowedRoles={withAdmin('store', 'inventory_manager')}>
                <DashboardStore />
              </ProtectedRoute>
            } />

            {/* Lab dashboard routes */}
            <Route path="/dashboard/lab" element={
              <ProtectedRoute allowedRoles={withAdmin('lab')}>
                <DashboardLab />
              </ProtectedRoute>
            } />
            
            {/* Redirect for unknown dashboard routes */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </RealTimeProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
