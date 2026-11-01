import { isTossApp } from "./platform";
import { TOSS_RECEIVED_KEY, readNumber, readStore, writeStore } from "./nativeStore";
import { spendPoints, addPoints } from "./attendancePoints";

/**
 * 실제 토스포인트 지급. **클라이언트가 직접 지급한다.**
 *
 * 서버 mTLS Open API로 옮겼다가 되돌렸다. 서버 지급은 지급 키 발급·PENDING 정산·
 * 재시도·원장 테이블을 전부 직접 떠안아야 하는데, 앱인토스 SDK의
 * `Promotion.grantReward`는 그 일을 토스가 해 준다. 금액 상한(1회·1일)도 콘솔이
 * 강제하므로, 기기 값이 조작돼도 손해는 콘솔에 등록한 한도를 넘지 않는다.
 *
 * 받은 누적액은 표시 전용이고 {@link ./nativeStore}에 남는다.
 */

/** 출석복권 "출석왕_대박찬스" (2026-11-01 승인). 지급 금액 상한 1,000원. */
export const LOTTERY_PROMOTION_CODE = "01M6ARBV4R45AMMCAVR9701MED";
/** 연속 출석 7·12·17…일차 "출석왕_출석". 지급 금액 10원 고정. */
export const STREAK_PROMOTION_CODE = "01M6ATHKDT3QNJT8ZXZY16J99W";

/** 연속 출석 보상 1회 지급액. 콘솔 등록값과 달라지면 4114로 거부된다. */
export const STREAK_REWARD_WON = 10;

export const TOSS_POINTS_RECEIVED_KEY = TOSS_RECEIVED_KEY;
export const TOSS_POINTS_RECEIVED_EVENT = "att-toss-points-received-change";

export type GrantRewardOutcome =
  | { ok: true; key: string }
  | { ok: false; code: string };

function publishTossPointsReceived(total: number) {
  const normalized = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  writeStore(TOSS_RECEIVED_KEY, String(normalized));
  window.dispatchEvent(new CustomEvent(TOSS_POINTS_RECEIVED_EVENT, { detail: normalized }));
}

/** 받은 토스포인트 누적액(원). */
export function getTossPointsReceived(): number {
  return readNumber(TOSS_RECEIVED_KEY, 0);
}

/** 저장된 누적액을 화면에 다시 알린다. 서버를 보지 않는다. */
export function syncTossPointLedger(): Promise<void> {
  publishTossPointsReceived(getTossPointsReceived());
  return Promise.resolve();
}

function addTossPointsReceived(amountWon: number) {
  publishTossPointsReceived(getTossPointsReceived() + amountWon);
}

/**
 * 토스 프로모션으로 실제 토스포인트를 지급한다. `amount` 단위는 원.
 *
 * 구버전 토스 앱에서는 `isSupported()`가 false다 — 던지지 않고 코드로 돌려준다.
 */
export async function grantTossPromotionReward(promotionCode: string, amount: number): Promise<GrantRewardOutcome> {
  if (!isTossApp()) {
    // 개발 서버에서는 지급이 성공한 것처럼 흉내 낸다. 그러지 않으면 복권도 도장도
    // "토스 앱에서만 받을 수 있어요"에서 막혀 뒷 화면을 전혀 볼 수 없다.
    // **실제 돈은 나가지 않는다** — 토스 SDK를 부르지 않는다.
    if (import.meta.env.DEV) {
      console.info("[출석왕] 개발 모드 가짜 지급", { promotionCode, amount });
      return { ok: true, key: `dev-${Date.now().toString(36)}` };
    }
    return { ok: false, code: "NOT_TOSS_APP" };
  }
  const { Promotion } = await import("@apps-in-toss/web-framework");
  if (!Promotion.grantReward.isSupported()) return { ok: false, code: "UNSUPPORTED_VERSION" };
  try {
    const result = await Promotion.grantReward({ promotionCode, amount });
    return { ok: true, key: result.key };
  } catch (e) {
    const code = (e as { code?: string } | null)?.code ?? "UNKNOWN_ERROR";
    return { ok: false, code };
  }
}

export interface StreakRewardOutcome {
  /** 지급된 금액(원). 지급하지 않았으면 0. */
  amountWon: number;
  /** 실패했을 때의 토스 에러 코드. 지급 대상이 아니거나 성공했으면 없다. */
  errorCode?: string;
}

/** 하루에 받을 수 있는 금액을 넘겼을 때 토스가 주는 코드. 내일이면 다시 받을 수 있다. */
export const DAILY_LIMIT_ERROR_CODE = "4110";

/**
 * 연속 출석 보상 10원을 지급한다. 지급에 성공하면 누적액에 더하고 수령 기록을 남긴다.
 *
 * 이미 받은 일차면 아무것도 하지 않는다. 실패하면 기록을 남기지 않으므로 다음에
 * 다시 시도된다 — 하루 지급 한도를 넘겨 실패한 경우(4110) 다음 날 받을 수 있다.
 *
 * **실패 코드를 반드시 돌려준다.** 코드를 삼키면 왜 안 들어왔는지 알 방법이 없다.
 */
