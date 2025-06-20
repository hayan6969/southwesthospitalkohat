
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Dashboard main pages
import DashboardPatient from "./pages/dashboard/DashboardPatient";
import DashboardDoctor from "./pages/dashboard/DashboardDoctor";
import DashboardStaff from "./pages/dashboard/DashboardStaff";
import DashboardAdmin from "./pages/dashboard/DashboardAdmin";
import DashboardPharmacy from "./pages/dashboard/DashboardPharmacy";

// Doctor pages
import DoctorSchedule from "./pages/dashboard/doctor/DoctorSchedule";
import DoctorPatients from "./pages/dashboard/doctor/DoctorPatients";
import DoctorNotes from "./pages/dashboard/doctor/DoctorNotes";

// Patient pages
import PatientAppointments from "./pages/dashboard/patient/PatientAppointments";
import PatientRecords from "./pages/dashboard/patient/PatientRecords";
import PatientInvoices from "./pages/dashboard/patient/PatientInvoices";
import PatientLabs from "./pages/dashboard/patient/PatientLabs";

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

// Pharmacy pages
import PharmacyMedicines from "./pages/dashboard/pharmacy/PharmacyMedicines";
import PharmacyInvoices from "./pages/dashboard/pharmacy/PharmacyInvoices";
import PharmacyExpiry from "./pages/dashboard/pharmacy/PharmacyExpiry";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Patient dashboard routes */}
          <Route path="/dashboard/patient" element={<DashboardPatient />} />
          <Route path="/dashboard/patient/appointments" element={<PatientAppointments />} />
          <Route path="/dashboard/patient/records" element={<PatientRecords />} />
          <Route path="/dashboard/patient/invoices" element={<PatientInvoices />} />
          <Route path="/dashboard/patient/labs" element={<PatientLabs />} />

          {/* Doctor dashboard routes */}
          <Route path="/dashboard/doctor" element={<DashboardDoctor />} />
          <Route path="/dashboard/doctor/schedule" element={<DoctorSchedule />} />
          <Route path="/dashboard/doctor/patients" element={<DoctorPatients />} />
          <Route path="/dashboard/doctor/notes" element={<DoctorNotes />} />

          {/* Staff dashboard routes */}
          <Route path="/dashboard/staff" element={<DashboardStaff />} />
          <Route path="/dashboard/staff/patients" element={<StaffPatients />} />
          <Route path="/dashboard/staff/appointments" element={<StaffAppointments />} />
          <Route path="/dashboard/staff/invoices" element={<StaffInvoices />} />
          <Route path="/dashboard/staff/labs" element={<StaffLabs />} />

          {/* Admin dashboard routes */}
          <Route path="/dashboard/admin" element={<DashboardAdmin />} />
          <Route path="/dashboard/admin/departments" element={<AdminDepartments />} />
          <Route path="/dashboard/admin/staff" element={<AdminStaff />} />
          <Route path="/dashboard/admin/doctors" element={<AdminDoctors />} />
          <Route path="/dashboard/admin/audit-logs" element={<AdminAuditLogs />} />

          {/* Pharmacy dashboard routes */}
          <Route path="/dashboard/pharmacy" element={<DashboardPharmacy />} />
          <Route path="/dashboard/pharmacy/medicines" element={<PharmacyMedicines />} />
          <Route path="/dashboard/pharmacy/invoices" element={<PharmacyInvoices />} />
          <Route path="/dashboard/pharmacy/expiry" element={<PharmacyExpiry />} />
          
          {/* Redirect for unknown dashboard routes */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
