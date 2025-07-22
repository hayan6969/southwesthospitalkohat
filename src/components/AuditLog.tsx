
import { Button } from "@/components/ui/button";
import { AuditLogDetailDialog } from "@/components/dialogs/AuditLogDetailDialog";
import { useState } from "react";

type AuditEvent = {
  who: string;
  when: string;
  what: string;
  details?: string;
};

type Props = {
  events: AuditEvent[];
  title?: string;
};

export function AuditLog({ events, title = "Activity / Audit Log" }: Props) {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showLogDetail, setShowLogDetail] = useState(false);

  const handleLogClick = (event: AuditEvent) => {
    console.log("Audit log clicked:", event);
    // Convert the event to the expected format for the dialog
    const logForDialog = {
      id: `${event.when}-${event.what}`,
      user_id: null,
      created_at: event.when,
      action: event.what,
      details: event.details || null,
      ip_address: null,
      user_profile: event.who !== 'System' ? {
        email: event.who,
        first_name: event.who.split(' ')[0] || '',
        last_name: event.who.split(' ').slice(1).join(' ') || '',
        role: 'user'
      } : null
    };
    setSelectedLog(logForDialog);
    setShowLogDetail(true);
  };

  return (
    <>
      <div className="border rounded-lg bg-white p-4 shadow">
        <h4 className="font-semibold mb-2">{title}</h4>
        <ul className="divide-y">
          {events.length === 0 && (
            <li className="py-2 text-muted-foreground text-sm">No events yet.</li>
          )}
          {events.map((e, idx) => (
            <li key={idx} className="py-2 flex items-center justify-between gap-2 hover:bg-gray-50 px-2 rounded cursor-pointer" onClick={() => handleLogClick(e)}>
              <div className="flex flex-col gap-0.5 flex-1">
                <span className="text-sm">
                  <b>{e.what}</b> <span className="text-muted-foreground">by {e.who}</span>
                </span>
                <span className="text-xs text-muted-foreground">{e.when} {e.details && <> · {e.details}</>}</span>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  handleLogClick(e);
                }}
              >
                View
              </Button>
            </li>
          ))}
        </ul>
      </div>
      
      <AuditLogDetailDialog 
        log={selectedLog}
        open={showLogDetail}
        onOpenChange={setShowLogDetail}
      />
    </>
  );
}
