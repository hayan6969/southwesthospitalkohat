import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedInvoices, usePaginatedPharmacyInvoices } from "@/hooks/useDatabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Download, Receipt, Calendar as CalendarIcon, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { generateInvoicePDF, generateXrayInvoicePDF, generateOTPDF } from "@/utils/pdfGenerator";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function FinanceInvoices() {
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { data: hospitalInvoicesResult, isLoading: hospitalLoading } = usePaginatedInvoices(currentPage, itemsPerPage, searchTerm);
  const hospitalInvoices = hospitalInvoicesResult?.data || [];
  const hospitalTotalCount = hospitalInvoicesResult?.count || 0;
  const { toast } = useToast();

  // Get pharmacy invoices with pagination
  const { data: pharmacyInvoicesResult, isLoading: pharmacyLoading } = usePaginatedPharmacyInvoices(currentPage, itemsPerPage, searchTerm);
  const pharmacyInvoices = pharmacyInvoicesResult?.data || [];
  const pharmacyTotalCount = pharmacyInvoicesResult?.count || 0;

  // Get lab reports for invoicing
  const { data: labReports, isLoading: labLoading } = useQuery({
    queryKey: ['lab-reports-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get X-ray reports for invoicing
  const { data: xrayReports, isLoading: xrayLoading } = useQuery({
    queryKey: ['xray-reports-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xray_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get OT schedules for invoicing
  const { data: otSchedules, isLoading: otLoading } = useQuery({
    queryKey: ['ot-schedules-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_schedules')
        .select(`
          *,
          doctor_name,
          ot_operations!inner (
            operation_name,
            ot_expenses (
              expense_name,
              cost
            )
          ),
          ot_rooms!inner (
            room_name
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleDownloadPDF = async (invoice: any) => {
    try {
      if (invoice.type === 'appointment' || invoice.type === 'emergency') {
        await generateInvoicePDF(invoice);
      } else if (invoice.type === 'pharmacy') {
        await generatePharmacyInvoiceFromData(invoice);
      } else if (invoice.type === 'lab') {
        // For lab invoices, fetch patient data first
        const [patientRes, patientProfileRes] = await Promise.all([
          supabase.from('patients').select('patient_number').eq('id', invoice.patient_id).single(),
          supabase.from('profiles').select('first_name, last_name').eq('id', invoice.patient_id).single()
        ]);

        await generateDetailedInvoicePDF({
          ...invoice,
          test_name: invoice.test_name || invoice.description || 'Laboratory Service',
          type: 'lab',
          patient: {
            patient_number: patientRes.data?.patient_number || 'Walk-in',
            profiles: patientProfileRes.data
          }
        });
      } else if (invoice.type === 'xray') {
        // For X-ray invoices, fetch patient and doctor data for proper PDF generation
        const [patientRes, patientProfileRes, doctorRes] = await Promise.all([
          supabase.from('patients').select('patient_number').eq('id', invoice.patient_id).single(),
          supabase.from('profiles').select('first_name, last_name, phone').eq('id', invoice.patient_id).single(),
          invoice.doctor_id ? 
            supabase.from('profiles').select('first_name, last_name').eq('id', invoice.doctor_id).single() :
            Promise.resolve({ data: null })
        ]);

        const patientNumber = patientRes.data?.patient_number || 'Walk-in';
        const patientProfile = patientProfileRes.data;
        const patientName = patientProfile ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() : 'Walk-in Patient';
        const doctorProfile = doctorRes.data;
        const doctorName = invoice.external_doctor_name || 
          (doctorProfile ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}` : 'External Doctor');

        await generateXrayInvoicePDF({
          invoiceNumber: invoice.displayNumber,
          patientName: patientName,
          patientEmail: 'Not provided',
          patientId: patientNumber,
          patientPhone: patientProfile?.phone || 'Not provided',
          doctorName: doctorName,
          tests: [{
            name: invoice.test_name,
            price: invoice.price || 0,
            description: invoice.notes || undefined
          }],
          totalAmount: invoice.price || 0,
          issueDate: format(new Date(invoice.created_at), 'MMM dd, yyyy'),
          xrayDate: format(new Date(invoice.xray_date || invoice.created_at), 'MMM dd, yyyy'),
          notes: invoice.notes
        });
      } else if (invoice.type === 'ot') {
        // For OT invoices, use the exact same PDF generator as when scheduling OT
        const [patientRes, patientProfileRes] = await Promise.all([
          supabase.from('patients').select('patient_number').eq('id', invoice.patient_id).single(),
          supabase.from('profiles').select('first_name, last_name').eq('id', invoice.patient_id).single()
        ]);

        const otExpenses = invoice.ot_expenses || [];
        
        // Prepare items array in the EXACT format used by OT scheduling
        const items: Array<{
          description: string;
          quantity: number | string;
          unitPrice: number | string;
          totalPrice: number | string;
          isHeader?: boolean;
        }> = [];

        // Doctor Charges Section (exactly like OT scheduling)
        const doctorCharges = invoice.doctor_expense || 0;
        if (doctorCharges > 0) {
          items.push({
            description: `--- DOCTOR CHARGES ---`,
            quantity: '',
            unitPrice: '',
            totalPrice: '',
            isHeader: true
          });
          items.push({
            description: `Doctor Fee (${invoice.doctor_name || 'Dr. Unknown'})`,
            quantity: 1,
            unitPrice: doctorCharges,
            totalPrice: doctorCharges
          });
        }

        // Hospital Charges Section (exactly like OT scheduling)
        if (otExpenses && otExpenses.length > 0) {
          items.push({
            description: `--- ${(invoice.operation_name || 'SURGERY').toUpperCase()} ---`,
            quantity: '',
            unitPrice: '',
            totalPrice: '',
            isHeader: true
          });

          // Add expenses for this operation
          otExpenses.forEach((expense: any) => {
            items.push({
              description: expense.expense_name,
              quantity: 1,
              unitPrice: expense.cost,
              totalPrice: expense.cost
            });
          });
        } else {
          // Fallback if no detailed expenses
          const otCharges = (invoice.total_cost || 0) - doctorCharges;
          if (otCharges > 0) {
            items.push({
              description: `--- ${(invoice.operation_name || 'SURGERY').toUpperCase()} ---`,
              quantity: '',
              unitPrice: '',
              totalPrice: '',
              isHeader: true
            });
            items.push({
              description: 'Operation Charges',
              quantity: 1,
              unitPrice: otCharges,
              totalPrice: otCharges
            });
          }
        }

        // If no items were added, add a generic one
        if (items.length === 0) {
          items.push({
            description: 'Operation Theater Service',
            quantity: 1,
            unitPrice: invoice.total_cost || 0,
            totalPrice: invoice.total_cost || 0
          });
        }

        // Get patient information
        const patientName = patientProfileRes.data ? 
          `${patientProfileRes.data.first_name} ${patientProfileRes.data.last_name}`.trim() : 
          'Unknown Patient';
        const patientId = patientRes.data?.patient_number || 'N/A';
        
        const otInvoiceData = {
          invoiceNumber: invoice.displayNumber,
          patientName: patientName,
          patientId: patientId,
          patientPhone: 'Not provided', // Not available in this context
          doctorName: invoice.doctor_name || 'Unknown Doctor',
          procedure: invoice.operation_name || invoice.notes || 'Surgery',
          room: invoice.room_name || 'Unknown Room',
          date: format(new Date(invoice.operation_date || invoice.created_at), 'MMM dd, yyyy'),
          totalAmount: invoice.total_cost || 0,
          items: items
        };

        await generateOTPDF(otInvoiceData);
      } else {
        // Default to detailed invoice PDF for any other types
        await generateDetailedInvoicePDF(invoice);
      }
      toast({
        title: "Success",
        description: "Invoice opened in new tab",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open invoice",
        variant: "destructive",
      });
    }
  };

  const generatePharmacyInvoiceFromData = async (invoice: any) => {
    // Fetch invoice items for pharmacy invoice
    const { data: items } = await supabase
      .from('pharmacy_invoice_items')
      .select(`
        *,
        medicines:medicine_id (
          name,
          selling_price
        )
      `)
      .eq('invoice_id', invoice.id);

    const invoiceData = {
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      total_amount: invoice.total_amount,
      discount_amount: invoice.discount_amount || 0,
      final_amount: invoice.final_amount,
      created_at: invoice.created_at,
      items: items?.map(item => ({
        medicine_name: item.medicines?.name || 'Unknown Medicine',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })) || []
    };

    await generatePharmacyInvoicePDF(invoiceData);
  };

  const generateDetailedInvoicePDF = async (invoice: any) => {
    // Get hospital settings for PDF branding
    const getHospitalSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('hospital_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        return {
          hospital_name: 'Medical Center',
          hospital_address: 'Healthcare District',
          contact_number: '+92-XXX-XXXXXXX',
          logo_url: null
        };
      }
    };

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const settings = await getHospitalSettings();
    
    let yPosition = 20;

    // Hospital logo (if available)
    if (settings.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
          img.onload = () => {
            try {
              doc.addImage(img, 'JPEG', 20, yPosition - 5, 30, 20);
              resolve(true);
            } catch (error) {
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 5000);
          img.src = settings.logo_url;
        });
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Hospital name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(`${settings.hospital_name}${invoice.type === 'lab' ? ' - Laboratory' : ' - Operation Theater'}`, pageWidth / 2, yPosition + 8, { align: 'center' });
    
    yPosition += 16;
    
    // Hospital address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(settings.hospital_address, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 6;
    
    // Contact number
    doc.text(`Phone: ${settings.contact_number}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    
    // Document title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    const title = invoice.type === 'lab' ? 'LAB TEST INVOICE' : 'OPERATION THEATER INVOICE';
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 25;
    
    // Invoice details box
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, yPosition - 5, pageWidth - 30, 70);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    
    // Invoice details
    doc.text('Invoice #:', 20, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.displayNumber, 60, yPosition + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 120, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(invoice.displayDate!), 'MMM dd, yyyy'), 140, yPosition + 5);
    
    yPosition += 10;
    
    if (invoice.type === 'lab') {
      doc.setFont('helvetica', 'bold');
      doc.text('Patient:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      const patientName = invoice.patient?.profiles?.first_name && invoice.patient?.profiles?.last_name 
        ? `${invoice.patient.profiles.first_name} ${invoice.patient.profiles.last_name}`
        : 'Walk-in Patient';
      doc.text(patientName, 60, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Patient ID:', 120, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      const patientId = invoice.patient?.patient_number || 'N/A';
      doc.text(patientId, 160, yPosition + 5);
      
      yPosition += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.status?.toUpperCase() || 'COMPLETED', 60, yPosition + 5);
    } else if (invoice.type === 'ot') {
      doc.setFont('helvetica', 'bold');
      doc.text('Patient:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      const patientName = invoice.patient?.profiles?.first_name && invoice.patient?.profiles?.last_name 
        ? `${invoice.patient.profiles.first_name} ${invoice.patient.profiles.last_name}`
        : 'Unknown Patient';
      doc.text(patientName, 60, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Patient ID:', 120, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      const patientId = invoice.patient?.patient_number || 'N/A';
      doc.text(patientId, 160, yPosition + 5);
      
      yPosition += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Operation Date:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(invoice.operation_date), 'MMM dd, yyyy'), 85, yPosition + 5);
      
      if (invoice.doctor_name) {
        doc.setFont('helvetica', 'bold');
        doc.text('Doctor:', 120, yPosition + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.doctor_name, 155, yPosition + 5);
      }
      
      yPosition += 10;
      
      if (invoice.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Procedure:', 20, yPosition + 5);
        doc.setFont('helvetica', 'normal');
        const notes = invoice.notes.length > 40 ? invoice.notes.substring(0, 37) + '...' : invoice.notes;
        doc.text(notes, 70, yPosition + 5);
        
        yPosition += 10;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.status?.toUpperCase() || 'COMPLETED', 60, yPosition + 5);
    }
    
    yPosition += 70;
    
    // Service details with proper text wrapping
    const tableStartY = yPosition;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Description', 20, yPosition + 7);
    doc.text('Amount', pageWidth - 50, yPosition + 7);
    
    yPosition += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    if (invoice.type === 'lab') {
      // For lab reports, we need to get the actual test name and description
      const testName = invoice.test_name || invoice.name || 'Laboratory Service';
      const description = `Lab Test: ${testName}`;
      
      // Apply text wrapping for lab test descriptions
      const maxWidth = pageWidth - 90; // Leave space for amount column
      const wrappedText = doc.splitTextToSize(description, maxWidth);
      const textHeight = wrappedText.length * 5;
      
      doc.text(wrappedText, 20, yPosition);
      doc.text(formatPkrAmount(invoice.displayAmount || 0), pageWidth - 50, yPosition);
      
      yPosition += textHeight + 2;
    } else {
      // OT Service with detailed charge breakdown from ot_expenses
      const doctorFee = invoice.doctor_expense || 0;
      const otExpenses = invoice.ot_expenses || [];
      
      // Show operation name if available
      if (invoice.operation_name) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Operation: ${invoice.operation_name}`, 20, yPosition);
        yPosition += 10;
      }
      
      // Doctor fee line
      if (doctorFee > 0) {
        doc.text('Doctor Fee', 20, yPosition);
        doc.text(formatPkrAmount(doctorFee), pageWidth - 50, yPosition);
        yPosition += 8;
      }
      
      // Detailed OT expenses
      if (otExpenses && otExpenses.length > 0) {
        otExpenses.forEach((expense: any) => {
          doc.text(expense.expense_name || 'OT Expense', 20, yPosition);
          doc.text(formatPkrAmount(expense.cost || 0), pageWidth - 50, yPosition);
          yPosition += 8;
        });
      } else {
        // Fallback to basic OT charges if no detailed expenses
        const otCharges = (invoice.total_cost || 0) - doctorFee;
        if (otCharges > 0) {
          doc.text('Operation Theater Charges', 20, yPosition);
          doc.text(formatPkrAmount(otCharges), pageWidth - 50, yPosition);
          yPosition += 8;
        }
      }
      
      // If no breakdown available at all, show total as OT service
      if (doctorFee === 0 && (!otExpenses || otExpenses.length === 0) && (invoice.total_cost || 0) > 0) {
        doc.text('Operation Theater Service', 20, yPosition);
        doc.text(formatPkrAmount(invoice.displayAmount || 0), pageWidth - 50, yPosition);
        yPosition += 8;
      }
    }
    
    // Draw table border
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
    doc.line(pageWidth - 70, tableStartY, pageWidth - 70, yPosition);
    
    yPosition += 20;
    
    // Total section
    const totalsX = pageWidth - 85;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.rect(totalsX, yPosition - 5, 80, 18);
    doc.text('Total Amount:', totalsX + 5, yPosition + 4);
    doc.text(formatPkrAmount(invoice.displayAmount || 0), totalsX + 5, yPosition + 12);
    
    yPosition += 30;
    
    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for choosing our medical services!', pageWidth / 2, yPosition, { align: 'center' });
    doc.text('For any queries, please contact us at the above number.', pageWidth / 2, yPosition + 8, { align: 'center' });
    
    // Open in new tab
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  // Combine all invoices into a single array with type information
  const allInvoices = [
    ...(hospitalInvoices?.map(inv => {
      // All hospital invoices from the invoices table are appointments, regardless of description
      // Invoice number prefix determines type: INV- = appointment, LAB- = lab, etc.
      let type = 'appointment';
      let typeLabel = 'Appointment';
      
      // Only check for emergency consultations in description
      if (inv.description?.toLowerCase().includes('emergency consultation')) {
        type = 'emergency';
        typeLabel = 'Emergency Consultation';
      }
      
      return {
        ...inv,
        type,
        typeLabel,
        displayAmount: inv.amount,
        displayNumber: inv.invoice_number,
        displayDate: inv.created_at,
        displayStatus: inv.status
      };
    }) || []),
    ...(pharmacyInvoices?.map(inv => ({
      ...inv,
      type: 'pharmacy',
      typeLabel: 'Pharmacy',
      displayAmount: inv.final_amount,
      displayNumber: inv.invoice_number,
      displayDate: inv.created_at,
      displayStatus: 'completed'
    })) || []),
    ...(labReports?.map(lab => ({
      ...lab,
      type: 'lab',
      typeLabel: 'Lab Test',
      displayAmount: lab.price,
      displayNumber: `LAB-${lab.id.slice(0, 8)}`,
      displayDate: lab.created_at,
      displayStatus: lab.status
    })) || []),
    ...(xrayReports?.map(xray => ({
      ...xray,
      type: 'xray',
      typeLabel: 'X-ray',
      displayAmount: xray.price,
      displayNumber: `XR-${xray.id.slice(0, 8)}`,
      displayDate: xray.created_at,
      displayStatus: xray.status
    })) || []),
    ...(otSchedules?.map(ot => ({
      ...ot,
      type: 'ot',
      typeLabel: 'Operation Theater',
      displayAmount: ot.total_cost,
      displayNumber: `OT-${ot.id.slice(0, 8)}`,
      displayDate: ot.created_at,
      displayStatus: ot.status,
      // Include operation details for detailed breakdown
      operation_name: ot.ot_operations?.[0]?.operation_name,
      ot_expenses: ot.ot_operations?.[0]?.ot_expenses || [],
      room_name: ot.ot_rooms?.[0]?.room_name
    })) || [])
  ];

  // Filter invoices based on selected filters
  const filteredInvoices = allInvoices.filter(invoice => {
    // Filter by type
    if (filterType !== 'all' && invoice.type !== filterType) return false;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        invoice.displayNumber.toLowerCase().includes(searchLower) ||
        invoice.typeLabel.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by date
    if (filterDate) {
      const invoiceDate = new Date(invoice.displayDate!);
      return invoiceDate.toDateString() === filterDate.toDateString();
    }
    
    return true;
  }).sort((a, b) => new Date(b.displayDate!).getTime() - new Date(a.displayDate!).getTime());

  // Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Calculate totals
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + (invoice.displayAmount || 0), 0);
  const totalCount = filteredInvoices.length;

  if (hospitalLoading || pharmacyLoading || labLoading || xrayLoading || otLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Filter Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
               {filterType === 'all' ? 'All Types' : 
                filterType === 'appointment' ? 'Appointments' :
               filterType === 'emergency' ? 'Emergency' :
               filterType === 'pharmacy' ? 'Pharmacy' :
                filterType === 'lab' ? 'Lab Tests' :
                filterType === 'xray' ? 'X-ray' :
                filterType === 'ot' ? 'OT Services' : 'All Types'}
              {filterDate && ` • ${format(filterDate, 'MMM dd, yyyy')}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            All Invoices
          </CardTitle>
          <div className="flex items-center gap-4">
            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
                 <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="appointment">Appointments</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="lab">Lab Tests</SelectItem>
                  <SelectItem value="xray">X-ray</SelectItem>
                  <SelectItem value="ot">Operation Theater</SelectItem>
                </SelectContent>
            </Select>

            {/* Date Filter */}
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

            {/* Clear Filters */}
            {(filterType !== 'all' || filterDate) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilterType('all');
                  setFilterDate(undefined);
                }}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
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
              {paginatedInvoices.map((invoice, index) => (
                <TableRow key={`${invoice.type}-${invoice.id}`}>
                  <TableCell className="font-mono">{invoice.displayNumber}</TableCell>
                  <TableCell>
                    <Badge variant={
                      invoice.type === 'appointment' ? 'default' :
                      invoice.type === 'emergency' ? 'destructive' :
                      invoice.type === 'pharmacy' ? 'secondary' :
                      invoice.type === 'lab' ? 'outline' :
                      invoice.type === 'xray' ? 'default' :
                      invoice.type === 'ot' ? 'destructive' : 'default'
                    }>
                      {invoice.typeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatPkrAmount(invoice.displayAmount || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      invoice.displayStatus === 'paid' || invoice.displayStatus === 'completed' ? 'default' : 
                      invoice.displayStatus === 'pending' ? 'secondary' :
                      invoice.displayStatus === 'scheduled' ? 'outline' : 'secondary'
                    }>
                      {invoice.displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(invoice.displayDate!), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownloadPDF(invoice)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No invoices found with the selected filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
             <div className="flex items-center justify-between px-2 pt-4">
               <div className="text-sm text-gray-700">
                 Showing {startIndex + 1} to {Math.min(endIndex, filteredInvoices.length)} of {hospitalTotalCount + pharmacyTotalCount}+ total invoices
               </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-2">...</span>}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}