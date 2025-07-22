import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Calendar, User, Activity, MapPin, FileText, Hash } from "lucide-react";

type AuditLog = {
  id: string;
  user_id: string | null;
  created_at: string;
  action: string;
  details: string | null;
  ip_address: string | null;
  user_profile?: {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
};

type Props = {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuditLogDetailDialog({ log, open, onOpenChange }: Props) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Audit Log Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Log ID and Timestamp */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Log Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Log ID</p>
                  <p className="font-mono text-sm break-all">{log.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(log.created_at), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'h:mm:ss a')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {log.user_profile ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {log.user_profile.first_name} {log.user_profile.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-medium">{log.user_profile.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <Badge variant="secondary" className="w-fit">
                        {log.user_profile.role}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User ID</p>
                      <p className="font-mono text-sm break-all">{log.user_id}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="font-medium">System Action</p>
                  <p className="text-sm">
                    {log.user_id ? `User ID: ${log.user_id}` : 'No user associated with this action'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Action Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Action</p>
                <Badge variant="outline" className="w-fit">
                  {log.action}
                </Badge>
              </div>
              {log.details && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Additional Details
                    </p>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{log.details}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Network Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Network Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                <p className="font-mono text-sm">
                  {log.ip_address || 'Unknown'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}