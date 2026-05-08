import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Save, X } from "lucide-react";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";

interface DoctorRow {
  id: string;
  consultation_fee: number;
  hospital_share_percentage: number;
  fee_set_by_finance: boolean;
  fee_updated_at: string | null;
  specialization: string | null;
  first_name: string | null;
  last_name: string | null;
}

export function DoctorFeeManager() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<string>("");
  const [editShare, setEditShare] = useState<string>("");

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors-fee-mgmt"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select(`
          id,
          consultation_fee,
          hospital_share_percentage,
          fee_set_by_finance,
          fee_updated_at,
          specialization,
          profiles!doctors_id_fkey ( first_name, last_name )
        `);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        consultation_fee: Number(d.consultation_fee || 0),
        hospital_share_percentage: Number(d.hospital_share_percentage ?? 30),
        fee_set_by_finance: !!d.fee_set_by_finance,
        fee_updated_at: d.fee_updated_at,
        specialization: d.specialization,
        first_name: d.profiles?.first_name,
        last_name: d.profiles?.last_name,
      })) as DoctorRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, fee, share }: { id: string; fee: number; share: number }) => {
      const { error } = await supabase
        .from("doctors")
        .update({
          consultation_fee: fee,
          hospital_share_percentage: share,
          fee_set_by_finance: true,
          fee_updated_by: profile?.id,
          fee_updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Doctor fee updated");
      queryClient.invalidateQueries({ queryKey: ["doctors-fee-mgmt"] });
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const startEdit = (d: DoctorRow) => {
    setEditingId(d.id);
    setEditFee(d.consultation_fee.toString());
    setEditShare(d.hospital_share_percentage.toString());
  };

  const handleSave = (id: string) => {
    const fee = parseFloat(editFee);
    const share = parseFloat(editShare);
    if (isNaN(fee) || fee < 0) return toast.error("Invalid fee");
    if (isNaN(share) || share < 0 || share > 100) return toast.error("Hospital share must be 0–100");
    saveMutation.mutate({ id, fee, share });
  };

  const sharePreview = (() => {
    const s = parseFloat(editShare);
    if (isNaN(s)) return null;
    return Math.max(0, Math.min(100, 100 - s));
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Consultation Fee & Revenue Share</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Consultation Fee</TableHead>
                <TableHead>Hospital Share %</TableHead>
                <TableHead>Doctor Share %</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>
              ) : doctors?.length ? (
                doctors.map((d) => {
                  const isEditing = editingId === d.id;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">Dr. {d.first_name} {d.last_name}</TableCell>
                      <TableCell>{d.specialization || "—"}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input type="number" min="0" value={editFee} onChange={(e) => setEditFee(e.target.value)} className="w-32" />
                        ) : (
                          formatPkrAmount(d.consultation_fee)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input type="number" min="0" max="100" value={editShare} onChange={(e) => setEditShare(e.target.value)} className="w-24" />
                        ) : (
                          <Badge variant="secondary">{d.hospital_share_percentage}%</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">
                          {isEditing
                            ? (sharePreview !== null ? `${sharePreview}%` : "—")
                            : `${100 - d.hospital_share_percentage}%`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.fee_updated_at ? format(new Date(d.fee_updated_at), "PP") : "Never"}
                        {d.fee_set_by_finance && <Badge className="ml-2 bg-blue-100 text-blue-700">Finance</Badge>}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSave(d.id)} disabled={saveMutation.isPending}>
                              <Save className="w-3 h-3 mr-1" />Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(d)}>
                            <Pencil className="w-3 h-3 mr-1" />Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No doctors found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default DoctorFeeManager;
