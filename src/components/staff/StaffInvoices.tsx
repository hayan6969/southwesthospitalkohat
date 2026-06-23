import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, FileText, Receipt, TestTube, Building2, Eye, Download, ChevronLeft, ChevronRight, Zap, X, Pencil, Loader2 } from "lucide-react";
import { useInvoices } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { generateInvoicePDF, generateInvoiceThermalPDF, generateLabInvoicePDF, generateLabInvoiceA4PDF, generateXrayInvoicePDF, generateXrayInvoiceA4PDF, generateOTPDF, generateOTA4PDF } from "@/utils/pdfGenerator";
import { generatePharmacyInvoicePDF, generatePharmacyInvoiceA4PDF } from "@/utils/pharmacyPdfGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getHospitalInvoiceType, hasMatchingOtHospitalInvoice, deduplicateInvoices } from "@/utils/invoiceDeduplication";
import { EDITABLE_INVOICE_TYPES, isInvoiceEditable, formatEditWindowRemaining, INVOICE_EDIT_WINDOW_HOURS } from "@/utils/invoiceEdit";

export function StaffInvoices() {
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();

  // Edit-within-window state (lab / x-ray / consultation invoices, first 2 hours)
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", description: "", due_date: "" });
  const [editTestId, setEditTestId] = useState<string>("");   // x-ray: selected catalog test
  const [savingEdit, setSavingEdit] = useState(false);

  // X-ray test catalog — used to re-pick a wrongly-selected test in the edit dialog.
  const { data: xrayTests } = useQuery({
    queryKey: ["xray-tests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("xray_tests").select("id, name, price").order("name");
      if (error) throw error;
      return data as { id: string; name: string; price: number }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const openEdit = (invoice: any) => {
    setEditingInvoice(invoice);
    setEditTestId(invoice.source === "xray_report" ? (invoice.test_id ?? "") : "");
    setLabSelectedTestIds([]);   // re-seeded from the linked order once it loads
    setLabTestSearch("");
    setEditForm({
      amount: String(invoice.amount ?? invoice.price ?? 0),
      // X-ray's visible "description" is its test name; everything else uses description.
      description: invoice.source === "xray_report"
        ? (invoice.test_name ?? "")
        : (invoice.description ?? ""),
      due_date: invoice.due_date ? String(invoice.due_date).slice(0, 10) : "",
    });
  };

  // When a different X-ray test is chosen, swap the name and auto-fill its price
  // (price stays editable afterwards in case of a manual adjustment/discount).
  const onPickXrayTest = (testId: string) => {
    setEditTestId(testId);
    const t = xrayTests?.find((x) => x.id === testId);
    if (t) setEditForm((f) => ({ ...f, description: t.name, amount: String(t.price ?? 0) }));
  };

  // ── Lab (pathology) invoices: re-pick tests via checkbox + search ───────────
  const [labTestSearch, setLabTestSearch] = useState("");
  const [labSelectedTestIds, setLabSelectedTestIds] = useState<string[]>([]);

  // Lab test catalog (priced).
  const { data: labTestTypes } = useQuery({
    queryKey: ["lab_test_types_priced"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_types")
        .select("id, name, price, report_category")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as { id: string; name: string; price: number; report_category: string | null }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // The pathology order linked to the invoice being edited — its items are the
  // currently-selected lab tests. Present only for lab/pathology invoices.
  const { data: labOrder, isLoading: labOrderLoading } = useQuery({
    queryKey: ["invoice-lab-order", editingInvoice?.id],
    enabled: !!editingInvoice && editingInvoice.source === "invoice",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pathology_orders")
        .select("id, invoice_id, lab_pathology_order_items(test_type_id, price)")
        .eq("invoice_id", editingInvoice.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; lab_pathology_order_items: { test_type_id: string; price: number }[] } | null;
    },
  });

  const isLabOrderInvoice = !!labOrder;

  // Seed the checkbox selection from the order's existing items.
  useEffect(() => {
    if (labOrder?.lab_pathology_order_items) {
      setLabSelectedTestIds(labOrder.lab_pathology_order_items.map((it) => it.test_type_id));
    }
  }, [labOrder]);

  const labFilteredTests = useMemo(() => {
    const list = labTestTypes ?? [];
    const q = labTestSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => t.name.toLowerCase().includes(q) || (t.report_category ?? "").toLowerCase().includes(q));
  }, [labTestTypes, labTestSearch]);

  const labTotal = useMemo(() => {
    const list = labTestTypes ?? [];
    return labSelectedTestIds.reduce((sum, id) => sum + Number(list.find((t) => t.id === id)?.price ?? 0), 0);
  }, [labSelectedTestIds, labTestTypes]);

  const toggleLabTest = (id: string) =>
    setLabSelectedTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const saveLabTests = async () => {
    if (!editingInvoice || !labOrder || savingEdit) return;
    if (labSelectedTestIds.length === 0) { toast.error("Select at least one test"); return; }
    if (!isInvoiceEditable(editingInvoice.created_at)) {
      toast.error(`Edit window (${INVOICE_EDIT_WINDOW_HOURS} hours) has expired`);
      setEditingInvoice(null);
      return;
    }
    const list = labTestTypes ?? [];
    const chosen = labSelectedTestIds
      .map((id) => list.find((t) => t.id === id))
      .filter(Boolean) as { id: string; name: string; price: number }[];
    const total = chosen.reduce((s, t) => s + Number(t.price ?? 0), 0);
    const names = chosen.map((t) => t.name).join(", ");
    setSavingEdit(true);
    try {
      const { error: invErr } = await supabase
        .from("invoices")
        .update({ amount: total, description: `Lab: ${names}` })
        .eq("id", editingInvoice.id);
      if (invErr) throw invErr;

      const { error: ordErr } = await supabase
        .from("lab_pathology_orders")
        .update({ total_amount: total })
        .eq("id", labOrder.id);
      if (ordErr) throw ordErr;

      // Replace the order's test items with the new selection.
      const { error: delErr } = await supabase
        .from("lab_pathology_order_items")
        .delete()
        .eq("order_id", labOrder.id);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from("lab_pathology_order_items")
        .insert(chosen.map((t) => ({
          order_id: labOrder.id,
          test_type_id: t.id,
          test_name_snapshot: t.name,
          price: Number(t.price ?? 0),
        })));
      if (insErr) throw insErr;

      toast.success("Lab tests updated");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-lab-order", editingInvoice.id] });
      queryClient.invalidateQueries({ queryKey: ["pathology_orders_recent"] });
      setEditingInvoice(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update lab tests");
    } finally {
      setSavingEdit(false);
    }
  };

  const saveEdit = async () => {
    if (!editingInvoice || savingEdit) return;
    // Re-check the window at save time so a stale tab can't edit past 2 hours.
    if (!isInvoiceEditable(editingInvoice.created_at)) {
      toast.error(`Edit window (${INVOICE_EDIT_WINDOW_HOURS} hours) has expired`);
      setEditingInvoice(null);
      return;
    }
    // Lab/pathology invoice → save the re-picked test selection instead.
    if (isLabOrderInvoice) { await saveLabTests(); return; }
    const amt = parseFloat(editForm.amount);
    if (isNaN(amt) || amt < 0) { toast.error("Enter a valid amount"); return; }
    if (!editForm.description.trim()) { toast.error("Description is required"); return; }
    setSavingEdit(true);
    try {
      if (editingInvoice.source === "xray_report") {
        const update: Record<string, any> = { price: amt, test_name: editForm.description.trim() };
        if (editTestId) update.test_id = editTestId;   // re-link to the corrected catalog test
        const { error } = await supabase
          .from("xray_reports")
          .update(update)
          .eq("id", editingInvoice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("invoices")
          .update({
            amount: amt,
            description: editForm.description.trim(),
            due_date: editForm.due_date || null,
          })
          .eq("id", editingInvoice.id);
        if (error) throw error;
      }
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["xray-reports-staff"] });
      setEditingInvoice(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update invoice");
    } finally {
      setSavingEdit(false);
    }
  };

  // Fetch hospital invoices
  const { data: hospitalInvoices, isLoading: hospitalLoading } = useInvoices();
  const { data: patientNames } = usePatientNames();

  // Fetch X-ray reports without linked invoices to avoid duplicates in invoice lists
  const { data: xrayReports, isLoading: xrayLoading } = useQuery({
    queryKey: ['xray-reports-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xray_reports')
        .select('*')
        .is('invoice_id', null)
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
    const unmatchedOtSchedules =
      otSchedules?.filter((otSchedule) => !hasMatchingOtHospitalInvoice(otSchedule, hospitalInvoices || [])) || [];

    // Deduplicate hospital invoices first
    const dedupedHospitalInvoices = deduplicateInvoices(hospitalInvoices || []);

    // Process all invoices and categorize them by invoice number prefix
    if (dedupedHospitalInvoices.length > 0) {
      dedupedHospitalInvoices.forEach(invoice => {
        const hospitalType = getHospitalInvoiceType(invoice);
        const type = hospitalType === 'appointment' ? 'appointments' : hospitalType;

        combined.push({
          ...invoice,
          source: 'invoice',
          type,
          invoice_type: type,
          invoice_date: invoice.created_at,
          patient_name: getPatientName(invoice.patient_id, patientNames || []),
          patient_id_display: invoice.patient?.patient_number || 'N/A',
          display_date: format(new Date(invoice.created_at), 'MMM d, yyyy'),
          display_time: format(new Date(invoice.created_at), 'h:mm a'),
          display_amount: formatPkrAmount(invoice.amount)
        });
      });
    }

    // Lab reports are already included in hospitalInvoices as LAB- prefixed invoices
    // No need to add them separately since they would create duplicates

    // Add X-ray reports without a linked invoice
    if (xrayReports) {
      xrayReports.forEach(xrayReport => {
        const patientName = getPatientName(xrayReport.patient_id, patientNames || []);
        const patient = allPatients?.find(p => p.id === xrayReport.patient_id);

        combined.push({
          ...xrayReport,
          source: 'xray_report',
          type: 'xray',
          invoice_type: 'xray',
          invoice_date: xrayReport.created_at,
          patient_name: patientName || 'Walk-in Patient',
          patient_id_display: patient?.patient_number || 'N/A',
          display_date: format(new Date(xrayReport.created_at), 'MMM d, yyyy'),
          display_time: format(new Date(xrayReport.created_at), 'h:mm a'),
          display_amount: formatPkrAmount(xrayReport.price || 0),
          amount: xrayReport.price || 0,
          invoice_number: `XR-${xrayReport.id.slice(-8).toUpperCase()}`,
          description: `X-ray: ${xrayReport.test_name}`,
          status: xrayReport.status === 'completed' ? 'paid' : 'pending'
        });
      });
    }

    // Add OT schedules only when there isn't already a generated OT invoice
    unmatchedOtSchedules.forEach(otSchedule => {
      const patientName = getPatientName(otSchedule.patient_id, patientNames || []);
      const patient = allPatients?.find(p => p.id === otSchedule.patient_id);

      combined.push({
        ...otSchedule,
        source: 'ot_schedule',
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
        displayAmount: otSchedule.total_cost || 0,
        displayNumber: `OT-${otSchedule.id.slice(-8).toUpperCase()}`,
        displayDate: otSchedule.created_at,
        displayStatus: otSchedule.status,
        operation_date: otSchedule.operation_date || otSchedule.created_at,
        doctor_name: otSchedule.doctor_name,
        notes: otSchedule.notes,
        ot_notes: otSchedule.ot_notes,
        doctor_expense: otSchedule.doctor_expense,
        operation_name: otSchedule.ot_operations?.operation_name,
        ot_expenses: otExpenses?.filter(expense => expense.operation_id === otSchedule.operation_id) || [],
        room_name: otSchedule.ot_rooms?.room_name
      });
    });

    return combined.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
  }, [hospitalInvoices, patientNames, labReports, xrayReports, otSchedules, allPatients, otExpenses]);

  // Filter and paginate invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(invoice => {
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Get patient number for matching
      const patientData = allPatients?.find(p => p.id === invoice.patient_id);
      const patientNumber = patientData?.patient_number?.toLowerCase() || '';
      
      // Get phone from patientNames
      const patientProfile = patientNames?.find((p: any) => p.id === invoice.patient_id);
      const phone = patientProfile?.phone || '';
      const emailPhone = patientProfile?.email?.match(/^(\d+)@patient\.local$/)?.[1] || '';
      
      const matchesSearch = !searchTerm || 
        invoice.patient_name?.toLowerCase().includes(searchLower) ||
        invoice.invoice_number?.toLowerCase().includes(searchLower) ||
        invoice.description?.toLowerCase().includes(searchLower) ||
        patientNumber.includes(searchLower) ||
        phone.includes(searchLower) ||
        emailPhone.includes(searchLower);

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

  const printInvoice = async (invoice: any, mode: 'a4' | 'thermal' = 'a4') => {
    try {
      if (invoice.type === 'pharmacy') {
        if (mode === 'thermal') await generatePharmacyInvoicePDF(invoice);
        else await generatePharmacyInvoiceA4PDF(invoice);
      } else if (invoice.type === 'lab') {
        // For lab invoices, fetch patient data first
        const [patientRes, patientProfileRes] = await Promise.all([
          supabase.from('patients').select('patient_number').eq('id', invoice.patient_id).single(),
          supabase.from('profiles').select('first_name, last_name, phone').eq('id', invoice.patient_id).single()
        ]);
        const prof = patientProfileRes.data;
        const labData = {
          invoiceNumber: invoice.invoice_number,
          patientName: prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Walk-in Patient',
          patientEmail: '',
          patientId: patientRes.data?.patient_number || 'Walk-in',
          patientPhone: prof?.phone || '',
          tests: [{ name: invoice.description || 'Laboratory Service', price: invoice.amount || invoice.price || 0 }],
          totalAmount: invoice.amount || invoice.price || 0,
          issueDate: format(new Date(invoice.created_at), 'dd-MMM-yyyy'),
          createdBy: invoice.created_by,
        };
        if (mode === 'thermal') await generateLabInvoicePDF(labData);
        else await generateLabInvoiceA4PDF(labData);
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

        const xrayData = {
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
          notes: invoice.notes,
          createdBy: invoice.created_by
        };
        if (mode === 'thermal') await generateXrayInvoicePDF(xrayData);
        else await generateXrayInvoiceA4PDF(xrayData);
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
          items: items,
          createdBy: invoice.created_by
        };

        if (mode === 'thermal') await generateOTPDF(otInvoiceData);
        else await generateOTA4PDF(otInvoiceData);
      } else {
        // For consultation/appointment invoices, fetch proper patient data
        const [patientRes, patientProfileRes] = await Promise.all([
          supabase.from('patients').select('patient_number, cnic').eq('id', invoice.patient_id).single(),
          supabase.from('profiles').select('first_name, last_name, phone, email').eq('id', invoice.patient_id).single()
        ]);

        const properInvoice = {
          ...invoice,
          amount: typeof invoice.amount === 'number' ? invoice.amount : 0,
          patient: {
            patient_number: patientRes.data?.patient_number || 'N/A',
            cnic: patientRes.data?.cnic || null,
            users: {
              first_name: patientProfileRes.data?.first_name || '',
              last_name: patientProfileRes.data?.last_name || '',
              email: patientProfileRes.data?.email || '',
              phone: patientProfileRes.data?.phone || ''
            }
          }
        };

        if (mode === 'thermal') await generateInvoiceThermalPDF(properInvoice);
        else await generateInvoicePDF(properInvoice);
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
      case 'emergency':
        return <Zap className="w-4 h-4 text-red-500" />;
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
      emergency: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Emergency' },
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
                <SelectItem value="emergency">Emergency</SelectItem>
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
                        <div className="flex items-center gap-1">
                          {EDITABLE_INVOICE_TYPES.includes(invoice.type) && isInvoiceEditable(invoice.created_at) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(invoice)}
                              className="flex items-center gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                              title={formatEditWindowRemaining(invoice.created_at) || "Edit invoice"}
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printInvoice(invoice, 'a4')}
                            className="flex items-center gap-1"
                            title="Full-page A4 invoice"
                          >
                            <FileText className="w-3 h-3" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printInvoice(invoice, 'thermal')}
                            className="flex items-center gap-1"
                            title="80mm thermal receipt"
                          >
                            <Receipt className="w-3 h-3" />
                            Thermal
                          </Button>
                        </div>
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

      {/* Edit invoice (within the 2-hour correction window) */}
      <Dialog open={!!editingInvoice} onOpenChange={(o) => { if (!o) setEditingInvoice(null); }}>
        <DialogContent className="sm:max-w-[440px] z-[9999]">
          <DialogHeader>
            <DialogTitle>Edit Invoice {editingInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {editingInvoice && (
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                You can edit this invoice for {formatEditWindowRemaining(editingInvoice.created_at) || "a short time"} after creation.
              </div>

              {editingInvoice.source === "invoice" && labOrderLoading ? (
                <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : isLabOrderInvoice ? (
                <>
                  <div className="space-y-2">
                    <Label>Tests</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search lab tests..."
                        value={labTestSearch}
                        onChange={(e) => setLabTestSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                      {labFilteredTests.map((t) => {
                        const checked = labSelectedTestIds.includes(t.id);
                        return (
                          <label key={t.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
                            <Checkbox checked={checked} onCheckedChange={() => toggleLabTest(t.id)} />
                            <span className="flex-1 text-sm">{t.name}</span>
                            <span className="text-sm font-medium">{formatPkrAmount(Number(t.price ?? 0))}</span>
                          </label>
                        );
                      })}
                      {labFilteredTests.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">No tests found</div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tick the correct tests — the amount and the order are updated automatically.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <span>Selected: <b>{labSelectedTestIds.length}</b></span>
                    <span>Total: <b>{formatPkrAmount(labTotal)}</b></span>
                  </div>
                </>
              ) : (
                <>
                  {editingInvoice.source === "xray_report" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-xray-test">Test</Label>
                      <Select value={editTestId} onValueChange={onPickXrayTest}>
                        <SelectTrigger id="edit-xray-test">
                          <SelectValue placeholder="Select the correct test" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000] max-h-[260px]">
                          {xrayTests?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} — {formatPkrAmount(t.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Pick the correct test to fix a wrong selection — the price fills in automatically (you can still adjust it).
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-amount">Amount (PKR)</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">
                      {editingInvoice.source === "xray_report" ? "Test name (as printed)" : "Description"}
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Service description..."
                    />
                  </div>

                  {editingInvoice.source !== "xray_report" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-due-date">Due Date (Optional)</Label>
                      <Input
                        id="edit-due-date"
                        type="date"
                        value={editForm.due_date}
                        onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInvoice(null)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit || (editingInvoice?.source === "invoice" && labOrderLoading)}>
              {savingEdit ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}