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
      // Resolve patient search → ids (search across patients + profiles)
      let patientIds: string[] = [];
      if (debounced) {
        const [{ data: pats }, { data: profs }] = await Promise.all([
          supabase
            .from("patients")
            .select("id")
            .or(`patient_number.ilike.%${debounced}%,cnic.ilike.%${debounced}%`)
            .limit(50),
          supabase
            .from("profiles")
            .select("id")
            .or(
              `first_name.ilike.%${debounced}%,last_name.ilike.%${debounced}%,phone.ilike.%${debounced}%`
            )
            .limit(50),
        ]);
        patientIds = Array.from(
          new Set([
            ...(pats ?? []).map((p: any) => p.id),
            ...(profs ?? []).map((p: any) => p.id),
          ])
        );
      }

      // No FK between lab_pathology_orders and invoices, so we can't use PostgREST
      // inner-join on invoices. Fetch pending orders (with items inner-joined to
      // exclude fully-removed test lists), then filter out cancelled / zero-value
      // invoices client-side, then paginate.
      let baseQ = supabase
        .from("lab_pathology_orders")
        .select(
          "id, order_number, patient_id, invoice_id, referred_by, sample_type, lab_status, payment_status, created_at, lab_pathology_order_items!inner(test_name_snapshot, price)"
        )
        .in("lab_status", ["ready", "in_progress"])
        .eq("payment_status", "paid")
        .gt("lab_pathology_order_items.price", 0)
        .order("created_at", { ascending: false });

      if (status !== "pending") baseQ = baseQ.eq("lab_status", status);

      if (debounced) {
        const orParts: string[] = [`order_number.ilike.%${debounced}%`];
        if (patientIds.length) orParts.push(`patient_id.in.(${patientIds.join(",")})`);
        baseQ = baseQ.or(orParts.join(","));
      }

      const { data: allOrders, error } = await baseQ.limit(500);
      if (error) throw error;

      // Validate invoices: exclude only orders whose linked invoice is explicitly
      // cancelled. Orders without an invoice link, or with a paid invoice, are kept.
      const invIds = Array.from(
        new Set((allOrders ?? []).map((o: any) => o.invoice_id).filter(Boolean))
      );
      const cancelledInvIds = new Set<string>();
      if (invIds.length) {
        const { data: invs } = await supabase
          .from("invoices")
          .select("id, status")
          .in("id", invIds)
          .eq("status", "cancelled");
        for (const inv of invs ?? []) cancelledInvIds.add((inv as any).id);
      }
      const filtered = (allOrders ?? []).filter(
        (o: any) => !o.invoice_id || !cancelledInvIds.has(o.invoice_id)
      );

      const totalCount = filtered.length;
      const fromIdx = (page - 1) * PAGE_SIZE;
      const orders = filtered.slice(fromIdx, fromIdx + PAGE_SIZE);
      const count = totalCount;

      // Fetch patient info (patient_number from patients, name/phone from profiles)
      const pIds = Array.from(new Set((orders ?? []).map((o: any) => o.patient_id).filter(Boolean)));
      const patientMap: Record<
        string,
        { name: string; patient_number: string; phone: string | null }
      > = {};
      if (pIds.length) {
        const [{ data: pats }, { data: profs }] = await Promise.all([
          supabase.from("patients").select("id, patient_number").in("id", pIds),
          supabase.from("profiles").select("id, first_name, last_name, phone").in("id", pIds),
        ]);
        for (const id of pIds) {
          const pat = (pats ?? []).find((x: any) => x.id === id) as any;
          const prof = (profs ?? []).find((x: any) => x.id === id) as any;
          patientMap[id] = {
            name:
              [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim() || "—",
            patient_number: pat?.patient_number ?? "—",
            phone: prof?.phone ?? null,
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
                          variant="secondary"
                          className={
                            o.lab_status === "in_progress"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                          }
                        >
                          {o.lab_status === "in_progress" ? "In Progress" : "Pending"}
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
