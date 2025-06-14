
import { ReactNode } from "react";
import { SidebarNav } from "@/components/SidebarNav";

export const getCurrentRole = () => {
  return window.localStorage.getItem("hims_role") || "patient";
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const role = getCurrentRole();
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="h-16 flex items-center px-6 border-b bg-white shadow-sm">
        <div className="flex-1 font-bold tracking-wide text-xl text-primary">
          🏥 HIMS Dashboard
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Search</span>
            <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">🔍</span>
            </div>
          </div>
          <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold uppercase">
            {role}
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
        </div>
      </header>
      <div className="flex flex-1 w-full">
        <SidebarNav role={role} />
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
