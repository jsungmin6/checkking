const LAST_CHANGED_KEY = "att-avatar-changed-date";

/**
 * KST 기준 날짜.
 *
 * `toISOString()`은 UTC라 한국 자정~오전 9시에 하루가 밀린다. 그 시간대에 바꾸면
 * 전날로 기록돼 하루에 두 번 바꿀 수 있었다.
 */
function todayKey(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** 오늘 이미 바꿨는지 — 기기 기준이라 서버는 따로 확인하지 않는다(값이 틀려도 다른 그림이 저장될 뿐 피해가 없다). */
export function hasChangedAvatarToday(): boolean {
  return localStorage.getItem(LAST_CHANGED_KEY) === todayKey();
}

export function markAvatarChangedToday() {
  localStorage.setItem(LAST_CHANGED_KEY, todayKey());
}
