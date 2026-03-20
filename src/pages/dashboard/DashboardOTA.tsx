import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MySupplyRequests } from "@/components/inventory/MySupplyRequests";
import { Calendar, User, Building2, Clock, FileText, Edit, Search, Filter, ClipboardList, TrendingUp, ClipboardCheck, TestTube, ShoppingCart, Printer } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OTNotesDialog } from "@/components/dialogs/OTNotesDialog";
import { PreOperationOrdersDialog } from "@/components/dialogs/PreOperationOrdersDialog";
import { TreatmentChartDialog } from "@/components/dialogs/TreatmentChartDialog";
import { PostOperativeProgressDialog } from "@/components/dialogs/PostOperativeProgressDialog";
import { AssessmentDialog } from "@/components/dialogs/AssessmentDialog";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/hooks/useAuth";
import { StaffLabReports } from "@/components/staff/StaffLabReports";
import AppLayout from "@/layouts/AppLayout";

interface OTScheduleWithDetails {
  id: string;
  operation_date: string;
  doctor_expense: number;
  total_cost: number;
  status: string;
  notes: string;
  queue_position: number;
  doctor_name: string;
  doctor_id: string;
  patient_id: string;
  room_id: string;
  patient: {
    patient_number: string;
    date_of_birth?: string;
    address?: string;
    profile: {
      first_name: string;
      last_name: string;
      phone: string;
    };
  };
  operation: {
    operation_name: string;
  };
  room: {
    room_name: string;
  };
  ot_notes?: any;
}

interface OTRoom {
  id: string;
  room_name: string;
  is_available: boolean;
}

