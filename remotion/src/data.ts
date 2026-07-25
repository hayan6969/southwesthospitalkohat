export type Dash = {
  name: string;
  tag: string;
  accent: string;
  perks: string[];
};

export const DASHBOARDS: Dash[] = [
  {
    name: "Admin",
    tag: "Command Center",
    accent: "#22d3ee",
    perks: ["Full RBAC control", "Live audit trails", "Remote client log viewer"],
  },
  {
    name: "Finance",
    tag: "Revenue Engine",
    accent: "#34d399",
    perks: ["PKR native reports", "Shift-based reconciliation", "Detailed + summary PDF"],
  },
  {
    name: "Pharmacy",
    tag: "Point of Sale",
    accent: "#f59e0b",
    perks: ["Atomic stock deduction", "Profit auto-calc", "Refund tracking"],
  },
  {
    name: "Lab / Pathology",
    tag: "Diagnostics",
    accent: "#a78bfa",
    perks: ["Pending tests board", "Word + PDF reports", "Patient linking"],
  },
  {
    name: "OT / Operations",
    tag: "Surgical Workflow",
    accent: "#f472b6",
    perks: ["7-step clinical flow", "Role-scoped access", "Emergency handling"],
  },
  {
    name: "IPD",
    tag: "Inpatient Care",
    accent: "#60a5fa",
    perks: ["Bed & ward tracking", "Doctor rounds", "Billing sync"],
  },
  {
    name: "Store & Inventory",
    tag: "Supply Chain",
    accent: "#fb7185",
    perks: ["Request → approve → fulfil", "Expiry lifecycle", "Lab vs general split"],
  },
  {
    name: "Staff & Payroll",
    tag: "HR + Attendance",
    accent: "#facc15",
    perks: ["Auto monthly payroll", "Overtime linking", "Multi-shift support"],
  },
  {
    name: "Doctor",
    tag: "Clinical Portal",
    accent: "#4ade80",
    perks: ["Appointment queue", "Consultation fees", "Settlement clearing"],
  },
  {
    name: "Patient",
    tag: "Family Accounts",
    accent: "#fca5a5",
    perks: ["Guardian + family flow", "Book for son / spouse", "Own reports & bills"],
  },
];
