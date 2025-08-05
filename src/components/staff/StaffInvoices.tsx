import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, FileText, Receipt, TestTube, Building2, Eye, Download, ChevronLeft, ChevronRight, Zap, X } from "lucide-react";
import { useInvoices } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { generateInvoicePDF, generateOTPDF } from "@/utils/pdfGenerator";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';

export function StaffInvoices() {
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch hospital invoices
  const { data: hospitalInvoices, isLoading: hospitalLoading } = useInvoices();
  const { data: patientNames } = usePatientNames();

  // Fetch X-ray reports
  const { data: xrayReports, isLoading: xrayLoading } = useQuery({
    queryKey: ['xray-reports-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xray_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch Lab reports
  const { data: labReports, isLoading: labLoading } = useQuery({
    queryKey: ['lab-reports-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch OT schedules
  const { data: otSchedules, isLoading: otLoading } = useQuery({
    queryKey: ['ot-schedules-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_schedules')
        .select(`
          *,
          ot_operations (
            operation_name
          ),
          ot_rooms (
            room_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch OT expenses separately
  const { data: otExpenses } = useQuery({
    queryKey: ['ot-expenses-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_expenses')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch patient data for all patients
  const { data: allPatients } = useQuery({
    queryKey: ['all-patients-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_number');
      
      if (error) throw error;
      return data;
    }
  });

  // Combine all invoices and categorize by type based on description/context
  const allInvoices = useMemo(() => {
    const combined: any[] = [];

    // Process all invoices and categorize them by invoice number prefix
    if (hospitalInvoices) {
      hospitalInvoices.forEach(invoice => {
        // Categorize based on invoice number prefix
        let type = 'appointments';
        
        // Check invoice number prefix to determine actual type
        if (invoice.invoice_number?.startsWith('OT-')) {
          type = 'ot';
        } else if (invoice.invoice_number?.startsWith('LAB-')) {
          type = 'lab';
        } else if (invoice.invoice_number?.startsWith('XRAY-')) {
          type = 'xray';
        } else if (invoice.description?.toLowerCase().includes('emergency consultation')) {
          type = 'emergency';
        }
        
        combined.push({
          ...invoice,
          type,
          invoice_type: type,
          invoice_date: invoice.created_at,
          patient_name: getPatientName(invoice.patient_id, patientNames || []),
          patient_id_display: invoice.patient?.patient_number || 'N/A', // Add patient ID for display
          display_date: format(new Date(invoice.created_at), 'MMM d, yyyy'),
          display_time: format(new Date(invoice.created_at), 'h:mm a'),
          display_amount: formatPkrAmount(invoice.amount)
        });
      });
    }

    // Lab reports are already included in hospitalInvoices as LAB- prefixed invoices
    // No need to add them separately since they would create duplicates

    // Add X-ray reports
    if (xrayReports) {
      xrayReports.forEach(xrayReport => {
        // Get patient name from patient names using the helper
        const patientName = getPatientName(xrayReport.patient_id, patientNames || []);
        
        // Find patient number from allPatients array
        const patient = allPatients?.find(p => p.id === xrayReport.patient_id);
        
        combined.push({
          ...xrayReport,
          type: 'xray',
          invoice_type: 'xray',
          invoice_date: xrayReport.created_at,
          patient_name: patientName || 'Walk-in Patient',
          patient_id_display: patient?.patient_number || 'N/A',
          display_date: format(new Date(xrayReport.created_at), 'MMM d, yyyy'),
          display_time: format(new Date(xrayReport.created_at), 'h:mm a'),
          display_amount: formatPkrAmount(xrayReport.price || 0),
          amount: xrayReport.price || 0,
          invoice_number: `XRAY-${xrayReport.id.slice(-8).toUpperCase()}`,
          description: `X-ray: ${xrayReport.test_name}`,
          status: xrayReport.status === 'completed' ? 'paid' : 'pending'
        });
      });
    }

    // Add OT schedules
    if (otSchedules) {
      otSchedules.forEach(otSchedule => {
        // Get patient name from patient names using the helper
        const patientName = getPatientName(otSchedule.patient_id, patientNames || []);
        
        // Find patient number from allPatients array
        const patient = allPatients?.find(p => p.id === otSchedule.patient_id);
        
        combined.push({
          ...otSchedule,
          type: 'ot',
          invoice_type: 'ot',
          invoice_date: otSchedule.created_at,
          patient_name: patientName || 'Unknown Patient',
          patient_id_display: patient?.patient_number || 'N/A',
          display_date: format(new Date(otSchedule.created_at), 'MMM d, yyyy'),
          display_time: format(new Date(otSchedule.created_at), 'h:mm a'),
          display_amount: formatPkrAmount(otSchedule.total_cost || 0),
          amount: otSchedule.total_cost || 0,
          invoice_number: `OT-${otSchedule.id.slice(-8).toUpperCase()}`,
          description: `Operation Theater Service - ${otSchedule.ot_operations?.[0]?.operation_name || 'Surgery'}`,
          status: otSchedule.status === 'completed' ? 'paid' : 'pending',
          // Add fields needed for finance-style PDF
          displayAmount: otSchedule.total_cost || 0,
          displayNumber: `OT-${otSchedule.id.slice(-8).toUpperCase()}`,
          displayDate: otSchedule.created_at,
          displayStatus: otSchedule.status,
          operation_date: otSchedule.operation_date || otSchedule.created_at,
          doctor_name: otSchedule.doctor_name,
          notes: otSchedule.notes,
          ot_notes: otSchedule.ot_notes,
          doctor_expense: otSchedule.doctor_expense,
          // Include operation details for detailed breakdown
          operation_name: otSchedule.ot_operations?.operation_name,
          ot_expenses: otExpenses?.filter(expense => expense.operation_id === otSchedule.operation_id) || [],
          room_name: otSchedule.ot_rooms?.room_name
        });
      });
    }

    return combined.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
  }, [hospitalInvoices, patientNames, labReports, xrayReports, otSchedules, allPatients, otExpenses]);

  // Filter and paginate invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(invoice => {
      // Enhanced search to handle complete invoice numbers like "INV-1754340531651", "LAB-1754320936111"
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchTerm || 
        invoice.patient_name?.toLowerCase().includes(searchLower) ||
        invoice.invoice_number?.toLowerCase().includes(searchLower) ||
        invoice.description?.toLowerCase().includes(searchLower);

      const matchesType = filterType === "all" || invoice.type === filterType;

      const matchesDate = !filterDate || 
        format(new Date(invoice.invoice_date), 'yyyy-MM-dd') === filterDate;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [allInvoices, searchTerm, filterType, filterDate]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Enhanced detailed PDF generation function matching finance component logic
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
    doc.text(invoice.invoice_number, 60, yPosition + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 120, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(invoice.created_at), 'MMM dd, yyyy'), 140, yPosition + 5);
    
    yPosition += 10;
    
    if (invoice.type === 'lab') {
      doc.setFont('helvetica', 'bold');
      doc.text('Patient:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.patient_name || 'Walk-in Patient', 60, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Patient ID:', 120, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      // Use the actual patient data instead of hardcoded 'N/A'
      const patientId = invoice.patient?.patient_number || invoice.patient_number || 'N/A';
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
      doc.text(invoice.patient_name || 'Unknown Patient', 60, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Patient ID:', 120, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.patient_id_display || 'N/A', 160, yPosition + 5);
      
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
    
    // Service details with proper text wrapping (MATCHING FINANCE LOGIC)
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
      // For lab reports, use the exact same logic as finance component
      const testName = invoice.test_name || invoice.description || 'Laboratory Service';
      const description = `Lab Test: ${testName}`;
      
      // Apply text wrapping for lab test descriptions (EXACT MATCH WITH FINANCE)
      const maxWidth = pageWidth - 90; // Leave space for amount column
      const wrappedText = doc.splitTextToSize(description, maxWidth);
      const textHeight = wrappedText.length * 5;
      
      doc.text(wrappedText, 20, yPosition);
      doc.text(formatPkrAmount(invoice.displayAmount || invoice.amount || 0), pageWidth - 50, yPosition);
      
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
        doc.text(formatPkrAmount(invoice.displayAmount || invoice.amount || 0), pageWidth - 50, yPosition);
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
    doc.text(formatPkrAmount(invoice.displayAmount || invoice.amount || 0), totalsX + 5, yPosition + 12);
    
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

  const handleDownloadPDF = async (invoice: any) => {
    try {
      if (invoice.type === 'pharmacy') {
        await generatePharmacyInvoicePDF(invoice);
      } else if (invoice.type === 'lab') {
        // For lab invoices, fetch patient data first then use the same detailed PDF generation logic as finance
        const [patientRes, patientProfileRes] = await Promise.all([
          supabase.from('patients').select('patient_number').eq('id', invoice.patient_id).single(),
          supabase.from('profiles').select('first_name, last_name').eq('id', invoice.patient_id).single()
        ]);

        await generateDetailedInvoicePDF({
          ...invoice,
          test_name: invoice.description || 'Laboratory Service',
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

        // Import the generateXrayInvoicePDF function
        const { generateXrayInvoicePDF } = await import('@/utils/pdfGenerator');
        
        await generateXrayInvoicePDF({
          invoiceNumber: invoice.invoice_number,
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

        const otInvoiceData = {
          invoiceNumber: invoice.invoice_number,
          patientName: invoice.patient_name || 'Unknown Patient',
          patientId: invoice.patient_id_display || 'N/A',
          patientPhone: 'Not provided', // Not available in this context
          doctorName: invoice.doctor_name || 'Unknown Doctor',
          procedure: invoice.operation_name || 'Surgery',
          room: invoice.room_name || 'Unknown Room',
          date: format(new Date(invoice.operation_date || invoice.created_at), 'MMM dd, yyyy'),
          totalAmount: invoice.total_cost || 0,
          items: items
        };

        await generateOTPDF(otInvoiceData);
      } else {
        await generateInvoicePDF(invoice);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointments':
        return <Receipt className="w-4 h-4 text-blue-500" />;
      case 'pharmacy':
        return <Receipt className="w-4 h-4 text-green-500" />;
      case 'lab':
        return <TestTube className="w-4 h-4 text-purple-500" />;
      case 'xray':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'ot':
        return <Building2 className="w-4 h-4 text-red-500" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      appointments: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Appointments' },
      pharmacy: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Pharmacy' },
      lab: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Lab' },
      xray: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', label: 'X-ray' },
      ot: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'OT' }
    };
    
    const { color, label } = config[type as keyof typeof config] || config.appointments;
    return <Badge className={color}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      paid: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Pending' },
      overdue: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Overdue' }
    };
    
    const { color, label } = config[status as keyof typeof config] || config.pending;
    return <Badge className={color}>{label}</Badge>;
  };

  const isLoading = hospitalLoading || xrayLoading || labLoading || otLoading;
  const totalAmount = allInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allInvoices.length}</div>
            <p className="text-xs text-muted-foreground">All invoice types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Invoices</CardTitle>
            <TestTube className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {allInvoices.filter(inv => inv.type === 'lab').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPkrAmount(allInvoices.filter(inv => inv.type === 'lab').reduce((sum, inv) => sum + Number(inv.amount), 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OT Invoices</CardTitle>
            <Building2 className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {allInvoices.filter(inv => inv.type === 'ot').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPkrAmount(allInvoices.filter(inv => inv.type === 'ot').reduce((sum, inv) => sum + Number(inv.amount), 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">X-ray Invoices</CardTitle>
            <Zap className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {allInvoices.filter(inv => inv.type === 'xray').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPkrAmount(allInvoices.filter(inv => inv.type === 'xray').reduce((sum, inv) => sum + Number(inv.amount), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="appointments">Appointments</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
                <SelectItem value="ot">Operation Theater</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-10 w-full sm:w-48"
              />
            </div>

            {(searchTerm || filterType !== "all" || filterDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterDate("");
                  setCurrentPage(1);
                }}
                className="px-3"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={`${invoice.type}-${invoice.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(invoice.type)}
                          <span className="font-medium">{invoice.invoice_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {invoice.patient_id_display || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(invoice.type)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{invoice.display_date}</div>
                          <div className="text-gray-500">{invoice.display_time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{invoice.display_amount}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          View PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                      {searchTerm || filterType !== "all" || filterDate 
                        ? "No invoices match your search criteria" 
                        : "No invoices found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}