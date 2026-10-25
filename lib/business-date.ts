const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

export function riyadhDate(value: Date = new Date()) {
  return new Date(value.getTime() + RIYADH_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
