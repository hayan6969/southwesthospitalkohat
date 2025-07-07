
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardAdmin from "./pages/dashboard/DashboardAdmin";
import DashboardDoctor from "./pages/dashboard/DashboardDoctor";
import DashboardPatient from "./pages/dashboard/DashboardPatient";
import DashboardStaff from "./pages/dashboard/DashboardStaff";
import DashboardPharmacy from "./pages/dashboard/DashboardPharmacy";
import DashboardFinance from "./pages/dashboard/DashboardFinance";

// Admin pages
import AdminAnalytics from "./pages/dashboard/admin/AdminAnalytics";
import AdminAccounts from "./pages/dashboard/admin/AdminAccounts";
import AdminPharmacy from "./pages/dashboard/admin/AdminPharmacy";
import AdminSystemLogs from "./pages/dashboard/admin/AdminSystemLogs";
import AdminSettings from "./pages/dashboard/admin/AdminSettings";
import AdminDoctors from "./pages/dashboard/admin/AdminDoctors";
import AdminStaff from "./pages/dashboard/admin/AdminStaff";

// Doctor pages
import DoctorNotes from "./pages/dashboard/doctor/DoctorNotes";
import DoctorPatients from "./pages/dashboard/doctor/DoctorPatients";
import DoctorSchedule from "./pages/dashboard/doctor/DoctorSchedule";

// Patient pages
import PatientAppointments from "./pages/dashboard/patient/PatientAppointments";
import PatientInvoices from "./pages/dashboard/patient/PatientInvoices";
import PatientLabs from "./pages/dashboard/patient/PatientLabs";
import PatientRecords from "./pages/dashboard/patient/PatientRecords";

// Staff pages
import StaffAppointments from "./pages/dashboard/staff/StaffAppointments";
import StaffInvoices from "./pages/dashboard/staff/StaffInvoices";
import StaffLabs from "./pages/dashboard/staff/StaffLabs";
import StaffPatients from "./pages/dashboard/staff/StaffPatients";

// Pharmacy pages
import PharmacyAnalytics from "./pages/dashboard/pharmacy/PharmacyAnalytics";
import PharmacyExpiry from "./pages/dashboard/pharmacy/PharmacyExpiry";
import PharmacyInvoices from "./pages/dashboard/pharmacy/PharmacyInvoices";
import PharmacyMedicines from "./pages/dashboard/pharmacy/PharmacyMedicines";

const queryClient = new QueryClient();

const App = () => {
  const { user } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Admin Routes */}
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardAdmin />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/analytics" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/accounts" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAccounts />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/pharmacy" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPharmacy />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSystemLogs />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/doctors" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDoctors />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin/staff" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminStaff />
              </ProtectedRoute>
            } />

            {/* Doctor Routes */}
            <Route path="/dashboard/doctor" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DashboardDoctor />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/doctor/appointments" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DashboardDoctor />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/doctor/patients" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPatients />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/doctor/notes" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorNotes />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/doctor/schedule" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorSchedule />
              </ProtectedRoute>
            } />

            {/* Patient Routes */}
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
            <Route path="/dashboard/patient/labs" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientLabs />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/patient/invoices" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientInvoices />
              </ProtectedRoute>
            } />

            {/* Staff Routes */}
            <Route path="/dashboard/staff" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <DashboardStaff />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/appointments" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffAppointments />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/patients" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffPatients />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/labs" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffLabs />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/staff/invoices" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffInvoices />
              </ProtectedRoute>
            } />

            {/* Pharmacy Routes */}
            <Route path="/dashboard/pharmacy" element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <DashboardPharmacy />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/medicines" element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyMedicines />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/analytics" element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/expiry" element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyExpiry />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/pharmacy/invoices" element={
              <ProtectedRoute allowedRoles={['pharmacy']}>
                <PharmacyInvoices />
              </ProtectedRoute>
            } />

            {/* Finance Routes */}
            <Route path="/dashboard/finance" element={
              <ProtectedRoute allowedRoles={['finance']}>
                <DashboardFinance />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
