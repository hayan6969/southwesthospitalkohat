
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
  return (
    <div className="border rounded-lg bg-white p-4 shadow">
      <h4 className="font-semibold mb-2">{title}</h4>
      <ul className="divide-y">
        {events.length === 0 && (
          <li className="py-2 text-muted-foreground text-sm">No events yet.</li>
        )}
        {events.map((e, idx) => (
          <li key={idx} className="py-2 flex flex-col gap-0.5">
            <span className="text-sm">
              <b>{e.what}</b> <span className="text-muted-foreground">by {e.who}</span>
            </span>
            <span className="text-xs text-muted-foreground">{e.when} {e.details && <> · {e.details}</>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
