import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, Receipt, FlaskConical, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatPkrAmount } from "@/utils/currency";
import { format } from "date-fns";

interface TestType {
  id: string;
  name: string;
  report_category: string | null;
  price: number;
  is_active: boolean;
}

interface PathologyOrder {
  id: string;
  order_number: string;
  patient_id: string;
  total_amount: number;
  payment_status: string;
  lab_status: string;
  referred_by: string | null;
  created_at: string;
  invoice_id: string | null;
}

export function StaffPathologyBilling() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [referredBy, setReferredBy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: patients } = useSearchPatientsWithNames(search);

  const { data: testTypes } = useQuery({
    queryKey: ["lab_test_types_priced"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as TestType[];
    },
  });

  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ["pathology_orders_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pathology_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as PathologyOrder[];
    },
  });

  const total = useMemo(() => {
    if (!testTypes) return 0;
    return selectedTestIds.reduce((sum, id) => {
      const t = testTypes.find((x) => x.id === id);
      return sum + Number(t?.price ?? 0);
    }, 0);
  }, [selectedTestIds, testTypes]);

  const reset = () => {
    setSearch("");
    setSelectedPatient(null);
    setSelectedTestIds([]);
    setReferredBy("");
  };

  const handleCreate = async () => {
    if (submitting) return;
    if (!selectedPatient) return toast.error("Select a patient");
    if (selectedTestIds.length === 0) return toast.error("Select at least one test");

    setSubmitting(true);
    try {
      // 1. Generate order number
      const { data: orderNumData, error: numErr } = await supabase
        .rpc("generate_pathology_order_number");
      if (numErr) throw numErr;
      const orderNumber = orderNumData as string;

      // 2. Create invoice (status=paid since cash collected at counter)
      const invoiceNumber = `PATH-INV-${Date.now().toString().slice(-8)}`;
      const testNames = selectedTestIds
        .map((id) => testTypes?.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          patient_id: selectedPatient.id,
          invoice_number: invoiceNumber,
          amount: total,
          description: `Pathology: ${testNames}`,
          status: "paid",
          paid_at: new Date().toISOString(),
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      // 3. Create order
      const { data: order, error: ordErr } = await supabase
        .from("lab_pathology_orders")
        .insert({
          order_number: orderNumber,
          patient_id: selectedPatient.id,
          invoice_id: invoice.id,
          referred_by: referredBy || null,
          total_amount: total,
          payment_status: "paid",
          lab_status: "ready",
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (ordErr) throw ordErr;

      // 4. Create order items
      const items = selectedTestIds.map((id) => {
        const t = testTypes!.find((x) => x.id === id)!;
        return {
          order_id: order.id,
          test_type_id: id,
          test_name_snapshot: t.name,
          price: Number(t.price ?? 0),
        };
      });
      const { error: itErr } = await supabase
        .from("lab_pathology_order_items")
        .insert(items);
      if (itErr) throw itErr;

      toast.success(`Order ${orderNumber} created and paid (${formatPkrAmount(total)})`);
      qc.invalidateQueries({ queryKey: ["pathology_orders_recent"] });
      qc.invalidateQueries({ queryKey: ["pathology_orders_ready"] });
      reset();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create pathology order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Create Pathology Order & Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient search */}
          <div>
            <Label>Patient (search by ID, name, or phone)</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="P-XXXXX, name, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!!selectedPatient}
              />
            </div>
            {patients && patients.length > 0 && !selectedPatient && (
              <div className="mt-2 border rounded-lg max-h-56 overflow-y-auto bg-white">
                {patients.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer"
                    onClick={() => {
                      setSelectedPatient(p);
                      setSearch("");
                    }}
                  >
                    <div className="font-medium">
                      {p.profile?.first_name} {p.profile?.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {p.patient_number || "—"} · Phone: {p.profile?.phone || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-2 p-3 border-2 border-blue-500 bg-blue-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {selectedPatient.profile?.first_name} {selectedPatient.profile?.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {selectedPatient.patient_number || "—"} · Phone: {selectedPatient.profile?.phone || "—"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Tests */}
          <div>
            <Label>Select tests</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {testTypes?.map((t) => {
                const checked = selectedTestIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-start justify-between gap-2 p-3 border rounded-lg cursor-pointer ${
                      checked ? "border-blue-500 bg-blue-50" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setSelectedTestIds((prev) =>
                            v ? [...prev, t.id] : prev.filter((x) => x !== t.id)
                          )
                        }
                      />
                      <div>
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.report_category}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                      {formatPkrAmount(Number(t.price ?? 0))}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Referred By (optional)</Label>
              <Input
                placeholder="Dr. Name"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Label className="text-muted-foreground">Total</Label>
              <div className="text-2xl font-bold text-green-700">{formatPkrAmount(total)}</div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={reset} disabled={submitting}>
              Reset
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !selectedPatient || selectedTestIds.length === 0}
            >
              <Receipt className="w-4 h-4 mr-2" />
              {submitting ? "Creating..." : "Create Paid Order"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Pathology Orders</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Lab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.order_number}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(o.created_at), "dd-MMM-yy hh:mm a")}
                  </TableCell>
                  <TableCell>{formatPkrAmount(Number(o.total_amount))}</TableCell>
                  <TableCell>
                    <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>
                      {o.payment_status === "paid" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {o.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{o.lab_status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!orders || orders.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
