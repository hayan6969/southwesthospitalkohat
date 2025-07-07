
import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { useUsers, useDepartments } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountManagementDialog } from "@/components/dialogs/AccountManagementDialog";
import { EditUserDialog } from "@/components/dialogs/EditUserDialog";
import { format } from "date-fns";

export default function AdminAccounts() {
  const { data: users, refetch: refetchUsers } = useUsers();
  const { data: departments } = useDepartments();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Account management filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter users based on role and search term
  const filteredUsers = users?.filter(user => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesSearch = searchTerm === "" || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  }) || [];

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleUserUpdated = () => {
    refetchUsers();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'doctor': return 'bg-green-100 text-green-700';
      case 'staff': return 'bg-blue-100 text-blue-700';
      case 'pharmacy': return 'bg-orange-100 text-orange-700';
      case 'finance': return 'bg-teal-100 text-teal-700';
      case 'patient': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Account Management</h2>
            <p className="text-gray-600">Manage all user accounts across the system</p>
          </div>
          <AccountManagementDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {departments?.find(dept => dept.id === user.department_id)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
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
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant={user.is_active ? "destructive" : "default"}
                        >
                          {user.is_active ? 'Block' : 'Unblock'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <EditUserDialog 
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={handleUserUpdated}
      />
    </AppLayout>
  );
}
