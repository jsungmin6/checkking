export function formatTime(timeString: string): string {
  // "HH:mm:ss" → "HH:mm"
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
    return timeString.slice(0, 5);
  }
  // "HH:mm" → 그대로
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  // ISO datetime "2026-06-03T19:48:34" → "HH:mm"
  const date = new Date(timeString);
  if (isNaN(date.getTime())) return timeString;
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatCheckInTime(timeString: string): string {
  // "HH:mm:ss" → 그대로
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  // ISO datetime → "HH:mm:ss"
  const date = new Date(timeString);
  if (isNaN(date.getTime())) return timeString;
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