export default function DashboardOTA() {
  const { profile, signOut } = useAuth();
  const [otSchedules, setOtSchedules] = useState<OTScheduleWithDetails[]>([]);
  const [otRooms, setOtRooms] = useState<OTRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPatientId, setSearchPatientId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [showOTNotesDialog, setShowOTNotesDialog] = useState(false);
  const [showPreOpOrdersDialog, setShowPreOpOrdersDialog] = useState(false);
  const [showTreatmentChartDialog, setShowTreatmentChartDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [selectedOT, setSelectedOT] = useState<OTScheduleWithDetails | null>(null);
  const [activeMainTab, setActiveMainTab] = useState("ot-operations");

  useEffect(() => {
    fetchOTRooms();
    fetchOTSchedules();
  }, []);

  useEffect(() => {
    fetchOTSchedules();
  }, [searchPatientId, selectedDate, selectedRoom]);

  const fetchOTRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('ot_rooms')
        .select('*')
        .order('room_name');

      if (error) throw error;
      setOtRooms(data || []);
      
      // Set to show all rooms by default
      if (data && data.length > 0) {
        setSelectedRoom("all");
      }
    } catch (error) {
      console.error('Error fetching OT rooms:', error);
      toast.error('Failed to load OT rooms');
    }
  };

  const fetchOTSchedules = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('ot_schedules')
        .select(`
          id,
          operation_date,
          doctor_expense,
          total_cost,
          status,
          notes,
          queue_position,
          doctor_name,
          doctor_id,
          patient_id,
          room_id,
          ot_notes,
          created_at,
          patient:patients (
            patient_number,
            date_of_birth,
            address,
            profiles (
              first_name,
              last_name,
              phone
            )
          ),
          operation:ot_operations (
            operation_name
          ),
          room:ot_rooms (
            room_name
          )
        `);

      // Apply filters
      if (selectedRoom && selectedRoom !== "" && selectedRoom !== "all") {
        query = query.eq('room_id', selectedRoom);
      }

      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        query = query.eq('operation_date', dateStr);
      }

      if (searchPatientId.trim()) {
        const term = searchPatientId.trim();
        
        // Search by patient number
        const { data: byNumber } = await supabase
          .from('patients')
          .select('id')
          .ilike('patient_number', `%${term}%`);
        
        // Search by patient name or phone in profiles
        const { data: byNameOrPhone } = await supabase
          .from('profiles')
          .select('id')
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`);
        
        // Combine unique patient IDs from both searches
        const patientIdSet = new Set<string>();
        byNumber?.forEach(p => patientIdSet.add(p.id));
        byNameOrPhone?.forEach(p => patientIdSet.add(p.id));
        
        if (patientIdSet.size > 0) {
          query = query.in('patient_id', Array.from(patientIdSet));
        } else {
          setOtSchedules([]);
          setLoading(false);
          return;
        }
      }

      query = query.order('operation_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(schedule => ({
        ...schedule,
        patient: {
          patient_number: schedule.patient?.patient_number || '',
          date_of_birth: schedule.patient?.date_of_birth || null,
          address: schedule.patient?.address || '',
          profile: {
            first_name: (schedule.patient?.profiles as any)?.first_name || '',
            last_name: (schedule.patient?.profiles as any)?.last_name || '',
            phone: (schedule.patient?.profiles as any)?.phone || ''
          }
        },
        operation: {
          operation_name: schedule.operation?.operation_name || ''
        },
        room: {
          room_name: schedule.room?.room_name || ''
        }
      })) || [];

      setOtSchedules(formattedData);

    } catch (error) {
      console.error('Error fetching OT schedules:', error);
      toast.error('Failed to load OT schedules');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-orange-100 text-orange-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleOTNotes = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowOTNotesDialog(true);
  };

  const handlePreOpOrders = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowPreOpOrdersDialog(true);
  };

  const clearFilters = () => {
    setSearchPatientId("");
    setSelectedDate(null);
    // Reset to show all rooms
    setSelectedRoom("all");
  };

  const handleTreatmentChart = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowTreatmentChartDialog(true);
  };

  const handleProgress = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowProgressDialog(true);
  };

  const handleAssessment = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowAssessmentDialog(true);
  };

  const pendingOTs = otSchedules.filter(ot => ot.status === 'pending' || ot.status === 'in_progress');
  const pastOTs = otSchedules.filter(ot => ot.status === 'completed' || ot.status === 'cancelled');

  return (
    <AppLayout>
         <div className="space-y-6">
           <div>
             <h2 className="text-2xl font-bold tracking-tight">OT Operations & Lab Management</h2>
             <p className="text-muted-foreground">Monitor and manage operating theater operations and lab reports</p>
           </div>

           {/* Main Tab Navigation */}
           <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ot-operations" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  OT Operations
                </TabsTrigger>
                <TabsTrigger value="lab-reports" className="flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  Lab Reports
                </TabsTrigger>
                <TabsTrigger value="supplies" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Supplies
                </TabsTrigger>
              </TabsList>

             <TabsContent value="ot-operations" className="mt-6 space-y-6">{/* Wrap the existing OT content */}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{otSchedules.length}</div>
              <p className="text-xs text-muted-foreground">All operations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Operations</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOTs.length}</div>
              <p className="text-xs text-muted-foreground">Scheduled & In Progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Operations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastOTs.length}</div>
              <p className="text-xs text-muted-foreground">Finished operations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{otRooms.filter(r => r.is_available).length}</div>
              <p className="text-xs text-muted-foreground">Available rooms</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Patient</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ID, name, or phone..."
                    value={searchPatientId}
                    onChange={(e) => setSearchPatientId(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Date</label>
                <DatePicker 
                  date={selectedDate || undefined} 
                  onDateChange={(date) => setSelectedDate(date || null)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Room</label>
                <select 
                  value={selectedRoom} 
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Rooms</option>
                  {otRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OT Rooms Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Operations by Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            {otRooms.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No OT rooms found</h3>
                <p className="text-gray-500">Please contact admin to add OT rooms.</p>
              </div>
            ) : (
            <Tabs value={selectedRoom} onValueChange={setSelectedRoom} className="w-full">
              <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${otRooms.length}, 1fr)`}}>
                {otRooms.map((room) => (
                  <TabsTrigger key={room.id} value={room.id}>
                    {room.room_name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {otRooms.map((room) => (
                <TabsContent key={room.id} value={room.id} className="mt-4">
                  <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="pending">Pending Operations</TabsTrigger>
                      <TabsTrigger value="past">Past Operations</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="pending" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex space-x-4">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                            </div>
                          ))}
                        </div>
                      ) : pendingOTs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Operation</TableHead>
                                <TableHead>Doctor</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingOTs.map((ot) => (
                                <TableRow key={ot.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <div>
                                        <div className="font-medium">
                                          {format(new Date(ot.operation_date), 'MMM d, yyyy')}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {format(new Date(ot.operation_date), 'EEEE')}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <div>
                                        <div className="font-medium">
                                          {ot.patient.profile.first_name} {ot.patient.profile.last_name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {ot.patient.patient_number}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-medium">{ot.operation.operation_name}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{ot.doctor_name}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">#{ot.queue_position}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(ot.status)}>
                                      {ot.status}
                                    </Badge>
                                  </TableCell>
                                   <TableCell>
                                     <div className="flex gap-1.5 flex-wrap">
                                       {/* Step 1: Pre-Op Orders - All medical roles */}
                                       <Button 
                                         size="sm" 
                                         variant="outline"
                                         onClick={() => handlePreOpOrders(ot)}
                                         className="flex items-center gap-1 text-xs"
                                         title="Step 1: Pre-Operation Orders"
                                       >
                                         <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0">1</span>
                                         <ClipboardList className="w-3 h-3" />
                                         Pre-Op
                                       </Button>
                                       {/* Step 2: OT Notes - Doctor/OTA/Admin can edit, Nursing view only */}
                                       <Button 
                                         size="sm" 
                                         variant="outline"
                                         onClick={() => handleOTNotes(ot)}
                                         className="flex items-center gap-1 text-xs"
                                         title="Step 2: OT Notes (Surgical Details)"
                                       >
                                         <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold shrink-0">2</span>
                                         <Edit className="w-3 h-3" />
                                         {(profile?.role as string) === 'nursing' ? 'View Notes' : 'OT Notes'}
                                       </Button>
                                       {/* Step 3: Treatment Chart - Doctor/OTA can add */}
                                       {['doctor', 'ota', 'admin', 'staff', 'nursing'].includes(profile?.role as string) && (
                                         <Button 
                                           size="sm" 
                                           variant="outline"
                                           onClick={() => handleTreatmentChart(ot)}
                                           className="flex items-center gap-1 text-xs"
                                           title="Step 3: Treatment Chart (Dr/OTA can add)"
                                         >
                                           <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold shrink-0">3</span>
                                           <FileText className="w-3 h-3" />
                                           Treatment
                                         </Button>
                                       )}
                                       {/* Step 4: Assessment - Nursing/Admin can add */}
                                       {['nursing', 'admin', 'doctor', 'ota', 'staff'].includes(profile?.role as string) && (
                                         <Button 
                                           size="sm" 
                                           variant="outline"
                                           onClick={() => handleAssessment(ot)}
                                           className="flex items-center gap-1 text-xs"
                                           title="Step 4: Assessment (Nursing adds)"
                                         >
                                           <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold shrink-0">4</span>
                                           <ClipboardCheck className="w-3 h-3" />
                                           Assessment
                                         </Button>
                                       )}
                                       {/* Step 5: POPPR - Post-Op Progress */}
                                       {['staff', 'nursing', 'ota', 'doctor', 'admin'].includes(profile?.role as string) && (
                                         <Button 
                                           size="sm" 
                                           variant="outline"
                                           onClick={() => handleProgress(ot)}
                                           className="flex items-center gap-1 text-xs"
                                           title="Step 5: Post-Op Progress (POPPR)"
                                         >
                                           <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-bold shrink-0">5</span>
                                           <TrendingUp className="w-3 h-3" />
                                           POPPR
                                         </Button>
                                       )}
                                     </div>
                                    </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          No pending operations found for {room.room_name}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="past" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex space-x-4">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                            </div>
                          ))}
                        </div>
                      ) : pastOTs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Operation</TableHead>
                                <TableHead>Doctor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pastOTs.map((ot) => (
                                <TableRow key={ot.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <div>
                                        <div className="font-medium">
                                          {format(new Date(ot.operation_date), 'MMM d, yyyy')}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {format(new Date(ot.operation_date), 'EEEE')}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <div>
                                        <div className="font-medium">
                                          {ot.patient.profile.first_name} {ot.patient.profile.last_name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {ot.patient.patient_number}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-medium">{ot.operation.operation_name}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{ot.doctor_name}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(ot.status)}>
                                      {ot.status}
                                    </Badge>
                                  </TableCell>
                                   <TableCell>
                                     <div className="flex gap-1.5 flex-wrap">
                                       <Button 
                                         size="sm" 
                                         variant="outline"
                                         onClick={() => handlePreOpOrders(ot)}
                                         className="flex items-center gap-1 text-xs"
                                       >
                                         <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0">1</span>
                                         <ClipboardList className="w-3 h-3" />
                                         Pre-Op
                                       </Button>
                                       <Button 
                                         size="sm" 
                                         variant="outline"
                                         onClick={() => handleOTNotes(ot)}
                                         className="flex items-center gap-1 text-xs"
                                       >
                                         <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold shrink-0">2</span>
                                         <Edit className="w-3 h-3" />
                                         {(profile?.role as string) === 'nursing' ? 'View Notes' : 'OT Notes'}
                                       </Button>
                                       {['doctor', 'ota', 'admin', 'staff', 'nursing'].includes(profile?.role as string) && (
                                         <Button 
                                           size="sm" 
                                           variant="outline"
                                           onClick={() => handleTreatmentChart(ot)}
                                           className="flex items-center gap-1 text-xs"
                                         >
                                           <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold shrink-0">3</span>
                                           <FileText className="w-3 h-3" />
                                           Treatment
                                         </Button>
                                       )}
                                       {['nursing', 'admin', 'doctor', 'ota', 'staff'].includes(profile?.role as string) && (
                                         <Button 
                                           size="sm" 
                                           variant="outline"
                                           onClick={() => handleAssessment(ot)}
                                           className="flex items-center gap-1 text-xs"
                                         >
                                           <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold shrink-0">4</span>
                                           <ClipboardCheck className="w-3 h-3" />
                                           Assessment
                                         </Button>
                                       )}
                                       {['staff', 'nursing', 'ota', 'doctor', 'admin'].includes(profile?.role as string) && (
                                         <Button 
                                           size="sm" 
                                           variant="outline"
                                           onClick={() => handleProgress(ot)}
                                           className="flex items-center gap-1 text-xs"
                                         >
                                           <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-bold shrink-0">5</span>
                                           <TrendingUp className="w-3 h-3" />
                                           POPPR
                                         </Button>
                                       )}
                                     </div>
                                    </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          No past operations found for {room.room_name}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              ))}
            </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Pre Operation Orders Dialog */}
        <PreOperationOrdersDialog 
          open={showPreOpOrdersDialog}
          onOpenChange={setShowPreOpOrdersDialog}
          otSchedule={selectedOT}
          onSave={fetchOTSchedules}
        />

        {/* OT Notes Dialog */}
        <OTNotesDialog 
          open={showOTNotesDialog}
          onOpenChange={setShowOTNotesDialog}
          otSchedule={selectedOT}
          onSave={fetchOTSchedules}
          readOnly={(profile?.role as string) === 'nursing'}
        />

        {/* Treatment Chart Dialog */}
        <TreatmentChartDialog 
          open={showTreatmentChartDialog}
          onOpenChange={setShowTreatmentChartDialog}
          otSchedule={selectedOT}
        />

        {/* Post Operative Progress Dialog */}
        <PostOperativeProgressDialog 
          open={showProgressDialog}
          onOpenChange={setShowProgressDialog}
          otSchedule={selectedOT}
        />

        {/* Assessment Dialog */}
        <AssessmentDialog 
          open={showAssessmentDialog}
          onOpenChange={setShowAssessmentDialog}
          otSchedule={selectedOT}
        />
              </TabsContent>

               <TabsContent value="lab-reports" className="mt-6">
                <StaffLabReports />
              </TabsContent>

              <TabsContent value="supplies" className="mt-6">
                <MySupplyRequests />
              </TabsContent>
            </Tabs>
          </div>
    </AppLayout>
    );
  }
