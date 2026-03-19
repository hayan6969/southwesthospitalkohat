
import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { useUsers, useDepartments, useUpdateUserStatus } from "@/hooks/useDatabase";
import { AccountManagementDialog } from "@/components/dialogs/AccountManagementDialog";
import { EditUserDialog } from "@/components/dialogs/EditUserDialog";
import { Users, Edit, UserCheck, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminStaff() {
  const { data: users, isLoading, refetch } = useUsers();
  const { data: departments } = useDepartments();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const updateUserStatus = useUpdateUserStatus();

  // Filter for all users except patients
  const nonPatientUsers = users?.filter(user => user.role !== 'patient') || [];

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleUserUpdated = () => {
    refetch();
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = !user.is_active;
    const action = newStatus ? "unblocked" : "blocked";
    
    try {
      await updateUserStatus.mutateAsync({ 
        userId: user.id, 
        isActive: newStatus 
      });
      toast.success(`User ${action} successfully`);
      refetch(); // Refresh the data to show updated status
    } catch (error) {
      toast.error(`Failed to ${newStatus ? "unblock" : "block"} user`);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'doctor': return 'bg-green-100 text-green-700';
      case 'staff': return 'bg-blue-100 text-blue-700';
      case 'ota': return 'bg-indigo-100 text-indigo-700';
      case 'nursing': return 'bg-pink-100 text-pink-700';
      case 'head_pharmacist': return 'bg-orange-100 text-orange-700';
      case 'assistant_pharmacist': return 'bg-orange-50 text-orange-600';
      case 'salesman_pharmacist': return 'bg-orange-200 text-orange-800';
      case 'finance': return 'bg-teal-100 text-teal-700';
      case 'inventory_manager': return 'bg-amber-100 text-amber-700';
      case 'store': return 'bg-stone-100 text-stone-700';
      case 'lab': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-600 mt-1">Manage hospital staff, doctors, pharmacy, and finance users</p>
          </div>
          <AccountManagementDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Staff Members ({nonPatientUsers.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : nonPatientUsers && nonPatientUsers.length > 0 ? (
                  nonPatientUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{user.first_name} {user.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {departments?.find(dept => dept.id === user.department_id)?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant={user.is_active ? "destructive" : "default"}
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={updateUserStatus.isPending}
                          >
                            {user.is_active ? (
                              <>
                                <ShieldOff className="w-3 h-3 mr-1" />
                                Block
                              </>
                            ) : (
                              <>
                                <Shield className="w-3 h-3 mr-1" />
                                Unblock
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                      No staff members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <EditUserDialog 
          user={editingUser}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUserUpdated={handleUserUpdated}
        />
      </div>
    </AppLayout>
  );
}
