
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const roles = [
  { key: "patient", label: "Patient" },
  { key: "doctor", label: "Doctor" },
  { key: "staff", label: "Staff" },
  { key: "admin", label: "Admin" },
];

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    // In real auth, would be set on login/session.
    window.localStorage.setItem("hims_role", role);
    toast({
      title: "Role selected",
      description: `Simulating "${role}" dashboard (replace with auth after Supabase setup).`,
    });
    window.location.href = `/dashboard/${role}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl p-10 shadow-xl rounded-lg bg-white border border-muted">
          <h1 className="text-3xl font-bold mb-2 text-primary flex items-center gap-2">
            <span className="inline-block w-2 h-8 bg-blue-500 rounded-full mr-2" />
            HIMS – Hospital Management System
          </h1>
          <p className="text-muted-foreground mb-6">
            <strong>Get started:</strong> Select your role to view the dashboard demo.<br />
            <span className="text-xs text-accent-foreground mt-1 block">
              <em>
                (Full authentication and RBAC will be powered by Supabase – connect your Supabase project to unlock real data!)
              </em>
            </span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {roles.map((role) => (
              <button
                key={role.key}
                className="bg-secondary hover:bg-primary/90 text-primary font-semibold px-4 py-3 rounded transition-all shadow border border-border"
                onClick={() => handleRoleSelect(role.key)}
              >
                {role.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-accent-foreground mb-2">
            <b>Demo Note:</b> These dashboards are simulated. Enable Supabase for live features.
          </div>
          <div className="rounded bg-blue-50 border border-blue-200 px-4 py-2 mt-2 text-blue-800">
            <span className="font-semibold">🚀 Pro Tip:</span> Connect Supabase (green button, top right) for full backend features.{" "}
            <a
              href="https://docs.lovable.dev/integrations/supabase/"
              target="_blank"
              className="underline text-blue-700 ml-1"
              rel="noopener noreferrer"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
      <footer className="w-full mt-12 mb-3 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} HIMS by Inostrik. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