export async function grantStreakReward(day: number): Promise<StreakRewardOutcome> {
  const { isTossRewardDay, hasTossRewardPaid, markTossRewardPaid } = await import("./localStreak");
  if (!isTossRewardDay(day) || hasTossRewardPaid(day)) return { amountWon: 0 };

  const outcome = await grantTossPromotionReward(STREAK_PROMOTION_CODE, STREAK_REWARD_WON);
  if (!outcome.ok) return { amountWon: 0, errorCode: outcome.code };
  markTossRewardPaid(day);
  addTossPointsReceived(STREAK_REWARD_WON);
  return { amountWon: STREAK_REWARD_WON };
}

/** 지급 실패를 사람 말로 바꾼다. 모르는 코드는 그대로 붙여 원인을 추적할 수 있게 한다. */
export function describeGrantFailure(errorCode: string): string {
  switch (errorCode) {
    case DAILY_LIMIT_ERROR_CODE:
      return "오늘 받을 수 있는 포인트를 다 받았어요. 내일 다시 들어와요.";
    case "4112":
      return "지급할 포인트가 떨어졌어요. 곧 채워둘게요.";
    case "4109":
    case "4105":
      return "지금은 포인트를 받을 수 없어요.";
    case "NOT_TOSS_APP":
      return "토스 앱에서만 포인트를 받을 수 있어요.";
    case "UNSUPPORTED_VERSION":
      return "토스 앱을 최신으로 업데이트하면 받을 수 있어요.";
    default:
      return `포인트 지급에 실패했어요. (${errorCode})`;
  }
}

// ─── 복권 ──────────────────────────────────────────────────────────────────

/** 복권 한 장 값(출석점수). */
export const LOTTERY_TICKET_PRICE = 5_000;
/** 최대 당첨 금액. 콘솔 프로모션의 지급 금액(1,000원)을 넘기면 4114로 거부된다. */
export const LOTTERY_MAX_PRIZE_WON = 1_000;

/**
 * 당첨 금액을 뽑는다. **꽝은 없다** — 긁으면 반드시 1원 이상 받는다.
 *
 * <pre>
 *     1원  25%        2원  43.9009%   3원  20%
 *     5원  10%       10원   1%       50원   0.08%
 *   100원   0.015%  1000원   0.0041%
 * </pre>
 *
 * 가중치 합은 정확히 1,000,000이어야 한다. 한 구간을 고치면 다른 구간이 따라 움직인다.
 *
 * 장당 기대값은 약 2.424원이고, 한 장 값은 5,000점 + 광고 1회다.
 */
export function rollLotteryPrize(): number {
  const roll = Math.floor(Math.random() * 1_000_000);
  if (roll < 250_000) return 1;
  if (roll < 689_009) return 2;
  if (roll < 889_009) return 3;
  if (roll < 989_009) return 5;
  if (roll < 999_009) return 10;
  if (roll < 999_809) return 50;
  if (roll < 999_959) return 100;
  return LOTTERY_MAX_PRIZE_WON;
}

/** 첫 복권을 긁었는지. 지급에 성공한 뒤에만 선다. */
const FIRST_SCRATCH_KEY = "att-lottery-first-done";

/**
 * 첫 복권 당첨금. **추첨하지 않고 고정한다.**
 *
 * 처음 긁은 사람의 88%가 1~3원을 보게 되는데(실제 분포), 그 숫자로는 "이게 되는
 * 기능이구나"가 전해지지 않는다. 첫 장만 5원으로 두어 체감을 올린다. 분포 안에
 * 있는 금액이고(10% 구간), 고지한 "최대 1,000원" 범위도 벗어나지 않는다.
 */
export const FIRST_SCRATCH_PRIZE_WON = 5;

/** 아직 첫 복권을 긁지 않았는지. */
export function isFirstLotteryScratch(): boolean {
  return readStore(FIRST_SCRATCH_KEY) !== "1";
}

export interface AttendanceLotteryScratchResult {
  drawId: string;
  amountWon: number;
}

export class LotteryError extends Error {}

/**
 * 복권을 긁는다. **긁는 순간 차감·추첨·지급이 한 번에 끝난다.**
 *
 * 금액을 미리 보여주지 않으므로 금액을 보고 닫아 공짜로 다시 뽑을 수 없다.
 * 지급이 실패하면 차감한 점수를 되돌려준다 — 돈도 점수도 잃으면 안 된다.
 */
export async function scratchAttendanceLottery(drawId: string): Promise<AttendanceLotteryScratchResult> {
  if (spendPoints(LOTTERY_TICKET_PRICE) === null) {
    throw new LotteryError("출석점수가 모자라요.");
  }
  const firstScratch = isFirstLotteryScratch();
  const amountWon = firstScratch ? FIRST_SCRATCH_PRIZE_WON : rollLotteryPrize();
  const outcome = await grantTossPromotionReward(LOTTERY_PROMOTION_CODE, amountWon);
  if (!outcome.ok) {
    addPoints(LOTTERY_TICKET_PRICE);   // 지급 실패 — 차감을 되돌린다.
    // 왜 안 됐는지 그대로 보여준다. "잠시 후 다시"라고만 하면 원인을 알 수 없다.
    throw new LotteryError(describeGrantFailure(outcome.code));
  }
  // 지급이 끝난 뒤에 표시한다. 실패했으면 다음에도 첫 장으로 친다.
  if (firstScratch) writeStore(FIRST_SCRATCH_KEY, "1");
  addTossPointsReceived(amountWon);
  return { drawId, amountWon };
}

/** 시도마다 새로 만든다. crypto.randomUUID가 없는 구형 웹뷰를 위한 폴백을 둔다. */
export function newLotteryDrawId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
}
