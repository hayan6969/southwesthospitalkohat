
import { ReactNode } from "react";
import { SidebarNav } from "@/components/SidebarNav";
import { Button } from "@/components/ui/button";
import { Search, Bell, Settings, User } from "lucide-react";

export const getCurrentRole = () => {
  return window.localStorage.getItem("hims_role") || "patient";
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const role = getCurrentRole();
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-inter">
      <header className="h-16 flex items-center justify-between px-6 border-b bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="font-bold tracking-tight text-xl text-blue-600">
            🏥 HIMS Dashboard
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
            />
          </div>
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
          
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {role}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 w-full">
        <SidebarNav role={role} />
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
