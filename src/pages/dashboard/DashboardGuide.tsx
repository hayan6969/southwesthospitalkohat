import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield, Wallet, Pill, Users, Building2, Warehouse, BedDouble,
  FlaskConical, Stethoscope, User as UserIcon, BookOpen,
} from "lucide-react";

type Section = { name: string; desc: string };
type Dash = {
  key: string;
  title: string;
  route: string;
  roles: string[];
  icon: React.ElementType;
  color: string;
  purpose: string;
  sections: Section[];
  perks: string[];
};

const DASHBOARDS: Dash[] = [
  {
    key: "admin",
    title: "Admin Dashboard",
    route: "/dashboard/admin",
    roles: ["admin", "super_admin"],
    icon: Shield,
    color: "bg-indigo-100 text-indigo-700",
    purpose: "Central control panel — accounts, departments, system settings and audit trails.",
    sections: [
      { name: "Overview", desc: "KPIs: staff, doctors, patients, revenue snapshot." },
      { name: "Departments", desc: "Create/manage hospital departments and personnel mapping." },
      { name: "Account Management", desc: "Create users, assign roles, reset passwords, deactivate." },
      { name: "Invoice Audit Trail", desc: "Every invoice edit/delete tracked with user + timestamp." },
      { name: "Lab (admin view)", desc: "Full lab oversight — reports, stock, test types." },
      { name: "Client Error Logs", desc: "Remote console errors from user devices for debugging." },
      { name: "System Settings", desc: "Hospital info, shifts, finance config, roles, print options." },
    ],
    perks: ["Full RBAC control", "Audit-ready logs", "Centralised system config"],
  },
  {
    key: "finance",
    title: "Finance Dashboard",
    route: "/dashboard/finance",
    roles: ["finance", "admin", "super_admin"],
    icon: Wallet,
    color: "bg-emerald-100 text-emerald-700",
    purpose: "Revenue, expenses, doctor payouts, refunds and daily closings — all in PKR.",
    sections: [
      { name: "Overview", desc: "Hospital revenue, pharmacy profit, expenses, net profit." },
      { name: "Daily Closing", desc: "End-of-day reconciliation with opening/closing balance continuity." },
      { name: "Expenses", desc: "Log operating expenses with category + proof attachment." },
      { name: "Refunds", desc: "Issue refunds against invoices; auto-reflects in reports." },
      { name: "Doctor Payments", desc: "Track & settle doctor shares; cleared_at prevents double pay." },
      { name: "Payroll", desc: "Auto-generate monthly payroll incl. overtime." },
      { name: "Reports", desc: "Summary / Detailed PDF with filters, proof attachments." },
      { name: "Shift Closings", desc: "Multi-shift per day, resets reporting window." },
      { name: "Patient Discounts", desc: "Grant multi-use discounts; retroactive adjustments supported." },
    ],
    perks: ["Native PKR + PKT timestamps", "Duplicate-submission locks", "Audit-grade PDFs"],
  },
  {
    key: "pharmacy",
    title: "Pharmacy Dashboard",
    route: "/dashboard/pharmacy",
    roles: ["head_pharmacist", "assistant_pharmacist", "salesman_pharmacist", "admin", "super_admin"],
    icon: Pill,
    color: "bg-pink-100 text-pink-700",
    purpose: "Medicine sales, stock, expiry tracking, IPD orders and pharmacy profit.",
    sections: [
      { name: "Sell Medicine", desc: "Fast POS with stock check, discount, invoice print." },
      { name: "Medicines", desc: "Master list — add, price, restock, deactivate." },
      { name: "Stock Tracking", desc: "Batch-level qty with atomic deduction on sale." },
      { name: "Expiry Tracker", desc: "Highlights near-expiry / expired batches." },
      { name: "Invoices", desc: "Search, reprint, cancel pharmacy invoices." },
      { name: "Returns", desc: "Returns/refunds with pharmacy profit adjustment." },
      { name: "IPD Orders", desc: "Fulfil IPD medicine orders raised from ward." },
      { name: "Lab Reports", desc: "Pharmacist can view patient lab reports for counselling." },
      { name: "Analytics", desc: "Top-selling items, profit trend, low-stock alerts." },
      { name: "Stickers", desc: "Print price / dosage stickers." },
    ],
    perks: ["Atomic stock deduction", "Batch expiry alerts", "IPD ↔ pharmacy sync"],
  },
  {
    key: "staff",
    title: "Staff / Reception Dashboard",
    route: "/dashboard/staff",
    roles: ["staff", "admin", "super_admin"],
    icon: Users,
    color: "bg-sky-100 text-sky-700",
    purpose: "Front-desk operations — register patients, book appointments, take payments.",
    sections: [
      { name: "Counter", desc: "New invoice, service billing, patient discounts, receipt." },
      { name: "Patients", desc: "Register patient / family member (guardian flow, synthetic email)." },
      { name: "Appointments", desc: "Book with doctor+queue position; reschedule / cancel." },
      { name: "Invoices", desc: "Search all invoices (including cancelled) by ID/name/phone." },
      { name: "Lab", desc: "Order lab tests from counter, print receipt." },
      { name: "OT", desc: "OT scheduling & billing entry point." },
    ],
    perks: ["Phone-first patient lookup", "Family accounts (guardian_id)", "Duplicate-safe billing"],
  },
  {
    key: "ota",
    title: "OT / OTA Dashboard",
    route: "/dashboard/ota",
    roles: ["ota", "nursing", "admin", "super_admin"],
    icon: Building2,
    color: "bg-red-100 text-red-700",
    purpose: "Operation-theatre workflow — 7 steps from scheduling to post-op.",
    sections: [
      { name: "OT Schedule", desc: "Room-wise operation queue for the day." },
      { name: "Pre-Op Assessment", desc: "Vitals, allergies, consent capture." },
      { name: "Anesthesia Notes", desc: "Structured intra-op anesthesia record." },
      { name: "Operation Record", desc: "Surgeon notes, findings, implants." },
      { name: "Post-Op Progress", desc: "Recovery tracking, meds, vitals." },
      { name: "OT Expenses", desc: "Consumables + charges billed to patient." },
    ],
    perks: ["7-step clinical workflow", "RBAC per step", "Auto-invoice linking"],
  },
  {
    key: "store",
    title: "Store / Inventory Manager",
    route: "/dashboard/store",
    roles: ["inventory_manager", "admin", "super_admin"],
    icon: Warehouse,
    color: "bg-amber-100 text-amber-700",
    purpose: "Central store — supply requests, fulfilment, lifecycle tracking.",
    sections: [
      { name: "Requests", desc: "Approve/deny requests from lab, pharmacy, OT, IPD." },
      { name: "Inventory Items", desc: "Master items with mfg/expiry dates." },
      { name: "Fulfilment", desc: "Dispatch to requesting dept; no expense on provision." },
      { name: "Lab Store", desc: "Lab-specific SKUs kept separate from general supplies." },
    ],
    perks: ["Request → Approve → Fulfil flow", "Lifecycle dates", "No double-expense"],
  },
  {
    key: "ipd",
    title: "IPD Dashboard",
    route: "/dashboard/ipd",
    roles: ["ipd", "admin", "super_admin"],
    icon: BedDouble,
    color: "bg-purple-100 text-purple-700",
    purpose: "In-patient admissions, ward/bed allocation, treatment charts and IPD billing.",
    sections: [
      { name: "Admissions", desc: "Admit patient, assign ward/bed, doctor." },
      { name: "Beds & Wards", desc: "Live bed status; auto-sync on admit/discharge." },
      { name: "Treatment Chart", desc: "Nursing entries, meds, vitals timeline." },
      { name: "IPD Charges", desc: "Bed, doctor visit, procedure, misc charges." },
      { name: "Medicine Orders", desc: "Raise orders to pharmacy from ward." },
      { name: "Lab Orders", desc: "Raise lab tests from ward." },
      { name: "IPD Invoice", desc: "Final consolidated bill on discharge." },
    ],
    perks: ["Live bed board", "Ward → pharmacy/lab orders", "Consolidated discharge bill"],
  },
  {
    key: "lab",
    title: "Lab Dashboard",
    route: "/dashboard/lab",
    roles: ["lab", "admin", "super_admin"],
    icon: FlaskConical,
    color: "bg-cyan-100 text-cyan-700",
    purpose: "Pathology reports, test types, stock and IPD lab orders.",
    sections: [
      { name: "New Lab Report", desc: "Wizard: patient → tests → parameters → verify → print." },
      { name: "Report History", desc: "All past reports — search, view, edit (before lock), reprint." },
      { name: "Pending Tests", desc: "Paid but not yet reported — chase-list with pagination." },
      { name: "Reports & Tracking", desc: "Daily lab register reconciled with finance invoices." },
      { name: "Manage Tests", desc: "Add/edit test types, parameters, ref ranges, subranges." },
      { name: "Lab Stock", desc: "Reagent/consumable stock with auto-deduction per test." },
      { name: "IPD Orders", desc: "Fulfil lab orders raised from IPD wards." },
      { name: "Request Supplies", desc: "Raise store request for lab consumables." },
    ],
    perks: ["Report lock window", "QR-verifiable reports", "Auto stock consumption"],
  },
  {
    key: "doctor",
    title: "Doctor Dashboard",
    route: "/dashboard/doctor",
    roles: ["doctor", "admin", "super_admin"],
    icon: Stethoscope,
    color: "bg-teal-100 text-teal-700",
    purpose: "Doctor's clinical cockpit — today's queue, diagnoses, patient history, earnings.",
    sections: [
      { name: "Overview", desc: "Today's appointments, earnings, quick actions." },
      { name: "Appointments", desc: "Scheduled vs past; mark completed to trigger settlement." },
      { name: "Patient History", desc: "Full timeline: visits, labs, prescriptions." },
      { name: "Diagnoses & Prescriptions", desc: "Write Rx, print, save to record." },
      { name: "Patient Notes", desc: "Private SOAP notes per patient." },
      { name: "Lab Reports", desc: "View patient's lab results." },
      { name: "Analytics", desc: "Consultation + OT earnings, patient volume." },
    ],
    perks: ["Auto-settlement on 'completed'", "Consultation-fee control", "Print-ready Rx"],
  },
  {
    key: "patient",
    title: "Patient Portal",
    route: "/dashboard/patient",
    roles: ["patient"],
    icon: UserIcon,
    color: "bg-blue-100 text-blue-700",
    purpose: "Patient self-service — book, view records, labs, invoices, IPD & family members.",
    sections: [
      { name: "Overview", desc: "Upcoming appointments, latest reports." },
      { name: "Book Appointments", desc: "Pick doctor, slot; select self or family member." },
      { name: "My Appointments", desc: "History with status; cancel where allowed." },
      { name: "Medical Records", desc: "Diagnoses, prescriptions, discharge summaries." },
      { name: "Lab Reports", desc: "Download PDF of verified reports." },
      { name: "Invoices", desc: "Bills and receipts, all patients under account." },
      { name: "IPD", desc: "Current/past admissions summary." },
      { name: "Upload Documents", desc: "Attach external reports for doctor." },
      { name: "Family Switcher", desc: "Guardian can switch between family members." },
    ],
    perks: ["Family accounts", "PDF report downloads", "Self-service booking"],
  },
];

