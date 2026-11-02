import { isTossApp } from "./platform";

/**
 * 돈·점수 값을 담는 저장소. **앱인토스 네이티브 `Storage`를 진실로 쓴다.**
 *
 * `localStorage`만 쓰면 웹뷰 인스턴스가 바뀌거나 딥링크로 들어올 때 비어 있을 수 있다.
 * 그러면 출석점수와 받은 토스포인트가 0으로 보인다. 네이티브 `Storage`는 앱 단위로
 * 유지되므로 그 문제가 없다.
 *
 * 다만 네이티브 `Storage`는 **비동기**라 렌더 중에 읽을 수 없다. 그래서 부팅할 때
 * {@link hydrateNativeStore}로 한 번 당겨와 `localStorage`에 심어 두고, 이후 읽기는
 * 전부 동기로 처리한다. 쓰기는 `localStorage`에 즉시 반영한 뒤 네이티브에 흘려보낸다.
 *
 * 토스 앱이 아니면(웹 미리보기·Capacitor) `localStorage`만 쓴다.
 */

/** 출석점수 잔액. */
export const POINTS_TOTAL_KEY = "att-points-total";
/** 출석왕에서 받은 토스포인트 누적액(원). 표시 전용. */
export const TOSS_RECEIVED_KEY = "att-toss-points-received";

/**
 * 값이 양쪽에 다 있을 때 어느 쪽을 믿을지.
 *
 * - `max`  — 누적 숫자. 작은 쪽을 믿으면 점수가 깎인다.
 * - `flag` — "이미 받음" 표시. 한쪽이라도 받았다면 받은 것으로 본다(중복 지급 방지).
 * - `native` — 그 외. 네이티브가 더 오래 살아남으므로 네이티브를 따른다.
 */
type MergeRule = "max" | "flag" | "native";

/** 네이티브로 승격하는 키와 병합 규칙. 여기 없는 키는 `localStorage`에만 남는다. */
const MANAGED_KEYS: Record<string, MergeRule> = {
  [POINTS_TOTAL_KEY]: "max",
  [TOSS_RECEIVED_KEY]: "max",
  "att-points-welcome-granted": "flag",
  "att-points-feedback-rewarded": "flag",
  "att-streak-progress": "native",
  "att-streak-toss-paid": "native",
  "att-mission-rewarded": "native",
  "att-clover-rewarded": "native",
  "att-reward-daily": "native",
  "att-gift-claimed": "native",
  "att-lottery-first-done": "flag",
  "att-other-app-visited": "native",
  "att-other-app-opened": "native",
  // 네이티브 쪽을 따른다. 기기에 남은 사용 횟수가 기준이어야 제한이 유지된다.
  "att-clover-plays": "native",
};

let hydrated = false;

/** 네이티브 Storage 모듈. 토스 앱이 아니거나 미지원이면 null. */
async function nativeStorage() {
  if (!isTossApp()) return null;
  try {
    const { Storage } = await import("@apps-in-toss/web-framework");
    return Storage ?? null;
  } catch {
    return null;
  }
}

function merge(rule: MergeRule, local: string | null, native: string | null): string | null {
  if (local === null) return native;
  if (native === null) return local;
  if (local === native) return local;
  switch (rule) {
    case "max": {
      const a = Number(local);
      const b = Number(native);
      if (!Number.isFinite(a)) return native;
      if (!Number.isFinite(b)) return local;
      return String(Math.max(a, b));
    }
    case "flag":
      return local === "1" || native === "1" ? "1" : native;
    case "native":
      return native;
  }
}

/**
 * 네이티브 Storage의 값을 `localStorage`로 당겨온다. **앱 부팅 때 한 번만 호출한다.**
 *
 * 양쪽 값이 다르면 {@link MergeRule}로 합치고, 합친 값을 양쪽에 다시 쓴다. 기존
 * 사용자는 `localStorage`에만 값이 있으므로 이 과정에서 네이티브로 승격된다.
 *
 * 실패해도 던지지 않는다 — 저장소를 못 읽는다고 앱이 안 뜨면 안 된다.
 */
export async function hydrateNativeStore(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const storage = await nativeStorage();
  if (!storage) return;

  const keys = Object.keys(MANAGED_KEYS);
  let natives: Record<string, string | null> = {};
  try {
    // getItems는 토스 5.270.0부터다. 없으면 하나씩 읽는다.
    if (typeof storage.getItems === "function") {
      natives = await storage.getItems(keys);
    } else {
      const read = await Promise.all(keys.map((key) => storage.getItem(key).catch(() => null)));
      keys.forEach((key, i) => (natives[key] = read[i] ?? null));
    }
  } catch {
    return;
  }

  for (const key of keys) {
    const rule = MANAGED_KEYS[key];
    if (!rule) continue;
    const local = localStorage.getItem(key);
    const merged = merge(rule, local, natives[key] ?? null);
    if (merged === null) continue;
    if (merged !== local) localStorage.setItem(key, merged);
    if (merged !== (natives[key] ?? null)) void storage.setItem(key, merged).catch(() => {});
  }
}

/** 동기 읽기. {@link hydrateNativeStore} 이후에는 네이티브와 같은 값이다. */
export function readStore(key: string): string | null {
  return localStorage.getItem(key);
}

export function readNumber(key: string, fallback = 0): number {
  const raw = Number(readStore(key) ?? fallback);
  return Number.isFinite(raw) ? raw : fallback;
}

/** `localStorage`에 즉시 쓰고 네이티브에 흘려보낸다. 네이티브 쓰기 실패는 무시한다. */
export function writeStore(key: string, value: string): void {
  localStorage.setItem(key, value);
  if (!(key in MANAGED_KEYS)) return;
  void nativeStorage().then((storage) => storage?.setItem(key, value).catch(() => {}));
}

export function removeStore(key: string): void {
  localStorage.removeItem(key);
  if (!(key in MANAGED_KEYS)) return;
  void nativeStorage().then((storage) => storage?.removeItem(key).catch(() => {}));
}

/** 미리보기 초기화용. 네이티브까지 비운다. */
export function clearManagedStore(): void {
  for (const key of Object.keys(MANAGED_KEYS)) removeStore(key);
  hydrated = false;
}
