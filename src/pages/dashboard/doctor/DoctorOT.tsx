import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, User, Building2, Banknote, Clock, FileText, Edit, UserCheck, ClipboardList, TrendingUp, ClipboardCheck, Search, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { OTNotesDialog } from "@/components/dialogs/OTNotesDialog";
import { DischargeSlipDialog } from "@/components/dialogs/DischargeSlipDialog";
import { PreOperationOrdersDialog } from "@/components/dialogs/PreOperationOrdersDialog";
import { TreatmentChartDialog } from "@/components/dialogs/TreatmentChartDialog";
import { PostOperativeProgressDialog } from "@/components/dialogs/PostOperativeProgressDialog";
import { AssessmentDialog } from "@/components/dialogs/AssessmentDialog";
import { AnesthesiaNotesDialog } from "@/components/dialogs/AnesthesiaNotesDialog";
import { useToast } from "@/hooks/use-toast";
import { generateDischargeSlipPDF } from "@/utils/dischargeSlipPdfGenerator";

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

export default function DoctorOT() {
  const { profile } = useAuth();
  const { toast: useToastHook } = useToast();
  const [otSchedules, setOtSchedules] = useState<OTScheduleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  
  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Dialog states
  const [showOTNotesDialog, setShowOTNotesDialog] = useState(false);
  const [showDischargeDialog, setShowDischargeDialog] = useState(false);
  const [showPreOpOrdersDialog, setShowPreOpOrdersDialog] = useState(false);
  const [showTreatmentChartDialog, setShowTreatmentChartDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [showAnesthesiaDialog, setShowAnesthesiaDialog] = useState(false);
  const [selectedOT, setSelectedOT] = useState<OTScheduleWithDetails | null>(null);

  useEffect(() => {
    fetchDoctorOTSchedules();
  }, [profile?.id]);

  const fetchDoctorOTSchedules = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch all completed OT schedules for this doctor without pagination limit
      let allOTSchedules: any[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
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
          `)
          .eq('doctor_id', profile.id)
          .range(start, start + batchSize - 1)
          .order('operation_date', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          allOTSchedules = [...allOTSchedules, ...data];
          start += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      const formattedData = allOTSchedules?.map(schedule => ({
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

      // Calculate total earnings from completed OTs
      const completedOTs = formattedData.filter(ot => ot.status === 'completed');
      const totalEarned = completedOTs.reduce((sum, ot) => sum + ot.doctor_expense, 0);
      setTotalEarnings(totalEarned);

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

  const handleDischarge = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowDischargeDialog(true);
  };

  const handleDischargeSlip = async (ot: OTScheduleWithDetails) => {
    try {
      if (!ot.ot_notes?.dischargeSlip) {
        toast.error('No discharge slip data available');
        return;
      }

      await generateDischargeSlipPDF(ot.ot_notes.dischargeSlip);
    } catch (error) {
      console.error('Error generating discharge slip:', error);
      toast.error('Failed to generate discharge slip');
    }
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

  const handleAnesthesia = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowAnesthesiaDialog(true);
  };

  const upcomingOTs = otSchedules.filter(ot => ot.status === 'pending');

  // Filter and paginate completed operations
  const completedOTs = useMemo(() => {
    let filtered = otSchedules.filter(ot => ot.status === 'completed');
    
    // Apply search filter for patient ID (case insensitive)
    if (searchTerm.trim()) {
      filtered = filtered.filter(ot => 
        ot.patient.patient_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [otSchedules, searchTerm]);

  // Paginated completed operations
  const paginatedCompletedOTs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return completedOTs.slice(startIndex, endIndex);
  }, [completedOTs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(completedOTs.length / itemsPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total OT Operations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{otSchedules.length}</div>
            <p className="text-xs text-muted-foreground">
              All time operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Operations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingOTs.length}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              From completed OTs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* OT Operations Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            OT Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Pending Operations</TabsTrigger>
              <TabsTrigger value="completed">Completed Operations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-4">
              {upcomingOTs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingOTs.map((ot) => (
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
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span>{ot.room.room_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{ot.queue_position}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              {formatPkrAmount(ot.doctor_expense)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ot.status)}>
                              {ot.status}
                            </Badge>
                          </TableCell>
                           <TableCell>
                             <div className="flex gap-2 flex-wrap">
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={() => handlePreOpOrders(ot)}
                                 className="flex items-center gap-1"
                               >
                                 <ClipboardList className="w-3 h-3" />
                                 Pre-Op Orders
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={() => handleTreatmentChart(ot)}
                                 className="flex items-center gap-1"
                               >
                                 <FileText className="w-3 h-3" />
                                 Treatment Chart
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={() => handleProgress(ot)}
                                 className="flex items-center gap-1"
                               >
                                 <TrendingUp className="w-3 h-3" />
                                 POPPR
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={() => handleAssessment(ot)}
                                 className="flex items-center gap-1"
                               >
                                  <ClipboardCheck className="w-3 h-3" />
                                  Assessment
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleAnesthesia(ot)}
                                  className="flex items-center gap-1"
                                >
                                  <Activity className="w-3 h-3" />
                                  Anesthesia
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleOTNotes(ot)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  OT Notes
                                </Button>
                               <Button 
                                 size="sm" 
                                 onClick={() => handleDischarge(ot)}
                                 className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                               >
                                 <UserCheck className="w-3 h-3" />
                                 Discharge
                               </Button>
                             </div>
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No pending operations found
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <div className="space-y-4">
                {/* Search Input */}
                <div className="flex items-center gap-2 max-w-md">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by Patient ID (e.g., P-0001)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                      </div>
                    ))}
                  </div>
                ) : paginatedCompletedOTs.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Operation</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Your Fee</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedCompletedOTs.map((ot) => (
                            <TableRow key={ot.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <div className="font-medium">
                                      {format(new Date(ot.operation_date), 'MMM d, yyyy')}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {format(new Date(ot.operation_date), 'h:mm a')}
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
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                  <span>{ot.room.room_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  {formatPkrAmount(ot.total_cost)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-green-600">
                                  {formatPkrAmount(ot.doctor_expense)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 flex-wrap">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handlePreOpOrders(ot)}
                                    className="flex items-center gap-1"
                                  >
                                    <ClipboardList className="w-3 h-3" />
                                    Pre-Op Orders
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleTreatmentChart(ot)}
                                    className="flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Treatment Chart
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleProgress(ot)}
                                    className="flex items-center gap-1"
                                  >
                                    <TrendingUp className="w-3 h-3" />
                                    POPPR
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleAssessment(ot)}
                                    className="flex items-center gap-1"
                                  >
                                    <ClipboardCheck className="w-3 h-3" />
                                    Assessment
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleAnesthesia(ot)}
                                    className="flex items-center gap-1"
                                  >
                                    <Activity className="w-3 h-3" />
                                    Anesthesia
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleOTNotes(ot)}
                                    className="flex items-center gap-1"
                                  >
                                    <Edit className="w-3 h-3" />
                                    OT Notes
                                  </Button>
                                  {ot.ot_notes?.dischargeSlip && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleDischargeSlip(ot)}
                                      className="flex items-center gap-1"
                                    >
                                      <FileText className="w-3 h-3" />
                                      Discharge Slip
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, completedOTs.length)} to {Math.min(currentPage * itemsPerPage, completedOTs.length)} of {completedOTs.length} completed operations
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              const start = Math.max(1, currentPage - 2);
                              const end = Math.min(totalPages, currentPage + 2);
                              return page >= start && page <= end;
                            })
                            .map(page => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            ))}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    {searchTerm ? 
                      `No completed operations found matching "${searchTerm}"` : 
                      "No completed OT operations found"
                    }
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Pre Operation Orders Dialog */}
      <PreOperationOrdersDialog 
        open={showPreOpOrdersDialog}
        onOpenChange={setShowPreOpOrdersDialog}
        otSchedule={selectedOT}
        onSave={fetchDoctorOTSchedules}
      />

      {/* OT Notes Dialog */}
      <OTNotesDialog 
        open={showOTNotesDialog}
        onOpenChange={setShowOTNotesDialog}
        otSchedule={selectedOT}
        onSave={fetchDoctorOTSchedules}
      />

      {/* Discharge Slip Dialog */}
      <DischargeSlipDialog 
        open={showDischargeDialog}
        onOpenChange={setShowDischargeDialog}
        otSchedule={selectedOT}
        onDischarge={fetchDoctorOTSchedules}
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

      {/* Anesthesia Notes Dialog */}
      <AnesthesiaNotesDialog
        open={showAnesthesiaDialog}
        onOpenChange={setShowAnesthesiaDialog}
        otSchedule={selectedOT}
        onSave={() => {}}
      />
    </div>
  );
}