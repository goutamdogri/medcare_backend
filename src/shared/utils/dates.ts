/**
 * Small date helpers operating on plain `yyyy-MM-dd` strings (the API's wire
 * format for dates). Avoids timezone drift by working in UTC throughout.
 */
export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
