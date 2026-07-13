import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatInPakistanTime } from "@/utils/timezone";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "pending", label: "All Pending" },
  { value: "ready", label: "Awaiting Report" },
  { value: "in_progress", label: "In Progress" },
];

export function PendingLabTests() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const { data, isLoading } = useQuery({
    queryKey: ["pending_lab_orders", debounced, status, page],
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    queryFn: async () => {
      // Resolve patient search → ids
      let patientIds: string[] = [];
      if (debounced) {
        const { data: pats } = await supabase
          .from("patients")
          .select("id")
          .or(`patient_number.ilike.%${debounced}%,name.ilike.%${debounced}%,phone.ilike.%${debounced}%`)
          .limit(50);
        patientIds = (pats ?? []).map((p: any) => p.id);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("lab_pathology_orders")
        .select(
          "id, order_number, patient_id, referred_by, sample_type, lab_status, payment_status, created_at, lab_pathology_order_items(test_name_snapshot)",
          { count: "exact" }
        )
        .neq("lab_status", "reported")
        .neq("lab_status", "cancelled")
        .order("created_at", { ascending: false });

      if (status !== "pending") q = q.eq("lab_status", status);

      if (debounced) {
        const orParts: string[] = [`order_number.ilike.%${debounced}%`];
        if (patientIds.length) orParts.push(`patient_id.in.(${patientIds.join(",")})`);
        q = q.or(orParts.join(","));
      }

      const { data: orders, error, count } = await q.range(from, to);
      if (error) throw error;

      // Fetch patient info for display
      const pIds = Array.from(new Set((orders ?? []).map((o: any) => o.patient_id).filter(Boolean)));
      let patientMap: Record<string, { name: string; patient_number: string; phone: string | null }> = {};
      if (pIds.length) {
        const { data: pats } = await supabase
          .from("patients")
          .select("id, name, patient_number, phone")
          .in("id", pIds);
        for (const p of pats ?? []) {
          patientMap[(p as any).id] = {
            name: (p as any).name,
            patient_number: (p as any).patient_number,
            phone: (p as any).phone,
          };
        }
      }

      return { orders: orders ?? [], count: count ?? 0, patientMap };
    },
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE)),
    [data?.count]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Pending Lab Tests
          {typeof data?.count === "number" && (
            <Badge variant="secondary" className="ml-2">
              {data.count}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, patient ID, name, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (data?.orders.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No pending lab tests
                  </TableCell>
                </TableRow>
              ) : (
                data!.orders.map((o: any) => {
                  const patient = o.patient_id ? data!.patientMap[o.patient_id] : null;
                  const tests = (o.lab_pathology_order_items ?? [])
                    .map((it: any) => it.test_name_snapshot)
                    .filter(Boolean);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell>
                        {patient ? (
                          <div className="text-sm">
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {patient.patient_number}
                              {patient.phone ? ` · ${patient.phone}` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-wrap gap-1">
                          {tests.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            tests.map((t: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {t}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{o.referred_by || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={o.lab_status === "ready" ? "default" : "secondary"}
                          className={
                            o.lab_status === "in_progress"
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              : ""
                          }
                        >
                          {o.lab_status === "in_progress" ? "In Progress" : "Ready"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatInPakistanTime(o.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {(data?.count ?? 0) > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {data?.count} pending
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
