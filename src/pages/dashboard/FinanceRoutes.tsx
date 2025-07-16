import { Routes, Route } from "react-router-dom";
import FinanceLayout from "@/layouts/FinanceLayout";
import DashboardFinance from "./DashboardFinance";
import FinanceIncome from "./finance/FinanceIncome";
import FinanceExpenses from "./finance/FinanceExpenses";
import FinanceAnalytics from "./finance/FinanceAnalytics";
import FinancePayroll from "./finance/FinancePayroll";
import FinanceDoctorPayments from "./finance/FinanceDoctorPayments";
import FinancePharmacy from "./finance/FinancePharmacy";
import FinanceRefunds from "./finance/FinanceRefunds";
import FinanceDaily from "./finance/FinanceDaily";

export default function FinanceRoutes() {
  return (
    <FinanceLayout>
      <Routes>
        <Route index element={<DashboardFinance />} />
        <Route path="daily" element={<FinanceDaily />} />
        <Route path="income" element={<FinanceIncome />} />
        <Route path="expenses" element={<FinanceExpenses />} />
        <Route path="analytics" element={<FinanceAnalytics />} />
        <Route path="payroll" element={<FinancePayroll />} />
        <Route path="doctor-payments" element={<FinanceDoctorPayments />} />
        <Route path="pharmacy" element={<FinancePharmacy />} />
        <Route path="refunds" element={<FinanceRefunds />} />
      </Routes>
    </FinanceLayout>
  );
}