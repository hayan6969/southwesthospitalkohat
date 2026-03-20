import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import FinanceLayout from "@/layouts/FinanceLayout";

const DashboardFinance = lazy(() => import("./DashboardFinance"));
const FinanceIncome = lazy(() => import("./finance/FinanceIncome"));
const FinanceExpenses = lazy(() => import("./finance/FinanceExpenses"));
const FinanceAnalytics = lazy(() => import("./finance/FinanceAnalytics"));
const FinancePayroll = lazy(() => import("./finance/FinancePayroll"));
const FinanceDoctorPayments = lazy(() => import("./finance/FinanceDoctorPayments"));
const FinancePharmacy = lazy(() => import("./finance/FinancePharmacy"));
const FinanceRefunds = lazy(() => import("./finance/FinanceRefunds"));
const FinanceDaily = lazy(() => import("./finance/FinanceDaily"));
const FinanceInvoices = lazy(() => import("./finance/FinanceInvoices"));
const FinanceDiscounts = lazy(() => import("./finance/FinanceDiscounts"));
const FinanceStaffPayments = lazy(() => import("./finance/FinanceStaffPayments"));

const SectionLoader = () => (
  <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
    <div className="flex items-center gap-3">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="text-sm font-medium">Loading...</span>
    </div>
  </div>
);

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<SectionLoader />}>{element}</Suspense>
);

export default function FinanceRoutes() {
  return (
    <FinanceLayout>
      <Routes>
        <Route index element={withSuspense(<DashboardFinance />)} />
        <Route path="daily" element={withSuspense(<FinanceDaily />)} />
        <Route path="income" element={withSuspense(<FinanceIncome />)} />
        <Route path="expenses" element={withSuspense(<FinanceExpenses />)} />
        <Route path="analytics" element={withSuspense(<FinanceAnalytics />)} />
        <Route path="payroll" element={withSuspense(<FinancePayroll />)} />
        <Route path="doctor-payments" element={withSuspense(<FinanceDoctorPayments />)} />
        <Route path="staff-payments" element={withSuspense(<FinanceStaffPayments />)} />
        <Route path="pharmacy" element={withSuspense(<FinancePharmacy />)} />
        <Route path="refunds" element={withSuspense(<FinanceRefunds />)} />
        <Route path="invoices" element={withSuspense(<FinanceInvoices />)} />
        <Route path="discounts" element={withSuspense(<FinanceDiscounts />)} />
      </Routes>
    </FinanceLayout>
  );
}
