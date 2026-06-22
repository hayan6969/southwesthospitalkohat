// The 24h lock prevents tampering with a *finalized* report after sign-out.
// In-progress reports (draft/partial) are never time-locked — pending tests
// (e.g. cultures, send-outs) may legitimately be entered days later.
export function isReportLocked(createdAt: string, status?: string): boolean {
  if (status && status !== "final") return false;
  const age = Date.now() - new Date(createdAt).getTime();
  return age > 24 * 60 * 60 * 1000;
}

export function formatRemainingTime(createdAt: string): string {
  const age = Date.now() - new Date(createdAt).getTime();
  const remaining = 24 * 60 * 60 * 1000 - age;
  if (remaining <= 0) return "";
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  if (minutes > 0) return `${minutes}m remaining`;
  return "< 1m remaining";
}
