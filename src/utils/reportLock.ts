export function isReportLocked(createdAt: string): boolean {
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
