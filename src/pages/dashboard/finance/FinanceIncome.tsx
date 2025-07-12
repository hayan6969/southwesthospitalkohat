import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useInvoices } from "@/hooks/useDatabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Download, Receipt, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function FinanceIncome() {
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const { data: allInvoices, isLoading: invoicesLoading } = useInvoices();
  const { toast } = useToast();

  // Filter invoices by date if selected
  const invoices = filterDate
    ? allInvoices?.filter(invoice => {
        const invoiceDate = new Date(invoice.created_at!);
        return invoiceDate.toDateString() === filterDate.toDateString();
      })
    : allInvoices;

  // Get pharmacy invoices
  const { data: pharmacyInvoices, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get lab reports for revenue
  const { data: labReports, isLoading: labLoading } = useQuery({
    queryKey: ['lab-reports-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get OT schedules for revenue
  const { data: otSchedules, isLoading: otLoading } = useQuery({
    queryKey: ['ot-schedules-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleDownloadPDF = async (invoice: any) => {
    try {
      await generateInvoicePDF(invoice);
      toast({
        title: "Success",
        description: "Invoice PDF generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const hospitalRevenue = invoices?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;
  const pharmacyRevenue = pharmacyInvoices?.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;
  const labRevenue = labReports?.reduce((sum, report) => sum + (report.price || 0), 0) || 0;
  const otRevenue = otSchedules?.reduce((sum, schedule) => sum + (schedule.total_cost || 0), 0) || 0;
  const totalRevenue = hospitalRevenue + pharmacyRevenue + labRevenue + otRevenue;

  if (invoicesLoading || pharmacyLoading || labLoading || otLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Hospital Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(hospitalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pharmacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(pharmacyRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Lab Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(labRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">OT Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(otRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
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
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.slice(0, 10).map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                  <TableCell>Hospital Service</TableCell>
                  <TableCell>{formatPkrAmount(invoice.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(invoice.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownloadPDF(invoice)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {pharmacyInvoices?.slice(0, 5).map((invoice) => (
                <TableRow key={`pharmacy-${invoice.id}`}>
                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                  <TableCell>Pharmacy</TableCell>
                  <TableCell>{formatPkrAmount(invoice.final_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="default">Completed</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(invoice.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4" />
                    </Button>
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