import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Users, DollarSign, Calendar, Plus, Download, Check, CheckCircle, CalendarIcon, Settings, RefreshCw, UserPlus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

interface PayrollTemplate {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  is_active: boolean;
  created_at: string;
}

export default function FinancePayroll() {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");
  const [employeeRole, setEmployeeRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [baseSalary, setBaseSalary] = useState<string>("");
  const [allowances, setAllowances] = useState<string>("0");
  const [deductions, setDeductions] = useState<string>("0");
  const [editingTemplate, setEditingTemplate] = useState<PayrollTemplate | null>(null);
  
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

  // Fetch payroll templates
  const { data: payrollTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['payroll-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PayrollTemplate[];
    }
  });

  // Fetch payroll records
  const { data: allPayrollRecords, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-records', selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return [];
      
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('pay_period', selectedMonth)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PayrollRecord[];
    }
  });

  // Filter payroll records by date if selected
  const payrollRecords = filterDate
    ? allPayrollRecords?.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate.toDateString() === filterDate.toDateString();
      })
    : allPayrollRecords;

  // Create/Update Payroll Template Mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: {
      employee_id: string;
      employee_name: string;
      role: string;
      base_salary: number;
      allowances: number;
      deductions: number;
      net_salary: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (editingTemplate) {
        // Update existing template
        const { data, error } = await supabase
          .from('payroll_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Determine if this is an existing employee or manual entry
        const isExistingEmployee = selectedEmployeeId && staff?.find(emp => emp.id === selectedEmployeeId);
        
        if (isExistingEmployee) {
          // Use upsert for existing employees to handle duplicates
          const { data, error } = await supabase
            .from('payroll_templates')
            .upsert([{
              ...templateData,
              created_by: userData.user?.id
            }], {
              onConflict: 'employee_id'
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          // Use insert for manual entries (new employees)
          const { data, error } = await supabase
            .from('payroll_templates')
            .insert([{
              ...templateData,
              created_by: userData.user?.id
            }])
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-templates'] });
      setIsTemplateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: editingTemplate ? "Payroll template updated successfully" : "Payroll template created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message?.includes('unique') ? "Employee already has a payroll template" : "Failed to save payroll template",
        variant: "destructive",
      });
    }
  });

  // Generate Monthly Payroll Mutation
  const generatePayrollMutation = useMutation({
    mutationFn: async (month: string) => {
      const { data, error } = await supabase.rpc('generate_monthly_payroll', {
        target_month: month
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({
        title: "Success",
        description: `Generated ${count} payroll records for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate payroll",
        variant: "destructive",
      });
    }
  });

  // Mark Paid Mutation
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

  // Mark All Paid Mutation
  const markAllPaidMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const pendingRecords = allPayrollRecords?.filter(r => r.status === 'pending') || [];
      
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

  // Delete Template Mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('payroll_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-templates'] });
      toast({
        title: "Success",
        description: "Payroll template deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete payroll template",
        variant: "destructive",
      });
    }
  });

  // Clear All Payroll Records Mutation
  const clearAllPayrollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('payroll')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({
        title: "Success",
        description: "All payroll records cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear payroll records",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedEmployeeId("");
    setEmployeeName("");
    setEmployeeRole("");
    setSearchQuery("");
    setBaseSalary("");
    setAllowances("0");
    setDeductions("0");
    setEditingTemplate(null);
  };

  const handleSaveTemplate = () => {
    if (!employeeName || !employeeRole || !baseSalary) return;

    const baseSalaryNum = parseFloat(baseSalary);
    const allowancesNum = parseFloat(allowances) || 0;
    const deductionsNum = parseFloat(deductions) || 0;
    const netSalary = baseSalaryNum + allowancesNum - deductionsNum;

    // For new templates, generate a UUID if no employee was selected from existing staff
    const employeeId = editingTemplate ? editingTemplate.employee_id : (selectedEmployeeId || crypto.randomUUID());

    saveTemplateMutation.mutate({
      employee_id: employeeId,
      employee_name: employeeName,
      role: employeeRole,
      base_salary: baseSalaryNum,
      allowances: allowancesNum,
      deductions: deductionsNum,
      net_salary: netSalary,
    });
  };

  const handleEditTemplate = (template: PayrollTemplate) => {
    setEditingTemplate(template);
    setSelectedEmployeeId(template.employee_id);
    setEmployeeName(template.employee_name);
    setEmployeeRole(template.role);
    setBaseSalary(template.base_salary.toString());
    setAllowances(template.allowances.toString());
    setDeductions(template.deductions.toString());
    setSearchQuery(template.employee_name);
    setIsTemplateDialogOpen(true);
  };

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    // Show months in chronological order (oldest first, but starting from 12 months ago)
    for (let i = 11; i >= 0; i--) {
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

  if (staffLoading || templatesLoading || payrollLoading) {
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
            <div className="text-2xl font-bold">{formatPkrAmount(totalPayroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(paidPayroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatPkrAmount(pendingPayroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollTemplates?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Management Tabs */}
      <Tabs defaultValue="records" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="records">Monthly Payroll</TabsTrigger>
          <TabsTrigger value="templates">Employee Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          {/* Payroll Controls */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Monthly Payroll Records
              </CardTitle>
              <div className="flex gap-4 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-48 justify-start text-left font-normal",
                        !filterDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filterDate}
                      onSelect={setFilterDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select month" />
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
                  <Button
                    variant="outline"
                    onClick={() => generatePayrollMutation.mutate(selectedMonth)}
                    disabled={generatePayrollMutation.isPending || !selectedMonth}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Payroll
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => clearAllPayrollMutation.mutate()}
                    disabled={clearAllPayrollMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Records
                  </Button>
                  {allPayrollRecords?.some(r => r.status === 'pending') && (
                    <Button 
                      variant="outline"
                      onClick={() => markAllPaidMutation.mutate()}
                      disabled={markAllPaidMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark All Paid
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Payroll Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedMonth 
                  ? `Payroll Records - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`
                  : 'Payroll Records - Select a month'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedMonth ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Please select a month to view payroll records.</p>
                </div>
              ) : payrollRecords?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No payroll records found for this month.</p>
                  <p className="text-sm mt-2">Click "Generate Payroll" to create records from templates.</p>
                </div>
              ) : (
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
                        <TableCell>{formatPkrAmount(record.base_salary)}</TableCell>
                        <TableCell className="text-green-600">
                          +{formatPkrAmount(record.allowances)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          -{formatPkrAmount(record.deductions)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPkrAmount(record.net_salary)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Templates Header */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Employee Salary Templates
              </CardTitle>
              <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
                setIsTemplateDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? 'Edit Employee Template' : 'Create Employee Template'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="employeeSearch">Search Existing Employee (Optional)</Label>
                      <Input
                        id="employeeSearch"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          // Auto-select if exact match found
                          const exactMatch = staff?.find(emp => 
                            `${emp.first_name} ${emp.last_name}`.toLowerCase() === e.target.value.toLowerCase()
                          );
                          if (exactMatch) {
                            setSelectedEmployeeId(exactMatch.id);
                            setEmployeeName(`${exactMatch.first_name} ${exactMatch.last_name}`);
                            setEmployeeRole(exactMatch.role);
                          }
                        }}
                        placeholder="Search existing employees or leave blank for manual entry..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Search to auto-fill from existing employees, or fill fields manually below
                      </p>
                      {searchQuery && staff && !editingTemplate && (
                        <div className="mt-2 border rounded-md bg-white max-h-32 overflow-y-auto z-50 shadow-lg">
                          {staff
                            .filter(emp => 
                              `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .slice(0, 5)
                            .map(employee => (
                              <div
                                key={employee.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => {
                                  setSelectedEmployeeId(employee.id);
                                  setEmployeeName(`${employee.first_name} ${employee.last_name}`);
                                  setEmployeeRole(employee.role);
                                  setSearchQuery(`${employee.first_name} ${employee.last_name}`);
                                }}
                              >
                                {employee.first_name} {employee.last_name} ({employee.role})
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="employeeName">Employee Name</Label>
                      <Input
                        id="employeeName"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="Enter employee name"
                        readOnly={!!editingTemplate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="employeeRole">Role</Label>
                      <Input
                        id="employeeRole"
                        value={employeeRole}
                        onChange={(e) => setEmployeeRole(e.target.value)}
                        placeholder="Enter employee role"
                        readOnly={!!editingTemplate}
                      />
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
                            <span>{formatPkrAmount(parseFloat(baseSalary) || 0)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Allowances:</span>
                            <span>+{formatPkrAmount(parseFloat(allowances) || 0)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Deductions:</span>
                            <span>-{formatPkrAmount(parseFloat(deductions) || 0)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Net Salary:</span>
                            <span>{formatPkrAmount((parseFloat(baseSalary) || 0) + (parseFloat(allowances) || 0) - (parseFloat(deductions) || 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <Button 
                      onClick={handleSaveTemplate} 
                      className="w-full"
                      disabled={saveTemplateMutation.isPending || !employeeName || !employeeRole || !baseSalary}
                    >
                      {saveTemplateMutation.isPending ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
          </Card>

          {/* Templates Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Salary Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollTemplates?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No employee templates found.</p>
                  <p className="text-sm mt-2">Add templates to automatically generate monthly payroll.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollTemplates?.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.employee_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {template.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatPkrAmount(template.base_salary)}</TableCell>
                        <TableCell className="text-green-600">
                          +{formatPkrAmount(template.allowances)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          -{formatPkrAmount(template.deductions)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPkrAmount(template.net_salary)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              disabled={deleteTemplateMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}