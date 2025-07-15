import { Routes, Route } from "react-router-dom";
import FinanceLayout from "@/layouts/FinanceLayout";
import DashboardFinance from "./DashboardFinance";
import FinanceIncome from "./finance/FinanceIncome";
import FinanceExpenses from "./finance/FinanceExpenses";
import FinanceAnalytics from "./finance/FinanceAnalytics";
import FinancePayroll from "./finance/FinancePayroll";
import FinanceDoctorPayments from "./finance/FinanceDoctorPayments";
import FinancePharmacy from "./finance/FinancePharmacy";

export default function FinanceRoutes() {
  return (
    <FinanceLayout>
      <Routes>
        <Route index element={<DashboardFinance />} />
        <Route path="income" element={<FinanceIncome />} />
        <Route path="expenses" element={<FinanceExpenses />} />
        <Route path="analytics" element={<FinanceAnalytics />} />
        <Route path="payroll" element={<FinancePayroll />} />
        <Route path="doctor-payments" element={<FinanceDoctorPayments />} />
        <Route path="pharmacy" element={<FinancePharmacy />} />
      </Routes>
    </FinanceLayout>
  );
}