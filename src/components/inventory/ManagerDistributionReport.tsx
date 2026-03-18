
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Package, TrendingUp, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";

export function ManagerDistributionReport() {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const monthStart = useMemo(() => startOfMonth(new Date(selectedMonth + "-01")).toISOString(), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(new Date(selectedMonth + "-01")).toISOString(), [selectedMonth]);

  // Get all provided requests for the selected month
  const { data: providedRequests, isLoading } = useQuery({
    queryKey: ["distribution-report", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("status", "provided")
        .gte("provided_at", monthStart)
        .lte("provided_at", monthEnd)
        .order("provided_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Resolve profiles + departments
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; role: string; department: string }>>({});
  const [departments, setDepartments] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("departments").select("id, name").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((d: any) => { map[d.id] = d.name; });
      setDepartments(map);
    });
  }, []);

  useEffect(() => {
    const ids = [...new Set(providedRequests?.map((r: any) => r.requested_by) || [])];
    if (ids.length === 0) { setProfileMap({}); return; }
    supabase.from("profiles").select("id, first_name, last_name, role, department_id").in("id", ids).then(({ data }) => {
      const map: Record<string, { name: string; role: string; department: string }> = {};
      data?.forEach((p: any) => {
        map[p.id] = {
          name: `${p.first_name} ${p.last_name}`,
          role: p.role,
          department: departments[p.department_id] || "Unassigned",
        };
      });
      setProfileMap(map);
    });
  }, [providedRequests, departments]);

  // Aggregate by person
  const personSummary = useMemo(() => {
    if (!providedRequests) return [];
    const map: Record<string, { name: string; role: string; department: string; itemCount: number; totalQty: number; totalExpense: number; items: string[] }> = {};
    providedRequests.forEach((req: any) => {
      const id = req.requested_by;
      if (!map[id]) {
        const prof = profileMap[id];
        map[id] = {
          name: prof?.name || "...",
          role: prof?.role || "",
          department: prof?.department || "-",
          itemCount: 0,
          totalQty: 0,
          totalExpense: 0,
          items: [],
        };
      }
      map[id].itemCount += 1;
      map[id].totalQty += req.quantity;
      map[id].totalExpense += req.expense_amount || 0;
      map[id].items.push(req.item_name);
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [providedRequests, profileMap]);

  // Aggregate by department
  const deptSummary = useMemo(() => {
    const map: Record<string, { itemCount: number; totalQty: number; totalExpense: number; persons: Set<string> }> = {};
    personSummary.forEach((p) => {
      const dept = p.department;
      if (!map[dept]) map[dept] = { itemCount: 0, totalQty: 0, totalExpense: 0, persons: new Set() };
      map[dept].itemCount += p.itemCount;
      map[dept].totalQty += p.totalQty;
      map[dept].totalExpense += p.totalExpense;
      map[dept].persons.add(p.name);
    });
    return Object.entries(map)
      .map(([dept, data]) => ({ department: dept, ...data, personCount: data.persons.size }))
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [personSummary]);

  const totalItems = providedRequests?.length || 0;
  const totalQty = providedRequests?.reduce((s: number, r: any) => s + r.quantity, 0) || 0;
  const totalExpense = providedRequests?.reduce((s: number, r: any) => s + (r.expense_amount || 0), 0) || 0;

  // Generate month options (last 6 months)
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 6; i++) {
      const d = subMonths(new Date(), i);
      options.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") });
    }
    return options;
  }, []);

  return (
    <div className="space-y-6">
      {/* Month Selector + Summary Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Requests Fulfilled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQty}</p>
                <p className="text-xs text-muted-foreground">Total Qty Provided</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{personSummary.length}</p>
                <p className="text-xs text-muted-foreground">People Served</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingUp className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPkrAmount(totalExpense)}</p>
                <p className="text-xs text-muted-foreground">Total Expense</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Total Qty</TableHead>
                <TableHead>Expense</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deptSummary.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data for this month</TableCell></TableRow>
              ) : deptSummary.map((d) => (
                <TableRow key={d.department}>
                  <TableCell className="font-medium">{d.department}</TableCell>
                  <TableCell>{d.personCount}</TableCell>
                  <TableCell>{d.itemCount}</TableCell>
                  <TableCell>{d.totalQty}</TableCell>
                  <TableCell>{d.totalExpense > 0 ? formatPkrAmount(d.totalExpense) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-Person Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items Received Per Person</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Total Qty</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Expense</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personSummary.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No items provided this month</TableCell></TableRow>
                ) : personSummary.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.role}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{p.department}</Badge></TableCell>
                    <TableCell>{p.itemCount}</TableCell>
                    <TableCell className="font-semibold">{p.totalQty}</TableCell>
                    <TableCell className="text-sm max-w-[250px]">
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(p.items)].map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{p.totalExpense > 0 ? formatPkrAmount(p.totalExpense) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
