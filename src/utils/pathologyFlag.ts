// Auto-flag logic for pathology results.
// Returns 'Low' | 'High' | 'Borderline' | null.

export type PathologyFlag = 'Low' | 'High' | 'Borderline' | null;

const numericFromString = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // Allow values like "<0.1" or ">200" — treat the boundary number as the value
  const cleaned = trimmed.replace(/^[<>≤≥]=?/, '').trim();
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  // For "<x" the value is technically below x. For ">x" it's above.
  if (/^[<≤]/.test(trimmed)) return n - 0.0001;
  if (/^[>≥]/.test(trimmed)) return n + 0.0001;
  return n;
};

export function getFlag(
  rawValue: string | number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
): PathologyFlag {
  if (min === null || min === undefined || max === null || max === undefined) return null;
  const v = typeof rawValue === 'number' ? rawValue : numericFromString(rawValue as string);
  if (v === null) return null;
  if (v < min) return 'Low';
  if (v > max) return 'High';
  const range = max - min;
  if (range <= 0) return null;
  if (v <= min + range * 0.05 || v >= max - range * 0.05) return 'Borderline';
  return null;
}

export function flagBadgeClass(flag: PathologyFlag): string {
  switch (flag) {
    case 'Low':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'High':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'Borderline':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    default:
      return '';
  }
}
