import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrCurrency } from "@/utils/currency";
import { Users, DollarSign, Calendar, Plus, Download, Check, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
// Fixed CheckAll import issue

interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  pay_period: string;
  created_at: string;
  paid_at?: string;
}

export default function FinancePayroll() {
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [isCreatePayrollDialogOpen, setIsCreatePayrollDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [baseSalary, setBaseSalary] = useState<string>("");
  const [allowances, setAllowances] = useState<string>("0");
  const [deductions, setDeductions] = useState<string>("0");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all staff members
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['staff', 'doctor', 'admin', 'pharmacy'])
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch payroll records
  const { data: payrollRecords, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-records', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('pay_period', selectedMonth)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PayrollRecord[];
    }
  });

  const createPayrollMutation = useMutation({
    mutationFn: async (payrollData: {
      employee_id: string;
      employee_name: string;
      role: string;
      base_salary: number;
      allowances: number;
      deductions: number;
      net_salary: number;
      pay_period: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payroll')
        .insert([{
          ...payrollData,
          created_by: userData.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      setIsCreatePayrollDialogOpen(false);
      setSelectedEmployeeId("");
      setBaseSalary("");
      setAllowances("0");
      setDeductions("0");
      toast({
        title: "Success",
        description: "Payroll record created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create payroll record",
        variant: "destructive",
      });
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ recordId, record }: { recordId: string; record: PayrollRecord }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Update payroll record to paid
      const { error: payrollError } = await supabase
        .from('payroll')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString() 
        })
        .eq('id', recordId);

      if (payrollError) throw payrollError;

      // Add to expenses table
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          category: 'Payroll',
          description: `Salary payment for ${record.employee_name} (${record.pay_period})`,
          amount: record.net_salary,
          expense_date: new Date().toISOString().split('T')[0],
          created_by: userData.user?.id
        }]);

      if (expenseError) throw expenseError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: "Success",
        description: "Payroll marked as paid and added to expenses",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark payroll as paid",
        variant: "destructive",
      });
    }
  });

  const markAllPaidMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const pendingRecords = payrollRecords?.filter(r => r.status === 'pending') || [];
      
      if (pendingRecords.length === 0) return;

      // Update all pending payroll records to paid
      const { error: payrollError } = await supabase
        .from('payroll')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString() 
        })
        .eq('pay_period', selectedMonth)
        .eq('status', 'pending');

      if (payrollError) throw payrollError;

      // Add all to expenses table
      const expenseInserts = pendingRecords.map(record => ({
        category: 'Payroll',
        description: `Salary payment for ${record.employee_name} (${record.pay_period})`,
        amount: record.net_salary,
        expense_date: new Date().toISOString().split('T')[0],
        created_by: userData.user?.id
      }));

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert(expenseInserts);

      if (expenseError) throw expenseError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: "Success",
        description: "All pending payroll marked as paid and added to expenses",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all payroll as paid",
        variant: "destructive",
      });
    }
  });

  const handleCreatePayroll = () => {
    const selectedEmployee = staff?.find(s => s.id === selectedEmployeeId);
    if (!selectedEmployee || !baseSalary) return;

    const baseSalaryNum = parseFloat(baseSalary);
    const allowancesNum = parseFloat(allowances) || 0;
    const deductionsNum = parseFloat(deductions) || 0;
    const netSalary = baseSalaryNum + allowancesNum - deductionsNum;

    createPayrollMutation.mutate({
      employee_id: selectedEmployeeId,
      employee_name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
      role: selectedEmployee.role,
      base_salary: baseSalaryNum,
      allowances: allowancesNum,
      deductions: deductionsNum,
      net_salary: netSalary,
      pay_period: selectedMonth
    });
  };

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    return options;
  };

  const totalPayroll = payrollRecords?.reduce((sum, record) => sum + record.net_salary, 0) || 0;
  const paidPayroll = payrollRecords?.filter(r => r.status === 'paid').reduce((sum, record) => sum + record.net_salary, 0) || 0;
  const pendingPayroll = payrollRecords?.filter(r => r.status === 'pending').reduce((sum, record) => sum + record.net_salary, 0) || 0;

  if (staffLoading || payrollLoading) {
    return <div className="p-8">Loading payroll data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Payroll Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrCurrency(totalPayroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrCurrency(paidPayroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatPkrCurrency(pendingPayroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Payroll Management
          </CardTitle>
            <div className="flex gap-4 items-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {payrollRecords?.some(r => r.status === 'pending') && (
                <Button 
                  variant="outline"
                  onClick={() => markAllPaidMutation.mutate()}
                  disabled={markAllPaidMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All Paid
                </Button>
              )}
              <Dialog open={isCreatePayrollDialogOpen} onOpenChange={setIsCreatePayrollDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payroll
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Payroll Record</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="employee">Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff?.map(employee => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.first_name} {employee.last_name} ({employee.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="baseSalary">Base Salary (PKR)</Label>
                      <Input
                        id="baseSalary"
                        type="number"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(e.target.value)}
                        placeholder="Enter base salary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allowances">Allowances (PKR)</Label>
                      <Input
                        id="allowances"
                        type="number"
                        value={allowances}
                        onChange={(e) => setAllowances(e.target.value)}
                        placeholder="Enter allowances"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deductions">Deductions (PKR)</Label>
                      <Input
                        id="deductions"
                        type="number"
                        value={deductions}
                        onChange={(e) => setDeductions(e.target.value)}
                        placeholder="Enter deductions"
                      />
                    </div>
                    {baseSalary && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Salary Summary:</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Base Salary:</span>
                            <span>{formatPkrCurrency(parseFloat(baseSalary) || 0)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Allowances:</span>
                            <span>+{formatPkrCurrency(parseFloat(allowances) || 0)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Deductions:</span>
                            <span>-{formatPkrCurrency(parseFloat(deductions) || 0)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Net Salary:</span>
                            <span>{formatPkrCurrency((parseFloat(baseSalary) || 0) + (parseFloat(allowances) || 0) - (parseFloat(deductions) || 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <Button 
                      onClick={handleCreatePayroll} 
                      className="w-full"
                      disabled={createPayrollMutation.isPending || !selectedEmployeeId || !baseSalary}
                    >
                      {createPayrollMutation.isPending ? "Creating..." : "Create Payroll Record"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Payroll Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRecords?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.employee_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {record.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatPkrCurrency(record.base_salary)}</TableCell>
                  <TableCell className="text-green-600">
                    +{formatPkrCurrency(record.allowances)}
                  </TableCell>
                  <TableCell className="text-red-600">
                    -{formatPkrCurrency(record.deductions)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPkrCurrency(record.net_salary)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {record.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => markPaidMutation.mutate({ recordId: record.id, record })}
                          disabled={markPaidMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}