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
import { Users, DollarSign, Calendar, Plus, Download, Check } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface PayrollRecord {
  id: string;
  employee_name: string;
  role: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  pay_period: string;
  created_at: string;
}

export default function FinancePayroll() {
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
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

  // Mock payroll data (would come from payroll table)
  const { data: payrollRecords, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-records', selectedMonth],
    queryFn: async () => {
      // Mock data - in real implementation, would query payroll table
      return [
        {
          id: '1',
          employee_name: 'Dr. Ahmad Khan',
          role: 'doctor',
          base_salary: 150000,
          allowances: 20000,
          deductions: 5000,
          net_salary: 165000,
          status: 'paid' as const,
          pay_period: '2024-01',
          created_at: '2024-01-31T10:00:00Z'
        },
        {
          id: '2',
          employee_name: 'Sarah Ahmed',
          role: 'staff',
          base_salary: 80000,
          allowances: 10000,
          deductions: 2000,
          net_salary: 88000,
          status: 'paid' as const,
          pay_period: '2024-01',
          created_at: '2024-01-31T10:00:00Z'
        },
        {
          id: '3',
          employee_name: 'Ali Hassan',
          role: 'pharmacy',
          base_salary: 60000,
          allowances: 8000,
          deductions: 1500,
          net_salary: 66500,
          status: 'pending' as const,
          pay_period: '2024-02',
          created_at: '2024-02-01T10:00:00Z'
        },
        {
          id: '4',
          employee_name: 'Dr. Fatima Malik',
          role: 'doctor',
          base_salary: 140000,
          allowances: 18000,
          deductions: 4000,
          net_salary: 154000,
          status: 'pending' as const,
          pay_period: '2024-02',
          created_at: '2024-02-01T10:00:00Z'
        }
      ] as PayrollRecord[];
    }
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (payrollData: any) => {
      // This would process payroll and update database
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      setIsPayrollDialogOpen(false);
      toast({
        title: "Success",
        description: "Payroll processed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process payroll",
        variant: "destructive",
      });
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async (recordId: string) => {
      // This would update the payroll record status
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({
        title: "Success",
        description: "Payroll marked as paid",
      });
    }
  });

  const handleProcessPayroll = () => {
    processPayrollMutation.mutate({
      month: selectedMonth,
      staff_ids: staff?.map(s => s.id) || []
    });
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
                <SelectItem value="2024-01">January 2024</SelectItem>
                <SelectItem value="2024-02">February 2024</SelectItem>
                <SelectItem value="2024-03">March 2024</SelectItem>
                <SelectItem value="2024-04">April 2024</SelectItem>
                <SelectItem value="2024-05">May 2024</SelectItem>
                <SelectItem value="2024-06">June 2024</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Process Payroll
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Process Monthly Payroll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>This will process payroll for {staff?.length || 0} employees for the selected month.</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Payroll Summary:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Employees:</span>
                        <span>{staff?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Total:</span>
                        <span>{formatPkrCurrency(totalPayroll)}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleProcessPayroll} 
                    className="w-full"
                    disabled={processPayrollMutation.isPending}
                  >
                    {processPayrollMutation.isPending ? "Processing..." : "Confirm Process Payroll"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                          onClick={() => markPaidMutation.mutate(record.id)}
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