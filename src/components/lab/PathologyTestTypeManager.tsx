import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Save, X, FlaskConical, Layers } from "lucide-react";
import { toast } from "sonner";

interface TestType {
  id: string;
  name: string;
  report_category: string | null;
  method: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}
interface Parameter {
  id: string;
  test_type_id: string;
  category_heading: string | null;
  parameter_name: string;
  unit: string | null;
  ref_display: string | null;
  ref_min: number | null;
  ref_max: number | null;
  has_subranges: boolean;
  is_optional: boolean;
  sort_order: number;
}
interface Subrange {
  id: string;
  parameter_id: string;
  label: string;
  ref_min: number | null;
  ref_max: number | null;
  ref_display: string | null;
  sort_order: number;
}

const emptyTest: Partial<TestType> = { name: "", report_category: "", method: "", notes: "", is_active: true, sort_order: 100 };

export function PathologyTestTypeManager() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [editingTest, setEditingTest] = useState<Partial<TestType> | null>(null);

  const { data: testTypes } = useQuery({
    queryKey: ["lab_test_types_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_types").select("*").order("sort_order");
      if (error) throw error;
      return data as TestType[];
    },
  });

  const { data: parameters } = useQuery({
    queryKey: ["lab_test_parameters_admin", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_parameters").select("*").eq("test_type_id", selectedId).order("sort_order");
      if (error) throw error;
      return data as Parameter[];
    },
  });

  const paramIds = parameters?.map((p) => p.id) ?? [];
  const { data: subranges } = useQuery({
    queryKey: ["lab_parameter_subranges_admin", paramIds],
    enabled: paramIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_parameter_subranges").select("*").in("parameter_id", paramIds).order("sort_order");
      if (error) throw error;
      return data as Subrange[];
    },
  });

  const saveTest = useMutation({
    mutationFn: async (t: Partial<TestType>) => {
      if (t.id) {
        const { error } = await supabase.from("lab_test_types").update({
          name: t.name, report_category: t.report_category || null, method: t.method || null,
          notes: t.notes || null, is_active: t.is_active, sort_order: t.sort_order,
        }).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lab_test_types").insert({
          name: t.name!, report_category: t.report_category || null, method: t.method || null,
          notes: t.notes || null, is_active: t.is_active ?? true, sort_order: t.sort_order ?? 100,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Test type saved");
      qc.invalidateQueries({ queryKey: ["lab_test_types_admin"] });
      qc.invalidateQueries({ queryKey: ["lab_test_types"] });
      setShowTestDialog(false);
      setEditingTest(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const deleteTest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_test_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lab_test_types_admin"] });
      if (selectedId) setSelectedId(null);
    },
    onError: (e: any) => toast.error(e.message || "Cannot delete (in use)"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-blue-600" /> Pathology Test Types</CardTitle>
          <Button onClick={() => { setEditingTest({ ...emptyTest }); setShowTestDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Test Type
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testTypes?.map((t) => (
                  <TableRow key={t.id} className={selectedId === t.id ? "bg-blue-50" : ""}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.report_category || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.method || "—"}</TableCell>
                    <TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>{t.sort_order}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(t.id)}>
                        <Layers className="w-3.5 h-3.5 mr-1" /> Parameters
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingTest(t); setShowTestDialog(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${t.name}"? This will remove its parameters too.`)) deleteTest.mutate(t.id); }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {testTypes?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No test types yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedId && (
        <ParametersEditor
          testTypeId={selectedId}
          testName={testTypes?.find((t) => t.id === selectedId)?.name ?? ""}
          parameters={parameters ?? []}
          subranges={subranges ?? []}
          onClose={() => setSelectedId(null)}
        />
      )}

      <Dialog open={showTestDialog} onOpenChange={(o) => { if (!o) { setShowTestDialog(false); setEditingTest(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto z-[9999]">
          <DialogHeader><DialogTitle>{editingTest?.id ? "Edit Test Type" : "New Test Type"}</DialogTitle></DialogHeader>
          {editingTest && (
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editingTest.name ?? ""} onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })} /></div>
              <div><Label>Report Category</Label><Input placeholder="e.g. ENDOCRINOLOGY REPORT" value={editingTest.report_category ?? ""} onChange={(e) => setEditingTest({ ...editingTest, report_category: e.target.value })} /></div>
              <div><Label>Method</Label><Input value={editingTest.method ?? ""} onChange={(e) => setEditingTest({ ...editingTest, method: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={editingTest.notes ?? ""} onChange={(e) => setEditingTest({ ...editingTest, notes: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Sort Order</Label><Input type="number" value={editingTest.sort_order ?? 100} onChange={(e) => setEditingTest({ ...editingTest, sort_order: Number(e.target.value) })} /></div>
                <div className="flex items-end gap-2"><Switch checked={editingTest.is_active ?? true} onCheckedChange={(v) => setEditingTest({ ...editingTest, is_active: v })} /><Label>Active</Label></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTestDialog(false); setEditingTest(null); }}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            <Button onClick={() => editingTest && saveTest.mutate(editingTest)} disabled={!editingTest?.name?.trim() || saveTest.isPending}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Parameters editor =====
function ParametersEditor({ testTypeId, testName, parameters, subranges, onClose }: {
  testTypeId: string; testName: string; parameters: Parameter[]; subranges: Subrange[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Parameter> | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["lab_test_parameters_admin", testTypeId] });
  const refreshSr = () => qc.invalidateQueries({ queryKey: ["lab_parameter_subranges_admin"] });

  const saveParam = async (p: Partial<Parameter>) => {
    try {
      if (p.id) {
        const { error } = await supabase.from("lab_test_parameters").update({
          category_heading: p.category_heading || null, parameter_name: p.parameter_name!, unit: p.unit || null,
          ref_display: p.ref_display || null, ref_min: p.ref_min ?? null, ref_max: p.ref_max ?? null,
          has_subranges: p.has_subranges ?? false, is_optional: p.is_optional ?? false, sort_order: p.sort_order ?? 100,
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lab_test_parameters").insert({
          test_type_id: testTypeId, category_heading: p.category_heading || null, parameter_name: p.parameter_name!,
          unit: p.unit || null, ref_display: p.ref_display || null, ref_min: p.ref_min ?? null, ref_max: p.ref_max ?? null,
          has_subranges: p.has_subranges ?? false, is_optional: p.is_optional ?? false, sort_order: p.sort_order ?? 100,
        });
        if (error) throw error;
      }
      toast.success("Parameter saved"); setShowDialog(false); setEditing(null); refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteParam = async (id: string) => {
    if (!confirm("Delete this parameter?")) return;
    const { error } = await supabase.from("lab_test_parameters").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  const addSubrange = async (parameter_id: string) => {
    const { error } = await supabase.from("lab_parameter_subranges").insert({
      parameter_id, label: "New range", ref_min: null, ref_max: null, ref_display: null, sort_order: 100,
    });
    if (error) toast.error(error.message); else refreshSr();
  };
  const updateSubrange = async (id: string, patch: Partial<Subrange>) => {
    const { error } = await supabase.from("lab_parameter_subranges").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refreshSr();
  };
  const deleteSubrange = async (id: string) => {
    const { error } = await supabase.from("lab_parameter_subranges").delete().eq("id", id);
    if (error) toast.error(error.message); else refreshSr();
  };

  const addCategoryHeading = async () => {
    const heading = prompt("Heading text (e.g. WBC DIFFERENTIAL):");
    if (!heading) return;
    const { error } = await supabase.from("lab_test_parameters").insert({
      test_type_id: testTypeId, category_heading: heading, parameter_name: "—", sort_order: 50,
    });
    if (error) toast.error(error.message); else { toast.success("Heading added"); refresh(); }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Parameters — <span className="text-blue-700">{testName}</span></CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addCategoryHeading}><Plus className="w-3.5 h-3.5 mr-1" /> Heading Row</Button>
          <Button size="sm" onClick={() => { setEditing({ parameter_name: "", sort_order: 100, has_subranges: false, is_optional: false }); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Parameter
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Parameter</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Ref Range (display)</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Subranges</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.map((p) => (
                <>
                  <TableRow key={p.id} className={p.category_heading ? "bg-amber-50 font-bold" : ""}>
                    <TableCell>{p.sort_order}</TableCell>
                    <TableCell>
                      {p.category_heading ? <span className="text-amber-800">▸ {p.category_heading}</span> : (
                        <>{p.parameter_name}{p.is_optional && <Badge variant="secondary" className="ml-2 text-[10px]">Optional</Badge>}</>
                      )}
                    </TableCell>
                    <TableCell>{p.unit || "—"}</TableCell>
                    <TableCell className="text-xs">{p.ref_display || "—"}</TableCell>
                    <TableCell>{p.ref_min ?? "—"}</TableCell>
                    <TableCell>{p.ref_max ?? "—"}</TableCell>
                    <TableCell>
                      {p.has_subranges ? (
                        <Button size="sm" variant="link" onClick={() => setExpandedParam(expandedParam === p.id ? null : p.id)}>
                          {subranges.filter((s) => s.parameter_id === p.id).length} ranges
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setShowDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteParam(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                  {expandedParam === p.id && p.has_subranges && (
                    <TableRow><TableCell colSpan={8} className="bg-muted/30">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">Sub-ranges for {p.parameter_name}</span>
                          <Button size="sm" variant="outline" onClick={() => addSubrange(p.id)}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
                        </div>
                        {subranges.filter((s) => s.parameter_id === p.id).map((s) => (
                          <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                            <Input className="col-span-3" placeholder="Label" defaultValue={s.label} onBlur={(e) => e.target.value !== s.label && updateSubrange(s.id, { label: e.target.value })} />
                            <Input className="col-span-2" type="number" step="any" placeholder="Min" defaultValue={s.ref_min ?? ""} onBlur={(e) => updateSubrange(s.id, { ref_min: e.target.value === "" ? null : Number(e.target.value) })} />
                            <Input className="col-span-2" type="number" step="any" placeholder="Max" defaultValue={s.ref_max ?? ""} onBlur={(e) => updateSubrange(s.id, { ref_max: e.target.value === "" ? null : Number(e.target.value) })} />
                            <Input className="col-span-3" placeholder="Display" defaultValue={s.ref_display ?? ""} onBlur={(e) => updateSubrange(s.id, { ref_display: e.target.value || null })} />
                            <Button className="col-span-2" size="sm" variant="ghost" onClick={() => deleteSubrange(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        ))}
                      </div>
                    </TableCell></TableRow>
                  )}
                </>
              ))}
              {parameters.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-4">No parameters yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto z-[9999]">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Parameter" : "New Parameter"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Parameter Name *</Label><Input value={editing.parameter_name ?? ""} onChange={(e) => setEditing({ ...editing, parameter_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Unit</Label><Input placeholder="mg/dl" value={editing.unit ?? ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></div>
                <div><Label>Display Range</Label><Input placeholder="70 — 120" value={editing.ref_display ?? ""} onChange={(e) => setEditing({ ...editing, ref_display: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min</Label><Input type="number" step="any" value={editing.ref_min ?? ""} onChange={(e) => setEditing({ ...editing, ref_min: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><Label>Max</Label><Input type="number" step="any" value={editing.ref_max ?? ""} onChange={(e) => setEditing({ ...editing, ref_max: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              </div>
              <div><Label>Sort Order</Label><Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <div className="flex gap-6 pt-1">
                <div className="flex items-center gap-2"><Switch checked={editing.has_subranges ?? false} onCheckedChange={(v) => setEditing({ ...editing, has_subranges: v })} /><Label>Has sub-ranges (gender / phase / age)</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_optional ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_optional: v })} /><Label>Optional</Label></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            <Button onClick={() => editing && saveParam(editing)} disabled={!editing?.parameter_name?.trim()}><Save className="w-4 h-4 mr-1" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
