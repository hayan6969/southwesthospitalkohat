
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, CreditCard, Clock, Users, Activity, Plus, Edit } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function StaffOT() {
  const [otSchedule] = useState([
    {
      id: 1,
      patient: "John Doe",
      doctor: "Dr. Smith",
      procedure: "Appendectomy",
      time: "10:00 AM",
      room: "OT-1",
      status: "Scheduled"
    },
    {
      id: 2,
      patient: "Jane Smith",
      doctor: "Dr. Johnson",
      procedure: "Gallbladder Surgery",
      time: "2:00 PM",
      room: "OT-2",
      status: "In Progress"
    }
  ]);

  const handleGenerateOTInvoice = (otId: number) => {
    // This would generate a detailed OT invoice
    console.log("Generating OT invoice for:", otId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled OTs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{otSchedule.length}</div>
            <p className="text-xs text-muted-foreground">Today's operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {otSchedule.filter(ot => ot.status === 'In Progress').length}
            </div>
            <p className="text-xs text-muted-foreground">Active operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Ready for use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5h</div>
            <p className="text-xs text-muted-foreground">Per operation</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Schedule OT
        </Button>
        <Button variant="outline">
          <CreditCard className="w-4 h-4 mr-2" />
          Generate Invoice
        </Button>
        <Button variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          OT Analytics
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              OT Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otSchedule.map((ot) => (
                    <TableRow key={ot.id}>
                      <TableCell className="font-medium">{ot.patient}</TableCell>
                      <TableCell>{ot.doctor}</TableCell>
                      <TableCell>{ot.procedure}</TableCell>
                      <TableCell>{ot.time}</TableCell>
                      <TableCell>{ot.room}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ot.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          ot.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {ot.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleGenerateOTInvoice(ot.id)}
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Invoice
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OT Invoice Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Invoice Structure:</h4>
            <ul className="space-y-1 text-sm">
              <li>• <strong>Doctor's Fees:</strong> Based on procedure and doctor's rate</li>
              <li>• <strong>Hospital Charges:</strong></li>
              <li className="ml-4">- Room charges</li>
              <li className="ml-4">- Equipment charges</li>
              <li className="ml-4">- Anesthesia charges</li>
              <li className="ml-4">- Nursing charges</li>
              <li className="ml-4">- Medication charges</li>
              <li>• <strong>Total:</strong> Sum of all charges</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
