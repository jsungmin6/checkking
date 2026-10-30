const LAST_CHANGED_KEY = "att-avatar-changed-date";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 오늘 이미 바꿨는지 — 기기 기준이라 서버는 따로 확인하지 않는다(값이 틀려도 다른 그림이 저장될 뿐 피해가 없다). */
export function hasChangedAvatarToday(): boolean {
  return localStorage.getItem(LAST_CHANGED_KEY) === todayKey();
}

export function markAvatarChangedToday() {
  localStorage.setItem(LAST_CHANGED_KEY, todayKey());
}
