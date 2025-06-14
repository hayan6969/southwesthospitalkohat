
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import DashboardPatient from "./pages/dashboard/DashboardPatient";
import DashboardDoctor from "./pages/dashboard/DashboardDoctor";
import DashboardStaff from "./pages/dashboard/DashboardStaff";
import DashboardAdmin from "./pages/dashboard/DashboardAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Demo dashboard routes for each user role */}
          <Route path="/dashboard/patient/*" element={<DashboardPatient />} />
          <Route path="/dashboard/doctor/*" element={<DashboardDoctor />} />
          <Route path="/dashboard/staff/*" element={<DashboardStaff />} />
          <Route path="/dashboard/admin/*" element={<DashboardAdmin />} />
          
          {/* Redirect for unknown dashboard routes */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
