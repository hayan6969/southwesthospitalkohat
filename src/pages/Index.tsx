
import { useAuth } from "@/hooks/useAuth";
import { UserAccountDialog } from "@/components/UserAccountDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, Calendar, FileText, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Hospital Management System
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your healthcare operations with our comprehensive management solution. 
            Manage patients, appointments, staff, and more - all in one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <UserAccountDialog />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Patient Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Comprehensive patient records, medical history, and profile management
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Appointment Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Efficient appointment booking and schedule management system
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <FileText className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Medical Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Digital medical records, lab reports, and prescription management
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Activity className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Analytics & Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Comprehensive reporting and analytics for better decision making
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Ready to transform your healthcare management?
          </h2>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Start Your Journey Today
          </Button>
        </div>
      </div>
    </div>
  );
}
