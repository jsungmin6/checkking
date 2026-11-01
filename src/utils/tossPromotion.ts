import { isTossApp } from "./platform";
import { api } from "./api";

// 토스 콘솔 "출석왕_포인트교환" 프로모션(자체포인트). 2026-10-20부터 "진행 중".
// 복권은 이 코드를 서버에서 쓴다(서버 설정 toss.promotion.attendance-lottery-code).
export const POINTS_PROMOTION_CODE_REAL = "01M59XGPDJKMB4636WJYDABD1W";

// 포인트 교환 화면의 앱 자체 일일 한도. 프로모션 전체 콘솔 한도와는 별도다.
export const PROMOTION_DAILY_CAP_WON = 100;
export const TOSS_POINTS_RECEIVED_KEY = "att-toss-points-received";
export const TOSS_POINTS_RECEIVED_EVENT = "att-toss-points-received-change";

type TossPointGrantSource = "POINTS_CONVERSION" | "ATTENDANCE_LOTTERY";
type PendingTossPointGrant = { amountWon: number; promotionKey: string; source: TossPointGrantSource };
interface TossPointGrantResponse { totalReceivedWon: number }
interface TossPointTotalResponse { totalReceivedWon: number }
const PENDING_TOSS_GRANTS_KEY = "att-toss-points-pending-grants";

function publishTossPointsReceived(total: number) {
  const normalized = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  localStorage.setItem(TOSS_POINTS_RECEIVED_KEY, String(normalized));
  window.dispatchEvent(new CustomEvent(TOSS_POINTS_RECEIVED_EVENT, { detail: normalized }));
}

function addLocalTossPointsReceived(amount: number) {
  const current = Number(localStorage.getItem(TOSS_POINTS_RECEIVED_KEY) ?? "0");
  publishTossPointsReceived((Number.isFinite(current) ? current : 0) + amount);
}

async function saveTossPointGrant(amountWon: number, promotionKey: string, source: TossPointGrantSource) {
  try {
    const result = await api<TossPointGrantResponse>("/points/toss-grants", {
      method: "POST",
      body: JSON.stringify({ amountWon, promotionKey, source }),
    });
    publishTossPointsReceived(result.totalReceivedWon);
  } catch {
    const pending = readPendingTossGrants();
    if (!pending.some((item) => item.promotionKey === promotionKey)) {
      pending.push({ amountWon, promotionKey, source });
      localStorage.setItem(PENDING_TOSS_GRANTS_KEY, JSON.stringify(pending));
      addLocalTossPointsReceived(amountWon);
    }
  }
}

export type GrantRewardOutcome =
  | { ok: true; key: string }
  | { ok: false; code: string };

/**
 * 토스 "자체포인트" 프로모션으로 실제 토스 포인트를 지급한다. amount 단위는 원.
 *
 * ⚠️ **새 지급 경로에 이 함수를 쓰지 말 것.** 지급 금액을 클라이언트가 정하게 되어,
 * 서버가 실제로 얼마가 나갔는지 알 수 없고 변조된 호출이 콘솔 1회 한도까지 받아갈 수 있다.
 * 복권은 이 때문에 서버 지급(POST /labs/attendance-lottery/scratch)으로 옮겼다.
 *
 * 현재 이 함수를 쓰는 곳은 `ConvertPointsModal` 하나이고, 그 모달은 **어디서도
 * import되지 않는다**(홈의 "토스 포인트로 바꾸기" 진입점을 의도적으로 제거했다).
 * 포인트 교환을 다시 열 때는 이 함수를 되살리지 말고 서버 지급으로 만들어야 한다.
 */
export async function grantTossPromotionReward(
  promotionCode: string,
  amount: number,
  source: TossPointGrantSource = "POINTS_CONVERSION",
): Promise<GrantRewardOutcome> {
  if (!isTossApp()) {
    return { ok: false, code: "NOT_TOSS_APP" };
  }
  const { Promotion } = await import("@apps-in-toss/web-framework");
  if (!Promotion.grantReward.isSupported()) {
    return { ok: false, code: "UNSUPPORTED_VERSION" };
  }
  try {
    const result = await Promotion.grantReward({ promotionCode, amount });
    await saveTossPointGrant(amount, result.key, source);
    return { ok: true, key: result.key };
  } catch (e) {
    const code = (e as { code?: string } | null)?.code ?? "UNKNOWN_ERROR";
    return { ok: false, code };
  }
}

export async function syncTossPointLedger(): Promise<void> {
  const remaining: PendingTossPointGrant[] = [];
  for (const item of readPendingTossGrants()) {
    try {
      const result = await api<TossPointGrantResponse>("/points/toss-grants", {
        method: "POST",
        body: JSON.stringify(item),
      });
      publishTossPointsReceived(result.totalReceivedWon);
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(PENDING_TOSS_GRANTS_KEY, JSON.stringify(remaining));
  try {
    const total = await api<TossPointTotalResponse>("/points/toss-grants/total");
    publishTossPointsReceived(total.totalReceivedWon);
  } catch { /* 서버에 연결할 수 없으면 마지막으로 저장한 값 유지 */ }
}

function readPendingTossGrants(): PendingTossPointGrant[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PENDING_TOSS_GRANTS_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PendingTossPointGrant =>
        item && Number.isInteger(item.amountWon) && typeof item.promotionKey === "string"
          && (item.source === "POINTS_CONVERSION" || item.source === "ATTENDANCE_LOTTERY"))
      : [];
  } catch {
    return [];
  }
}

export interface AttendanceLotteryScratchResult {
  drawId: string;
  amountWon: number;
}

/**
 * 복권을 긁는다. **한 번의 호출로 차감·추첨·토스포인트 지급·기록이 모두 끝난다.**
 *
 * 예전에는 서버에서 금액을 먼저 받아(`/draws`) 클라이언트가 `Promotion.grantReward`로
 * 지급하고 `/paid`로 알렸다. 그 구조에는 구멍이 둘 있었다 — 금액을 보고 닫으면 공짜로
 * 재추첨할 수 있었고, 지급 금액을 클라이언트가 정할 수 있었다. 지금은 금액을 미리 주지
 * 않고 서버가 지급까지 끝낸다.
 *
 * `drawId`는 이 시도의 멱등 키다. 재시도해도 차감과 지급이 한 번만 일어난다.
 */
export function scratchAttendanceLottery(drawId: string): Promise<AttendanceLotteryScratchResult> {
  return api<AttendanceLotteryScratchResult>("/labs/attendance-lottery/scratch", {
    method: "POST",
    body: JSON.stringify({ drawId }),
  });
}

/** 시도마다 새로 만든다. crypto.randomUUID가 없는 구형 웹뷰를 위한 폴백을 둔다. */
export function newLotteryDrawId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
}
