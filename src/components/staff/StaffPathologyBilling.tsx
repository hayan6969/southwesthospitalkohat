import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchPatientsWithNames, useDoctorNames } from "@/hooks/useDisplayHelpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  X,
  Receipt,
  FlaskConical,
  CheckCircle2,
  Plus,
  UserPlus,
} from "lucide-react";
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

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [isExternalDoctor, setIsExternalDoctor] = useState(false);
  const [externalDoctorName, setExternalDoctorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    cnic: "",
  });

  const { data: patients } = useSearchPatientsWithNames(search);
  const { data: doctorNames } = useDoctorNames();

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

  const { data: orders } = useQuery({
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

  const filteredTests = useMemo(() => {
    if (!testTypes) return [];
    const q = testSearchQuery.trim().toLowerCase();
    if (!q) return testTypes;
    return testTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.report_category ?? "").toLowerCase().includes(q)
    );
  }, [testTypes, testSearchQuery]);

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
    setTestSearchQuery("");
    setReferredBy("");
    setIsExternalDoctor(false);
    setExternalDoctorName("");
    setActiveTab("search");
    setNewPatient({ first_name: "", last_name: "", phone: "", cnic: "" });
  };

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const ensurePatient = async (): Promise<{ id: string } | null> => {
    if (selectedPatient) return { id: selectedPatient.id };
    if (activeTab === "register") {
      if (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim()) {
        toast.error("First name, last name and phone are required");
        return null;
      }
      const { data, error } = await supabase.rpc("create_patient_account", {
        p_phone: newPatient.phone.trim(),
        p_cnic: newPatient.cnic.trim() || newPatient.phone.trim(),
        p_first_name: newPatient.first_name.trim(),
        p_last_name: newPatient.last_name.trim(),
      });
      if (error) {
        toast.error(error.message || "Failed to register patient");
        return null;
      }
      const result: any = data;
      return { id: result.user_id };
    }
    toast.error("Select a patient");
    return null;
  };

  const handleCreate = async () => {
    if (submitting) return;
    if (selectedTestIds.length === 0) return toast.error("Select at least one test");

    setSubmitting(true);
    try {
      const patient = await ensurePatient();
      if (!patient) {
        setSubmitting(false);
        return;
      }

      const referringName = isExternalDoctor
        ? externalDoctorName.trim() || null
        : (() => {
            const d = doctorNames?.find((x: any) => x.id === referredBy);
            return d ? `Dr. ${d.first_name} ${d.last_name}` : null;
          })();

      // 1. Order number
      const { data: orderNumData, error: numErr } = await supabase.rpc(
        "generate_pathology_order_number"
      );
      if (numErr) throw numErr;
      const orderNumber = orderNumData as string;

      // 2. Invoice (paid)
      const invoiceNumber = `PATH-INV-${Date.now().toString().slice(-8)}`;
      const testNames = selectedTestIds
        .map((id) => testTypes?.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          patient_id: patient.id,
          invoice_number: invoiceNumber,
          amount: total,
          description: `Lab: ${testNames}`,
          status: "paid",
          paid_at: new Date().toISOString(),
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      // 3. Order
      const { data: order, error: ordErr } = await supabase
        .from("lab_pathology_orders")
        .insert({
          order_number: orderNumber,
          patient_id: patient.id,
          invoice_id: invoice.id,
          referred_by: referringName,
          total_amount: total,
          payment_status: "paid",
          lab_status: "ready",
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (ordErr) throw ordErr;

      // 4. Items
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

      toast.success(`Order ${orderNumber} created (${formatPkrAmount(total)})`);
      qc.invalidateQueries({ queryKey: ["pathology_orders_recent"] });
      qc.invalidateQueries({ queryKey: ["pathology_orders_ready"] });
      reset();
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create lab order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Lab Orders
          </CardTitle>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) reset();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Lab Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto z-[9999]">
              <DialogHeader>
                <DialogTitle>Create Lab Order</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Patient Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Patient Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="search" className="flex items-center gap-2">
                          <Search className="w-4 h-4" /> Search Patient
                        </TabsTrigger>
                        <TabsTrigger value="register" className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4" /> Register New
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="search" className="space-y-4">
                        {selectedPatient ? (
                          <div className="space-y-2">
                            <Label>Selected Patient</Label>
                            <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-lg">
                                  {selectedPatient.profile?.first_name}{" "}
                                  {selectedPatient.profile?.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground space-y-0.5">
                                  <div>
                                    <strong>Patient ID:</strong>{" "}
                                    {selectedPatient.patient_number || "N/A"}
                                  </div>
                                  {selectedPatient.profile?.phone && (
                                    <div>
                                      <strong>Phone:</strong>{" "}
                                      {selectedPatient.profile.phone}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedPatient(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="search">Search Patient</Label>
                              <Input
                                id="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Patient ID, Phone Number, Name, or CNIC..."
                              />
                            </div>
                            {patients && patients.length > 0 && (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {patients.map((p: any) => (
                                  <div
                                    key={p.id}
                                    className="p-3 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer"
                                    onClick={() => setSelectedPatient(p)}
                                  >
                                    <div className="font-semibold">
                                      {p.profile?.first_name} {p.profile?.last_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ID: {p.patient_number || "—"} · Phone:{" "}
                                      {p.profile?.phone || "—"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="register" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>First Name *</Label>
                            <Input
                              value={newPatient.first_name}
                              onChange={(e) =>
                                setNewPatient((p) => ({
                                  ...p,
                                  first_name: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Name *</Label>
                            <Input
                              value={newPatient.last_name}
                              onChange={(e) =>
                                setNewPatient((p) => ({
                                  ...p,
                                  last_name: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Phone Number *</Label>
                            <Input
                              value={newPatient.phone}
                              onChange={(e) =>
                                setNewPatient((p) => ({ ...p, phone: e.target.value }))
                              }
                              placeholder="03001234567"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>CNIC</Label>
                            <Input
                              value={newPatient.cnic}
                              onChange={(e) =>
                                setNewPatient((p) => ({ ...p, cnic: e.target.value }))
                              }
                              placeholder="12345-6789012-3"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Ordering Doctor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ordering Doctor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="external-doctor"
                        checked={isExternalDoctor}
                        onCheckedChange={(v) => {
                          const checked = !!v;
                          setIsExternalDoctor(checked);
                          if (checked) setReferredBy("");
                          else setExternalDoctorName("");
                        }}
                      />
                      <Label htmlFor="external-doctor">External Doctor</Label>
                    </div>

                    {isExternalDoctor ? (
                      <div className="space-y-2">
                        <Label>External Doctor Name</Label>
                        <Input
                          value={externalDoctorName}
                          onChange={(e) => setExternalDoctorName(e.target.value)}
                          placeholder="Enter external doctor's name"
                        />
                      </div>
                    ) : (
                      <Select value={referredBy} onValueChange={setReferredBy}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select ordering doctor..." />
                        </SelectTrigger>
                        <SelectContent
                          portal={false}
                          className="z-[10000] max-h-[300px] bg-popover"
                          position="popper"
                          sideOffset={4}
                        >
                          {doctorNames && doctorNames.length > 0 ? (
                            doctorNames.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>
                                Dr. {d.first_name} {d.last_name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none__" disabled>
                              No doctors found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>

                {/* Lab Tests (from new pathology test types) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lab Tests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Search Tests</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search lab tests..."
                          value={testSearchQuery}
                          onChange={(e) => setTestSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {filteredTests.length > 0 ? (
                        filteredTests.map((t) => {
                          const checked = selectedTestIds.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleTest(t.id)}
                              className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                                checked
                                  ? "bg-blue-50 border-blue-200"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium">{t.name}</div>
                                  {t.report_category && (
                                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                                      {t.report_category}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-green-600">
                                    {formatPkrAmount(Number(t.price ?? 0))}
                                  </div>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleTest(t.id)}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          {testSearchQuery
                            ? "No tests found matching your search."
                            : "No lab tests available. Ask admin to add them in Manage Tests."}
                        </div>
                      )}
                    </div>

                    {selectedTestIds.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                        <span className="font-medium">
                          Selected Tests: {selectedTestIds.length}
                        </span>
                        <span className="font-bold text-blue-600">
                          Total: {formatPkrAmount(total)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedTestIds.length === 0) return toast.error("Select at least one test");
                      if (activeTab === "search" && !selectedPatient) return toast.error("Select a patient");
                      if (activeTab === "register" && (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim())) {
                        return toast.error("First name, last name and phone are required");
                      }
                      setReviewOpen(true);
                    }}
                    disabled={selectedTestIds.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    {`Review Order (${formatPkrAmount(total)})`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Review / Confirm Dialog */}
          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto z-[9999]">
              <DialogHeader>
                <DialogTitle>Review Lab Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">Patient</div>
                  <div className="font-medium">
                    {selectedPatient
                      ? `${selectedPatient.first_name ?? ""} ${selectedPatient.last_name ?? ""}`.trim() || "—"
                      : `${newPatient.first_name} ${newPatient.last_name}`.trim() || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedPatient?.patient_number ?? "New patient"} · {selectedPatient?.phone ?? newPatient.phone}
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">Referred By</div>
                  <div className="font-medium">
                    {isExternalDoctor
                      ? (externalDoctorName.trim() || "External — not specified")
                      : (() => {
                          const d = doctorNames?.find((x: any) => x.id === referredBy);
                          return d ? `Dr. ${d.first_name} ${d.last_name}` : "—";
                        })()}
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
                    Tests ({selectedTestIds.length})
                  </div>
                  <div className="divide-y">
                    {selectedTestIds.map((id) => {
                      const t = testTypes?.find((x) => x.id === id);
                      if (!t) return null;
                      return (
                        <div key={id} className="flex justify-between items-center px-3 py-2 text-sm">
                          <div>
                            <div className="font-medium">{t.name}</div>
                            {t.report_category && (
                              <div className="text-xs text-muted-foreground">{t.report_category}</div>
                            )}
                          </div>
                          <div className="font-semibold text-green-600">
                            {formatPkrAmount(Number(t.price ?? 0))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 border-t bg-muted/40">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-blue-600">{formatPkrAmount(total)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={submitting}>
                    Back to Edit
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleCreate();
                      setReviewOpen(false);
                    }}
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    {submitting ? "Creating..." : `Confirm & Create (${formatPkrAmount(total)})`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                    <Badge
                      variant={o.payment_status === "paid" ? "default" : "secondary"}
                    >
                      {o.payment_status === "paid" && (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
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
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    No orders yet. Click "New Lab Order" to create one.
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
