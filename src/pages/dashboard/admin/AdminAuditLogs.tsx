
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { useAuditLogs } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { Shield, User, Calendar, Activity, Filter, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminAuditLogs() {
  const { data: auditLogs, isLoading } = useAuditLogs();
  const queryClient = useQueryClient();

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    action: "",
    dateFrom: "",
    dateTo: "",
    userEmail: "",
    ipAddress: ""
  });

  // Real-time updates are handled by the global useRealTimeUpdates hook

  // Filter logs based on current filters
  const filteredLogs = auditLogs?.filter(log => {
    const logDate = new Date(log.created_at);
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59') : null;

    // Action filter
    if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) {
      return false;
    }

    // Date range filter
    if (fromDate && logDate < fromDate) {
      return false;
    }
    if (toDate && logDate > toDate) {
      return false;
    }

    // User email filter
    if (filters.userEmail && log.user_profile?.email && !log.user_profile.email.toLowerCase().includes(filters.userEmail.toLowerCase())) {
      return false;
    }

    // IP address filter
    if (filters.ipAddress && log.ip_address && !log.ip_address.includes(filters.ipAddress)) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({
      action: "",
      dateFrom: "",
      dateTo: "",
      userEmail: "",
      ipAddress: ""
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== "");

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">Monitor system activity and user actions</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {/* Quick date filter at top */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <Label htmlFor="quickDateFrom" className="text-sm font-medium">From Date</Label>
                <Input
                  id="quickDateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-auto"
                />
              </div>
              <div>
                <Label htmlFor="quickDateTo" className="text-sm font-medium">To Date</Label>
                <Input
                  id="quickDateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-auto"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1"
                  disabled={!hasActiveFilters}
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Filter Logs</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="flex items-center gap-1">
                    <X className="w-4 h-4" />
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Input
                    id="action"
                    type="text"
                    placeholder="Search actions..."
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="userEmail">User Email</Label>
                  <Input
                    id="userEmail"
                    type="text"
                    placeholder="Search by email..."
                    value={filters.userEmail}
                    onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    type="text"
                    placeholder="Search by IP..."
                    value={filters.ipAddress}
                    onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System Activity
              {hasActiveFilters && (
                <span className="text-sm text-gray-500">
                  ({filteredLogs?.length || 0} of {auditLogs?.length || 0} logs)
                </span>
              )}
            </h2>
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
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(log.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(log.created_at), 'h:mm:ss a')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {log.user_profile?.email || (log.user_id ? `User ID: ${log.user_id}` : 'System')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.user_profile ? `${log.user_profile.first_name} ${log.user_profile.last_name} (${log.user_profile.role})` : 'System Action'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {log.details || 'No additional details'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-gray-500">
                          {log.ip_address || 'Unknown'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-12">
                      {hasActiveFilters ? 'No logs match the current filters' : 'No audit logs found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
