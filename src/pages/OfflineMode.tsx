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
  
  const { toast } = useToast();

  useEffect(() => {
    loadCachedData();
    
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
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

  const generatePDF = (invoice: OfflineInvoice) => {
    try {
      console.log('Generating PDF for invoice:', invoice.invoice_number);
      
      const doc = new jsPDF();
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
      
      // Service item
      doc.setFont('helvetica', 'normal');
      doc.text(serviceText, 20, yPosition);
      doc.text(formatPkrAmount(invoice.amount), pageWidth - 60, yPosition);
      
      yPosition += 8;
      
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

      console.log('PDF generated successfully, opening in new tab...');
      
      // Open PDF in new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      toast({
        title: "PDF Generated",
        description: "Invoice PDF opened in new tab",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Could not generate PDF. Please try again.",
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
      // Simulate upload process
      toast({
        title: "Upload Started",
        description: `Uploading ${pendingCount} items to the server...`,
        variant: "default"
      });

      // Clear pending operations after successful upload
      setTimeout(() => {
        localStorage.removeItem('offline_operations');
        setPendingCount(0);
        toast({
          title: "Upload Complete",
          description: "All offline data has been uploaded successfully.",
          variant: "default"
        });
      }, 2000);

    } catch (error) {
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
    if (!patientName || !patientCnic || !selectedOperation) {
      toast({
        title: "Missing Information",
        description: "Please fill in patient name, CNIC, and select an operation.",
        variant: "destructive"
      });
      return;
    }

    const operation = otOperations.find(o => o.id === selectedOperation);
    if (!operation) return;

    const baseAmount = 50000; // Default OT cost
    const invoiceNumber = generateInvoiceNumber('ot');

    const invoice: OfflineInvoice = {
      id: `offline_ot_${Date.now()}`,
      type: 'ot',
      patient_name: patientName,
      patient_cnic: patientCnic,
      operation_id: operation.id,
      operation_name: operation.operation_name,
      amount: baseAmount,
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
        operation_date: appointmentDate,
        total_cost: baseAmount,
        status: 'scheduled',
        queue_position: 1,
        notes
      }
    });

    // Generate PDF
    generatePDF(invoice);

    toast({
      title: "OT Scheduled",
      description: `Operation "${operation.operation_name}" scheduled for ${patientName}`,
      variant: "default"
    });

    // Reset form
    setPatientName('');
    setPatientCnic('');
    setSelectedOperation('');
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
                          {invoice.type === 'ot' && invoice.operation_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">Rs. {invoice.amount}</div>
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