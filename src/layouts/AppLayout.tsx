
import { ReactNode } from "react";
import { SidebarNav } from "@/components/SidebarNav";

export const getCurrentRole = () => {
  // Simulated role for demo; will transition to Supabase user session role.
  return window.localStorage.getItem("hims_role") || "patient";
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const role = getCurrentRole();
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="h-14 flex items-center px-6 border-b bg-white shadow">
        <div className="flex-1 font-bold tracking-wide text-xl text-primary">
          HIMS Dashboard
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block rounded bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold uppercase">
            {role}
          </span>
        </div>
      </header>
      <div className="flex flex-1 w-full">
        <SidebarNav role={role} />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