export default function DashboardGuide() {
  const { profile } = useAuth();
  const role = profile?.role ?? "";

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Guide</h1>
            <p className="text-sm text-muted-foreground">
              Every dashboard, every tab — what it does and who can access it.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DASHBOARDS.map((d) => {
            const Icon = d.icon;
            const canAccess = d.roles.includes(role) || role === "super_admin" || role === "admin";
            return (
              <Card key={d.key} className={canAccess ? "" : "opacity-70"}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{d.title}</CardTitle>
                        <a
                          href={d.route}
                          className="text-xs text-blue-600 hover:underline font-mono"
                        >
                          {d.route}
                        </a>
                      </div>
                    </div>
                    {canAccess ? (
                      <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 text-[10px]">
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Restricted</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700">{d.purpose}</p>

                  <div className="flex flex-wrap gap-1">
                    {d.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="sections" className="border-0">
                      <AccordionTrigger className="py-2 text-sm">
                        Pages / Tabs ({d.sections.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {d.sections.map((s) => (
                            <li key={s.name} className="text-sm">
                              <span className="font-medium text-gray-900">{s.name}</span>
                              <span className="text-muted-foreground"> — {s.desc}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="perks" className="border-0">
                      <AccordionTrigger className="py-2 text-sm">Key perks</AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {d.perks.map((p) => <li key={p}>{p}</li>)}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cross-cutting features</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="font-semibold">Family Accounts:</span> Guardian phone lookup, add family member with relation, patient switcher on portal.</div>
            <div><span className="font-semibold">Currency & Time:</span> Native PKR only; timestamps rendered in Pakistan Time (PKT).</div>
            <div><span className="font-semibold">Auth Debug:</span> Append <code className="bg-gray-100 px-1 rounded">?authdebug=1</code> to /auth for session diagnostics + remote console log capture.</div>
            <div><span className="font-semibold">Report Verify:</span> Public <code className="bg-gray-100 px-1 rounded">/verify-report/:reportNumber</code> for QR-verified lab reports.</div>
            <div><span className="font-semibold">Offline Mode:</span> <code className="bg-gray-100 px-1 rounded">/offline-mode</code> and <code className="bg-gray-100 px-1 rounded">/offline-mode-pharmacy</code> for connectivity dips.</div>
            <div><span className="font-semibold">RLS:</span> Every table protected — data scoped by role and patient/guardian relationships.</div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
