
import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { useAuditLogs } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";
import { format } from "date-fns";

export default function AdminSystemLogs() {
  const { data: auditLogs } = useAuditLogs();
  
  // System logs filters
  const [actionFilter, setActionFilter] = useState("all");
  const [logSearchTerm, setLogSearchTerm] = useState("");

  // Filter audit logs
  const filteredLogs = auditLogs?.filter(log => {
    const matchesAction = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesSearch = logSearchTerm === "" || 
      log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(logSearchTerm.toLowerCase()));
    return matchesAction && matchesSearch;
  }) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">System Logs</h2>
            <p className="text-gray-600">Monitor critical system activities and user actions</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Security Monitoring</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at || ''), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {log.user?.first_name && log.user?.last_name 
                        ? `${log.user.first_name} ${log.user.last_name}` 
                        : log.user?.email || 'System'}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.details || 'No details'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address || 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
