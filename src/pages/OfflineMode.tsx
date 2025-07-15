import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, UserPlus, Stethoscope, WifiOff, RefreshCw, Upload, CheckCircle, Wifi, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPkrAmount } from "@/utils/currency";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';

type Doctor = {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  consultation_fee: number;
};

type LabTest = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type OTOperation = {
  id: string;
  operation_name: string;
  expenses: {
    id: string;
    expense_name: string;
    cost: number;
  }[];
};

type OfflineInvoice = {
  id: string;
  type: 'consultation' | 'lab' | 'ot';
  patient_name: string;
  patient_cnic: string;
  doctor_id?: string;
  doctor_name?: string;
  doctor_fee?: number;
  test_id?: string;
  test_name?: string;
  operation_id?: string;
  operation_name?: string;
  amount: number;
  date: string;
  notes?: string;
  created_at: string;
  invoice_number: string;
  // OT specific pricing breakdown
  total_operation_cost?: number;
  hospital_amount?: number;
};

const OfflineMode = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [otOperations, setOTOperations] = useState<OTOperation[]>([]);
  const [offlineInvoices, setOfflineInvoices] = useState<OfflineInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientCnic, setPatientCnic] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedLabTest, setSelectedLabTest] = useState('');
  const [selectedOperation, setSelectedOperation] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // OT specific pricing states
  const [doctorFee, setDoctorFee] = useState('');
  const [selectedOTDoctor, setSelectedOTDoctor] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadCachedData();
    
    // If online, fetch fresh data and cache it
    if (isOnline) {
      fetchAndCacheData();
    }
    
    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true);
      // Fetch fresh data when coming back online
      fetchAndCacheData();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Update pending count when invoices change
    const pending = localStorage.getItem('offline_operations');
    if (pending) {
      try {
        const operations = JSON.parse(pending);
        setPendingCount(operations.length);
      } catch (error) {
        setPendingCount(0);
      }
    }
  }, [offlineInvoices]);

  const fetchAndCacheData = async () => {
    if (!isOnline) return;
    
    try {
      console.log('🔄 Fetching fresh data for offline mode...');
      
      // Fetch doctors with their profile information
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select(`
          id,
          consultation_fee,
          specialization,
          profiles!inner(first_name, last_name, role)
        `)
        .eq('profiles.role', 'doctor')
        .eq('profiles.is_active', true);

      if (doctorsError) {
        console.error('Error fetching doctors:', doctorsError);
      } else {
        const formattedDoctors = doctorsData.map(doctor => ({
          id: doctor.id,
          first_name: doctor.profiles.first_name,
          last_name: doctor.profiles.last_name,
          specialization: doctor.specialization || 'General',
          consultation_fee: doctor.consultation_fee || 0
        }));
        setDoctors(formattedDoctors);
        localStorage.setItem('cached_doctors', JSON.stringify(formattedDoctors));
        console.log('✅ Doctors cached:', formattedDoctors.length);
      }

      // Fetch lab tests
      const { data: labTestsData, error: labTestsError } = await supabase
        .from('lab_tests')
        .select('id, name, price, category')
        .order('name');

      if (labTestsError) {
        console.error('Error fetching lab tests:', labTestsError);
      } else {
        setLabTests(labTestsData);
        localStorage.setItem('cached_lab_tests', JSON.stringify(labTestsData));
        console.log('✅ Lab tests cached:', labTestsData.length);
      }

      // Fetch OT operations
      const { data: otOperationsData, error: otOperationsError } = await supabase
        .from('ot_operations')
        .select(`
          id, 
          operation_name,
          ot_expenses (
            id,
            expense_name,
            cost
          )
        `)
        .order('operation_name');

      if (otOperationsError) {
        console.error('Error fetching OT operations:', otOperationsError);
      } else {
        // Transform the data to match our expected structure
        const transformedOperations = otOperationsData?.map(op => ({
          id: op.id,
          operation_name: op.operation_name,
          expenses: op.ot_expenses || []
        })) || [];
        setOTOperations(transformedOperations);
        localStorage.setItem('cached_ot_operations', JSON.stringify(transformedOperations));
        console.log('✅ OT operations cached:', transformedOperations.length);
      }

      console.log('🎉 All data fetched and cached successfully');
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Data Sync Error",
        description: "Failed to sync latest data. Using cached version.",
        variant: "destructive"
      });
    }
  };

  const loadCachedData = () => {
    try {
      // Load doctors
      const cachedDoctors = localStorage.getItem('cached_doctors');
      if (cachedDoctors) {
        setDoctors(JSON.parse(cachedDoctors));
      }

      // Load lab tests
      const cachedLabTests = localStorage.getItem('cached_lab_tests');
      if (cachedLabTests) {
        setLabTests(JSON.parse(cachedLabTests));
      }

      // Load OT operations
      const cachedOTOperations = localStorage.getItem('cached_ot_operations');
      if (cachedOTOperations) {
        setOTOperations(JSON.parse(cachedOTOperations));
      }

      // Load offline invoices
      const cachedInvoices = localStorage.getItem('offline_invoices');
      if (cachedInvoices) {
        setOfflineInvoices(JSON.parse(cachedInvoices));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading cached data:', error);
      setLoading(false);
      toast({
        title: "Data Loading Error",
        description: "Failed to load cached data. Some features may not work.",
        variant: "destructive"
      });
    }
  };

  const generateInvoiceNumber = (type: string) => {
    const timestamp = Date.now();
    const prefix = type === 'consultation' ? 'CONS' : type === 'lab' ? 'LAB' : 'OT';
    return `${prefix}-${timestamp}`;
  };

  const saveOfflineInvoice = (invoice: OfflineInvoice) => {
    const updatedInvoices = [...offlineInvoices, invoice];
    setOfflineInvoices(updatedInvoices);
    localStorage.setItem('offline_invoices', JSON.stringify(updatedInvoices));
  };

  const addOfflineOperation = (operation: any) => {
    const existingOperations = localStorage.getItem('offline_operations');
    const operations = existingOperations ? JSON.parse(existingOperations) : [];
    operations.push({ ...operation, timestamp: Date.now() });
    localStorage.setItem('offline_operations', JSON.stringify(operations));
    setPendingCount(operations.length);
  };

  const generatePDF = async (invoice: OfflineInvoice) => {
    try {
      console.log('🚀 Starting PDF generation for invoice:', invoice.invoice_number);
      console.log('📄 Invoice data:', invoice);
      
      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const doc = new jsPDF();
      console.log('✅ jsPDF instance created successfully');
      
      const pageWidth = doc.internal.pageSize.width;
      let yPosition = 20;

      // Hospital header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Medical Center', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Healthcare District', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 6;
      doc.text('Phone: +92-XXX-XXXXXXX', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;
      
      // Invoice title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const title = invoice.type === 'consultation' ? 'CONSULTATION INVOICE' :
                    invoice.type === 'lab' ? 'LAB TEST INVOICE' : 'OT OPERATION INVOICE';
      doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;

      // Invoice details box
      doc.setDrawColor(0, 0, 0);
      doc.rect(15, yPosition - 5, pageWidth - 30, 50);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      
      // First row
      doc.text('Invoice Number:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.invoice_number, 70, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 120, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(invoice.created_at).toLocaleDateString(), 135, yPosition + 5);
      
      // Second row
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Name:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.patient_name, 70, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Patient CNIC:', 120, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.patient_cnic || 'N/A', 160, yPosition + 5);
      
      // Third row - Service details
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Service:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      let serviceText = '';
      if (invoice.type === 'consultation') {
        serviceText = `Consultation - Dr. ${invoice.doctor_name}`;
      } else if (invoice.type === 'lab') {
        serviceText = `Lab Test - ${invoice.test_name}`;
      } else {
        serviceText = `Operation - ${invoice.operation_name}`;
      }
      doc.text(serviceText, 60, yPosition + 5);
      
      yPosition += 50;

      // Service table
      const tableStartY = yPosition;
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Description', 20, yPosition + 7);
      doc.text('Amount', pageWidth - 60, yPosition + 7);
      
      yPosition += 15;
      
      // Service items
      doc.setFont('helvetica', 'normal');
      
      if (invoice.type === 'ot' && invoice.total_operation_cost && invoice.doctor_fee !== undefined) {
        // OT operation with detailed breakdown
        doc.text(`Operation - ${invoice.operation_name}`, 20, yPosition);
        doc.text(formatPkrAmount(invoice.total_operation_cost), pageWidth - 60, yPosition);
        yPosition += 8;
        
        // Doctor fee breakdown
        if (invoice.doctor_fee > 0) {
          doc.text(`  - Doctor Fee: ${invoice.doctor_name || 'Assigned Doctor'}`, 25, yPosition);
          doc.text(formatPkrAmount(invoice.doctor_fee), pageWidth - 60, yPosition);
          yPosition += 8;
        }
        
        // Hospital amount breakdown
        if (invoice.hospital_amount && invoice.hospital_amount > 0) {
          doc.text('  - Hospital Charges', 25, yPosition);
          doc.text(formatPkrAmount(invoice.hospital_amount), pageWidth - 60, yPosition);
          yPosition += 8;
        }
      } else {
        // Regular service item
        doc.text(serviceText, 20, yPosition);
        doc.text(formatPkrAmount(invoice.amount), pageWidth - 60, yPosition);
        yPosition += 8;
      }
      
      // Draw table border
      doc.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
      
      yPosition += 15;

      // Total section
      const totalsX = pageWidth - 85;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.rect(totalsX, yPosition - 5, 80, 18);
      doc.text('Total Amount:', totalsX + 5, yPosition + 4);
      doc.text(formatPkrAmount(invoice.amount), totalsX + 5, yPosition + 12);

      // Footer
      yPosition += 30;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for choosing our medical services!', pageWidth / 2, yPosition, { align: 'center' });

      console.log('📝 PDF content generated successfully');
      
      // Try to generate PDF blob
      const pdfBlob = doc.output('blob');
      console.log('💾 PDF blob created, size:', pdfBlob.size, 'bytes');
      
      // Create URL and try to open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      console.log('🔗 PDF URL created:', pdfUrl);
      
      // Try opening in new tab with focus
      const newWindow = window.open(pdfUrl, '_blank');
      
      if (newWindow) {
        console.log('✅ PDF opened in new tab successfully');
        newWindow.focus();
        
        // Clean up URL after some time
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          console.log('🧹 PDF URL cleaned up');
        }, 5000);
        
        toast({
          title: "PDF Generated",
          description: "Invoice PDF opened in new tab",
          variant: "default"
        });
      } else {
        console.log('⚠️ Popup blocked, trying alternative method');
        // Alternative method: download the file
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `invoice-${invoice.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pdfUrl);
        
        toast({
          title: "PDF Downloaded",
          description: "Invoice PDF has been downloaded to your device",
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed", 
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleUploadData = async () => {
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please connect to the internet to upload data.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get offline operations and invoices
      const operations = JSON.parse(localStorage.getItem('offline_operations') || '[]');
      const invoices = JSON.parse(localStorage.getItem('offline_invoices') || '[]');

      console.log('📦 Starting upload process...');
      console.log('📦 Operations to upload:', operations.length);
      console.log('📦 Invoices to upload:', invoices.length);
      console.log('📦 Operations data:', operations);

      if (operations.length === 0) {
        toast({
          title: "No Data to Upload",
          description: "No offline data found to upload.",
          variant: "default"
        });
        return;
      }

      toast({
        title: "Upload Started",
        description: `Uploading ${operations.length} items to the server...`,
        variant: "default"
      });

      // Use the special offline patient we created
      const offlinePatientId = '00000000-0000-0000-0000-000000000001';
      console.log('🔍 Using special offline patient for transactions...');
      
      const dummyPatient = { id: offlinePatientId };
      console.log('✅ Using offline patient:', dummyPatient);

      // Clear offline data BEFORE starting upload to prevent re-uploading on subsequent attempts
      console.log('🧹 Pre-clearing offline data to prevent duplicates...');
      const operationsToUpload = [...operations]; // Make a copy to work with
      localStorage.removeItem('offline_operations');
      localStorage.removeItem('offline_invoices');
      setPendingCount(0);
      setOfflineInvoices([]);
      
      // Upload operations to Supabase and create corresponding invoices
      for (const operation of operationsToUpload) {
        if (operation.table === 'appointments' && operation.action === 'insert') {
          // Create appointment record
          const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
              patient_id: dummyPatient.id,
              doctor_id: operation.data.doctor_id,
              appointment_date: new Date().toISOString(),
              type: operation.data.type || 'consultation',
              status: 'completed',
              consultation_fee_at_time: operation.data.consultation_fee,
              booking_type: 'offline',
              payment_status: 'paid',
              notes: `Offline Patient: ${operation.data.patient_name} (CNIC: ${operation.data.patient_cnic}). ${operation.data.notes || ''}`
            })
            .select()
            .single();

          if (appointmentError) {
            console.error('Error uploading appointment:', appointmentError);
          } else {
            // Create invoice for the appointment
            const invoiceAmount = parseFloat(operation.data.consultation_fee) || 0;
            const invoiceNumber = `INV-OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('💰 Creating appointment invoice:', {
              patient_id: dummyPatient.id,
              amount: invoiceAmount,
              status: 'paid',
              invoice_number: invoiceNumber,
              raw_consultation_fee: operation.data.consultation_fee,
              parsed_amount: invoiceAmount
            });
            
            const { data: createdInvoice, error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                patient_id: dummyPatient.id,
                amount: invoiceAmount,
                status: 'paid',
                invoice_number: invoiceNumber,
                description: `Offline Consultation - ${operation.data.patient_name}`,
                paid_at: new Date().toISOString(),
                due_date: null
              })
               .select()
               .single();

             if (invoiceError) {
               console.error('❌ Error creating appointment invoice:', invoiceError);
             } else {
               console.log('✅ Appointment invoice created successfully:', createdInvoice);
               
               // Create doctor payment record for the consultation
               if (operation.data.doctor_id && invoiceAmount > 0) {
                 console.log('💳 Creating doctor payment record...');
                 
                 // Check if doctor payment record already exists for this period
                 const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
                 const periodStart = `${currentMonth}-01`;
                 const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
                 
                 const { data: existingPayment } = await supabase
                   .from('doctor_payments')
                   .select('*')
                   .eq('doctor_id', operation.data.doctor_id)
                   .eq('period_start', periodStart)
                   .eq('period_end', periodEnd)
                   .single();
                 
                 if (existingPayment) {
                   // Update existing payment record
                   const { error: updateError } = await supabase
                     .from('doctor_payments')
                     .update({
                        appointment_count: existingPayment.appointment_count + 1,
                        consultation_earnings: parseFloat(existingPayment.consultation_earnings.toString()) + invoiceAmount,
                        total_earnings: parseFloat(existingPayment.total_earnings.toString()) + invoiceAmount
                     })
                     .eq('id', existingPayment.id);
                     
                   if (updateError) {
                     console.error('❌ Error updating doctor payment:', updateError);
                   } else {
                     console.log('✅ Doctor payment updated successfully');
                   }
                 } else {
                   // Create new payment record
                   const { error: paymentError } = await supabase
                     .from('doctor_payments')
                     .insert({
                       doctor_id: operation.data.doctor_id,
                       period_start: periodStart,
                       period_end: periodEnd,
                       appointment_count: 1,
                       ot_count: 0,
                       consultation_earnings: invoiceAmount,
                       ot_earnings: 0,
                       total_earnings: invoiceAmount,
                       payment_status: 'pending'
                     });
                     
                   if (paymentError) {
                     console.error('❌ Error creating doctor payment:', paymentError);
                   } else {
                     console.log('✅ Doctor payment record created successfully');
                   }
                 }
               }
             }
          }
        } else if (operation.table === 'lab_reports' && operation.action === 'insert') {
          // Create lab report record
          const { data: labReport, error: labError } = await supabase
            .from('lab_reports')
            .insert({
              patient_id: dummyPatient.id,
              test_id: operation.data.test_id,
              test_name: operation.data.test_name,
              external_doctor_name: `Offline Patient: ${operation.data.patient_name} (CNIC: ${operation.data.patient_cnic})`,
              price: operation.data.price,
              status: 'completed',
              test_date: new Date().toISOString(),
              notes: operation.data.notes || ''
            })
            .select()
            .single();

          if (labError) {
            console.error('Error uploading lab report:', labError);
          } else {
            // Create invoice for the lab report
            const invoiceAmount = parseFloat(operation.data.price) || 0;
            const invoiceNumber = `INV-OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('💰 Creating lab invoice:', {
              patient_id: dummyPatient.id,
              amount: invoiceAmount,
              status: 'paid',
              invoice_number: invoiceNumber,
              raw_price: operation.data.price,
              parsed_amount: invoiceAmount
            });
            
            const { data: createdInvoice, error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                patient_id: dummyPatient.id,
                amount: invoiceAmount,
                status: 'paid',
                invoice_number: invoiceNumber,
                description: `Offline Lab Test - ${operation.data.test_name} - ${operation.data.patient_name}`,
                paid_at: new Date().toISOString(),
                due_date: null
              })
              .select()
              .single();

            if (invoiceError) {
              console.error('❌ Error creating lab invoice:', invoiceError);
            } else {
              console.log('✅ Lab invoice created successfully:', createdInvoice);
            }
          }
        } else if (operation.table === 'ot_schedules' && operation.action === 'insert') {
          // Create OT schedule record with proper pricing
          const totalCost = parseFloat(operation.data.total_cost) || 0;
          const doctorExpense = parseFloat(operation.data.doctor_expense) || 0;
          const hospitalAmount = parseFloat(operation.data.hospital_amount) || 0;
          
          console.log('💊 Processing OT operation with pricing:', {
            total_cost: totalCost,
            doctor_expense: doctorExpense,
            hospital_amount: hospitalAmount,
            doctor_id: operation.data.doctor_id,
            operation_id: operation.data.operation_id
          });
          
          const { data: otSchedule, error: otError } = await supabase
            .from('ot_schedules')
            .insert({
              patient_id: dummyPatient.id,
              operation_id: operation.data.operation_id,
              doctor_id: operation.data.doctor_id || null,
              doctor_name: operation.data.doctor_id ? 
                `Dr. ${operation.data.doctor_name || 'Unknown'} | Offline Patient: ${operation.data.patient_name} (CNIC: ${operation.data.patient_cnic})` :
                `Offline Patient: ${operation.data.patient_name} (CNIC: ${operation.data.patient_cnic})`,
              operation_date: new Date().toISOString().split('T')[0],
              queue_position: 1,
              status: 'completed',
              total_cost: totalCost,
              doctor_expense: doctorExpense,
              notes: operation.data.notes || ''
            })
            .select()
            .single();

          if (otError) {
            console.error('Error uploading OT schedule:', otError);
          } else {
            console.log('✅ OT schedule created successfully:', otSchedule);
            
            // Create invoice for the OT operation (hospital portion only)
            const invoiceAmount = hospitalAmount;
            const invoiceNumber = `INV-OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('💰 Creating OT invoice (hospital portion):', {
              patient_id: dummyPatient.id,
              amount: invoiceAmount,
              status: 'paid',
              invoice_number: invoiceNumber,
              hospital_amount: hospitalAmount,
              doctor_expense: doctorExpense,
              total_cost: totalCost
            });
            
            const { data: createdInvoice, error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                patient_id: dummyPatient.id,
                amount: invoiceAmount,
                status: 'paid',
                invoice_number: invoiceNumber,
                description: `Offline OT Operation - ${operation.data.patient_name}`,
                paid_at: new Date().toISOString(),
                due_date: null
              })
              .select()
              .single();

            if (invoiceError) {
              console.error('❌ Error creating OT invoice:', invoiceError);
            } else {
              console.log('✅ OT invoice created successfully:', createdInvoice);
              
              // Create doctor payment record for OT if doctor is assigned
              if (operation.data.doctor_id && doctorExpense > 0) {
                console.log('💳 Creating doctor OT payment record...');
                
                const currentMonth = new Date().toISOString().slice(0, 7);
                const periodStart = `${currentMonth}-01`;
                const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
                
                const { data: existingPayment } = await supabase
                  .from('doctor_payments')
                  .select('*')
                  .eq('doctor_id', operation.data.doctor_id)
                  .eq('period_start', periodStart)
                  .eq('period_end', periodEnd)
                  .single();
                
                if (existingPayment) {
                  // Update existing payment record
                  const { error: updateError } = await supabase
                    .from('doctor_payments')
                    .update({
                      ot_count: existingPayment.ot_count + 1,
                      ot_earnings: parseFloat(existingPayment.ot_earnings.toString()) + doctorExpense,
                      total_earnings: parseFloat(existingPayment.total_earnings.toString()) + doctorExpense
                    })
                    .eq('id', existingPayment.id);
                    
                  if (updateError) {
                    console.error('❌ Error updating doctor OT payment:', updateError);
                  } else {
                    console.log('✅ Doctor OT payment updated successfully');
                  }
                } else {
                  // Create new payment record
                  const { error: paymentError } = await supabase
                    .from('doctor_payments')
                    .insert({
                      doctor_id: operation.data.doctor_id,
                      period_start: periodStart,
                      period_end: periodEnd,
                      appointment_count: 0,
                      ot_count: 1,
                      consultation_earnings: 0,
                      ot_earnings: doctorExpense,
                      total_earnings: doctorExpense,
                      payment_status: 'pending'
                    });
                    
                  if (paymentError) {
                    console.error('❌ Error creating doctor OT payment:', paymentError);
                  } else {
                    console.log('✅ Doctor OT payment record created successfully');
                  }
                }
              }
            }
          }
        }
      }

      // Final cleanup - ensure everything is cleared
      console.log('🧹 Final cleanup of any remaining offline data...');
      
      // Remove all offline-related items from localStorage
      localStorage.removeItem('offline_operations');
      localStorage.removeItem('offline_invoices');
      localStorage.removeItem('offline_pending_count');
      localStorage.removeItem('offline_patient_data');
      localStorage.removeItem('offline_selected_doctors');
      localStorage.removeItem('offline_selected_tests');
      localStorage.removeItem('offline_selected_operations');
      
      // Clear state variables
      setOfflineInvoices([]);
      setPendingCount(0);
      
      // Also clear any form data
      setPatientName('');
      setPatientCnic('');
      setSelectedDoctor('');
      setSelectedLabTest('');
      setSelectedOperation('');
      setNotes('');
      
      console.log('✅ All offline data cleared successfully');

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${operationsToUpload.length} items to the database. All offline data has been cleared from cache.`,
        variant: "default"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const createConsultationInvoice = async () => {
    if (!patientName || !patientCnic || !selectedDoctor) {
      toast({
        title: "Missing Information",
        description: "Please fill in patient name, CNIC, and select a doctor.",
        variant: "destructive"
      });
      return;
    }

    const doctor = doctors.find(d => d.id === selectedDoctor);
    if (!doctor) return;

    const invoiceNumber = generateInvoiceNumber('consultation');
    const invoice: OfflineInvoice = {
      id: `offline_consultation_${Date.now()}`,
      type: 'consultation',
      patient_name: patientName,
      patient_cnic: patientCnic,
      doctor_id: doctor.id,
      doctor_name: `${doctor.first_name} ${doctor.last_name}`,
      doctor_fee: doctor.consultation_fee,
      amount: doctor.consultation_fee,
      date: appointmentDate,
      notes,
      created_at: new Date().toISOString(),
      invoice_number: invoiceNumber
    };

    saveOfflineInvoice(invoice);

    // Add to offline sync queue
    addOfflineOperation({
      type: 'appointment',
      table: 'appointments',
      action: 'insert',
      data: {
        patient_name: patientName,
        patient_cnic: patientCnic,
        doctor_id: doctor.id,
        appointment_date: new Date(appointmentDate).toISOString(),
        type: 'consultation',
        status: 'scheduled',
        consultation_fee_at_time: doctor.consultation_fee,
        payment_status: 'paid',
        booking_type: 'offline',
        notes
      }
    });

    // Generate PDF
    generatePDF(invoice);

    toast({
      title: "Consultation Scheduled",
      description: `Appointment created for ${patientName} with Dr. ${doctor.first_name} ${doctor.last_name}`,
      variant: "default"
    });

    // Reset form
    setPatientName('');
    setPatientCnic('');
    setSelectedDoctor('');
    setNotes('');
  };

  const createLabOrderInvoice = async () => {
    if (!patientName || !patientCnic || !selectedLabTest) {
      toast({
        title: "Missing Information",
        description: "Please fill in patient name, CNIC, and select a lab test.",
        variant: "destructive"
      });
      return;
    }

    const labTest = labTests.find(t => t.id === selectedLabTest);
    if (!labTest) return;

    const invoiceNumber = generateInvoiceNumber('lab');
    const invoice: OfflineInvoice = {
      id: `offline_lab_${Date.now()}`,
      type: 'lab',
      patient_name: patientName,
      patient_cnic: patientCnic,
      test_id: labTest.id,
      test_name: labTest.name,
      amount: labTest.price,
      date: appointmentDate,
      notes,
      created_at: new Date().toISOString(),
      invoice_number: invoiceNumber
    };

    saveOfflineInvoice(invoice);

    // Add to offline sync queue
    addOfflineOperation({
      type: 'appointment',
      table: 'lab_reports',
      action: 'insert',
      data: {
        patient_name: patientName,
        patient_cnic: patientCnic,
        test_id: labTest.id,
        test_name: labTest.name,
        price: labTest.price,
        test_date: new Date(appointmentDate).toISOString(),
        status: 'pending',
        notes
      }
    });

    // Generate PDF
    generatePDF(invoice);

    toast({
      title: "Lab Order Created",
      description: `Lab test "${labTest.name}" ordered for ${patientName}`,
      variant: "default"
    });

    // Reset form
    setPatientName('');
    setPatientCnic('');
    setSelectedLabTest('');
    setNotes('');
  };

  const createOTScheduleInvoice = async () => {
    if (!patientName || !patientCnic || !selectedOperation || !doctorFee) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including doctor fee.",
        variant: "destructive"
      });
      return;
    }

    const operation = otOperations.find(o => o.id === selectedOperation);
    if (!operation) return;

    // Calculate costs correctly
    const hospitalCost = operation.expenses?.reduce((sum, exp) => sum + exp.cost, 0) || 0;
    const doctorAmount = parseFloat(doctorFee) || 0;
    const totalCost = hospitalCost + doctorAmount;

    // Validation
    if (hospitalCost <= 0) {
      toast({
        title: "Invalid Operation",
        description: "Selected operation has no expenses configured.",
        variant: "destructive"
      });
      return;
    }

    if (doctorAmount < 0) {
      toast({
        title: "Invalid Doctor Fee",
        description: "Doctor fee must be greater than or equal to 0.",
        variant: "destructive"
      });
      return;
    }

    const selectedOTDoctorData = selectedOTDoctor ? doctors.find(d => d.id === selectedOTDoctor) : null;
    const invoiceNumber = generateInvoiceNumber('ot');

    const invoice: OfflineInvoice = {
      id: `offline_ot_${Date.now()}`,
      type: 'ot',
      patient_name: patientName,
      patient_cnic: patientCnic,
      doctor_id: selectedOTDoctor || undefined,
      doctor_name: selectedOTDoctorData ? `${selectedOTDoctorData.first_name} ${selectedOTDoctorData.last_name}` : undefined,
      doctor_fee: doctorAmount,
      operation_id: operation.id,
      operation_name: operation.operation_name,
      amount: totalCost,
      total_operation_cost: totalCost,
      hospital_amount: hospitalCost,
      date: appointmentDate,
      notes,
      created_at: new Date().toISOString(),
      invoice_number: invoiceNumber
    };

    saveOfflineInvoice(invoice);

    // Add to offline sync queue
    addOfflineOperation({
      type: 'appointment',
      table: 'ot_schedules',
      action: 'insert',
      data: {
        patient_name: patientName,
        patient_cnic: patientCnic,
        operation_id: operation.id,
        doctor_id: selectedOTDoctor || null,
        doctor_name: selectedOTDoctorData ? `${selectedOTDoctorData.first_name} ${selectedOTDoctorData.last_name}` : null,
        operation_date: appointmentDate,
        total_cost: totalCost,
        doctor_expense: doctorAmount,
        hospital_amount: hospitalCost,
        status: 'scheduled',
        queue_position: 1,
        notes
      }
    });

    // Generate PDF
    generatePDF(invoice);

    toast({
      title: "OT Scheduled",
      description: `Operation "${operation.operation_name}" scheduled for ${patientName}. Total: Rs. ${totalCost}, Doctor: Rs. ${doctorAmount}, Hospital: Rs. ${hospitalCost}`,
      variant: "default"
    });

    // Reset form
    setPatientName('');
    setPatientCnic('');
    setSelectedOperation('');
    setSelectedOTDoctor('');
    setDoctorFee('');
    setNotes('');
  };

  const checkOnlineStatus = () => {
    if (isOnline) {
      window.location.href = '/dashboard/staff';
    } else {
      toast({
        title: "Still Offline",
        description: "Please check your internet connection and try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="w-8 h-8 text-orange-600" />
                <div>
                  <CardTitle className="text-orange-800">Offline Mode</CardTitle>
                  <CardDescription className="text-orange-600">
                    Limited functionality - Data will sync when online
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  {pendingCount} items pending sync
                </Badge>
                {isOnline && pendingCount > 0 && (
                  <Button 
                    onClick={handleUploadData}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Data to Server
                  </Button>
                )}
                <Button 
                  onClick={checkOnlineStatus}
                  variant="outline" 
                  className="text-orange-600 border-orange-300 hover:bg-orange-100"
                >
                  {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                  {isOnline ? 'Go Online' : 'Check Connection'}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="consultation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="consultation" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Consultation
            </TabsTrigger>
            <TabsTrigger value="lab" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Lab Orders
            </TabsTrigger>
            <TabsTrigger value="ot" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              OT Schedule
            </TabsTrigger>
          </TabsList>

          {/* Consultation Tab */}
          <TabsContent value="consultation">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Consultation</CardTitle>
                <CardDescription>Create appointment and generate invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patient-name">Patient Name</Label>
                    <Input
                      id="patient-name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter patient name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patient-cnic">Patient CNIC</Label>
                    <Input
                      id="patient-cnic"
                      value={patientCnic}
                      onChange={(e) => setPatientCnic(e.target.value)}
                      placeholder="12345-1234567-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="doctor">Select Doctor</Label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization} (Rs. {doctor.consultation_fee})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Appointment Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>

                <Button onClick={createConsultationInvoice} className="w-full">
                  Create Consultation Invoice
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lab Orders Tab */}
          <TabsContent value="lab">
            <Card>
              <CardHeader>
                <CardTitle>Create Lab Order</CardTitle>
                <CardDescription>Order lab tests and generate invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lab-patient-name">Patient Name</Label>
                    <Input
                      id="lab-patient-name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter patient name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lab-patient-cnic">Patient CNIC</Label>
                    <Input
                      id="lab-patient-cnic"
                      value={patientCnic}
                      onChange={(e) => setPatientCnic(e.target.value)}
                      placeholder="12345-1234567-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lab-test">Select Lab Test</Label>
                    <Select value={selectedLabTest} onValueChange={setSelectedLabTest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a lab test" />
                      </SelectTrigger>
                      <SelectContent>
                        {labTests.map((test) => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.name} - {test.category} (Rs. {test.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lab-date">Test Date</Label>
                    <Input
                      id="lab-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="lab-notes">Notes (Optional)</Label>
                  <Textarea
                    id="lab-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>

                <Button onClick={createLabOrderInvoice} className="w-full">
                  Create Lab Order Invoice
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OT Schedule Tab */}
          <TabsContent value="ot">
            <Card>
              <CardHeader>
                <CardTitle>Schedule OT Operation</CardTitle>
                <CardDescription>Schedule operation and generate invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ot-patient-name">Patient Name</Label>
                    <Input
                      id="ot-patient-name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter patient name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ot-patient-cnic">Patient CNIC</Label>
                    <Input
                      id="ot-patient-cnic"
                      value={patientCnic}
                      onChange={(e) => setPatientCnic(e.target.value)}
                      placeholder="12345-1234567-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="operation">Select Operation</Label>
                    <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an operation" />
                      </SelectTrigger>
                      <SelectContent>
                        {otOperations.map((operation) => (
                          <SelectItem key={operation.id} value={operation.id}>
                            {operation.operation_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ot-date">Operation Date</Label>
                    <Input
                      id="ot-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hospital-cost">Hospital Operation Cost (Rs.)</Label>
                    <Input
                      id="hospital-cost"
                      type="number"
                      value={selectedOperation ? 
                        otOperations.find(op => op.id === selectedOperation)?.expenses?.reduce((sum, exp) => sum + exp.cost, 0) || 0
                        : 0}
                      disabled
                      placeholder="Auto-calculated from operation expenses"
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="doctor-fee">Doctor Fee (Rs.)</Label>
                    <Input
                      id="doctor-fee"
                      type="number"
                      value={doctorFee}
                      onChange={(e) => setDoctorFee(e.target.value)}
                      placeholder="Enter doctor fee"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ot-doctor">Select Doctor (Optional)</Label>
                    <Select value={selectedOTDoctor} onValueChange={setSelectedOTDoctor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="total-cost">Total Cost (Rs.)</Label>
                    <Input
                      id="total-cost"
                      type="number"
                      value={selectedOperation && doctorFee ? 
                        ((otOperations.find(op => op.id === selectedOperation)?.expenses?.reduce((sum, exp) => sum + exp.cost, 0) || 0) + parseFloat(doctorFee)).toString() 
                        : selectedOperation ? 
                        (otOperations.find(op => op.id === selectedOperation)?.expenses?.reduce((sum, exp) => sum + exp.cost, 0) || 0).toString()
                        : ''}
                      disabled
                      placeholder="Hospital cost + Doctor fee"
                      className="bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="ot-notes">Notes (Optional)</Label>
                  <Textarea
                    id="ot-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>

                <Button onClick={createOTScheduleInvoice} className="w-full">
                  Create OT Schedule Invoice
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Offline Invoices */}
        {offlineInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Offline Invoices</CardTitle>
              <CardDescription>Invoices created in offline mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {offlineInvoices.slice(-5).reverse().map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{invoice.type}</Badge>
                      <div>
                        <div className="font-medium">{invoice.patient_name}</div>
                        <div className="text-sm text-gray-600">
                          {invoice.type === 'consultation' && `Dr. ${invoice.doctor_name}`}
                          {invoice.type === 'lab' && invoice.test_name}
                          {invoice.type === 'ot' && (
                            <div>
                              <div>{invoice.operation_name}</div>
                              {invoice.doctor_name && (
                                <div className="text-xs">Dr. {invoice.doctor_name}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">
                          Rs. {invoice.amount}
                          {invoice.type === 'ot' && invoice.doctor_fee !== undefined && invoice.hospital_amount && (
                            <div className="text-xs text-gray-500 font-normal">
                              Doctor: Rs. {invoice.doctor_fee} | Hospital: Rs. {invoice.hospital_amount}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{invoice.date}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generatePDF(invoice)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OfflineMode;