import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FamilyMember {
  id: string;                // patient row id (== profile id)
  first_name: string | null;
  last_name: string | null;
  relation: string | null;   // null for guardian (self)
  patient_number: string | null;
  is_guardian: boolean;
}

interface PatientContextValue {
  activePatientId: string | undefined;
  activePatient: FamilyMember | undefined;
  members: FamilyMember[];
  setActivePatientId: (id: string) => void;
  isLoading: boolean;
  refetch: () => void;
}

const PatientContext = createContext<PatientContextValue | undefined>(undefined);
const STORAGE_KEY = "hims.activePatientId";

export function PatientProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const guardianId = profile?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["family-members", guardianId],
    enabled: !!guardianId,
    queryFn: async (): Promise<FamilyMember[]> => {
      if (!guardianId) return [];

      // Guardian's own patient row + all family members whose guardian_id points to guardian
      const [guardianRes, membersRes] = await Promise.all([
        supabase
          .from("patients")
          .select("id, patient_number, relation")
          .eq("id", guardianId)
          .maybeSingle(),
        supabase
          .from("patients")
          .select("id, patient_number, relation")
          .eq("guardian_id", guardianId),
      ]);

      const memberIds = [
        ...(guardianRes.data ? [guardianRes.data.id] : []),
        ...((membersRes.data ?? []).map((m) => m.id)),
      ];

      const profilesRes = memberIds.length
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", memberIds)
        : { data: [] as any[] };

      const profById = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

      const rows: FamilyMember[] = [];
      if (guardianRes.data) {
        const p = profById.get(guardianRes.data.id);
        rows.push({
          id: guardianRes.data.id,
          first_name: p?.first_name ?? profile?.first_name ?? null,
          last_name: p?.last_name ?? profile?.last_name ?? null,
          relation: null,
          patient_number: guardianRes.data.patient_number,
          is_guardian: true,
        });
      }
      for (const m of membersRes.data ?? []) {
        const p = profById.get(m.id);
        rows.push({
          id: m.id,
          first_name: p?.first_name ?? null,
          last_name: p?.last_name ?? null,
          relation: m.relation,
          patient_number: m.patient_number,
          is_guardian: false,
        });
      }
      return rows;
    },
  });

  const members = data ?? [];

  const [activePatientId, setActivePatientIdState] = useState<string | undefined>(undefined);

  // Initialise / validate active id whenever members list changes
  useEffect(() => {
    if (!guardianId) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const isValid = (id: string | null) => !!id && members.some((m) => m.id === id);
    if (isValid(stored)) {
      setActivePatientIdState(stored!);
    } else {
      setActivePatientIdState(guardianId);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, guardianId);
    }
  }, [guardianId, members]);

  const setActivePatientId = (id: string) => {
    setActivePatientIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const activePatient = useMemo(
    () => members.find((m) => m.id === activePatientId),
    [members, activePatientId],
  );

  return (
    <PatientContext.Provider
      value={{ activePatientId, activePatient, members, setActivePatientId, isLoading, refetch }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function useActivePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) {
    // Safe fallback so components can be rendered outside the provider (returns nothing)
    return {
      activePatientId: undefined,
      activePatient: undefined,
      members: [],
      setActivePatientId: () => {},
      isLoading: false,
      refetch: () => {},
    };
  }
  return ctx;
}
