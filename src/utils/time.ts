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

/**
 * 주어진 날짜가 그 달의 몇 주차인지 계산한다. 서버(StatisticsService)의 주간 랭킹
 * 범위 계산과 똑같은 규칙을 써야 한다: 1일이 월요일이 아니면 1주차는 "월초~첫 월요일
 * 전날"인 조각 주, 2주차부터는 첫 월요일 기준 7일씩. (1일이 월요일이면 조각 주가 없다.)
 */
export function getWeekOfMonth(year: number, month: number, day: number): number {
  const monthStart = new Date(year, month - 1, 1);
  const firstMonday = new Date(monthStart);
  while (firstMonday.getDay() !== 1) {
    firstMonday.setDate(firstMonday.getDate() + 1);
  }
  const target = new Date(year, month - 1, day);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;

  if (firstMonday.getTime() === monthStart.getTime()) {
    return Math.floor((target.getTime() - firstMonday.getTime()) / msPerWeek) + 1;
  }
  if (target.getTime() < firstMonday.getTime()) {
    return 1;
  }
  return Math.floor((target.getTime() - firstMonday.getTime()) / msPerWeek) + 2;
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
