import { isTossApp } from "./platform";

// 토스 콘솔 "출석왕_포인트교환" 프로모션. 콘솔에서 "진행 중"으로 전환하기 전까지는 테스트 코드만 동작한다.
// 실제 시작 후 REAL 코드로 교체.
export const POINTS_PROMOTION_CODE_TEST = "TEST_01M59XGPDJKMB4636WJYDABD1W";
export const POINTS_PROMOTION_CODE_REAL = "01M59XGPDJKMB4636WJYDABD1W";

// 콘솔에 등록된 "한 명이 하루에 받을 수 있는 최대 금액"
export const PROMOTION_DAILY_CAP_WON = 100;

export type GrantRewardOutcome =
  | { ok: true; key: string }
  | { ok: false; code: string };

/** 토스 "자체포인트" 프로모션으로 실제 토스 포인트를 지급한다. amount 단위는 원. */
export async function grantTossPromotionReward(promotionCode: string, amount: number): Promise<GrantRewardOutcome> {
  if (!isTossApp()) {
    return { ok: false, code: "NOT_TOSS_APP" };
  }
  const { Promotion } = await import("@apps-in-toss/web-framework");
  if (!Promotion.grantReward.isSupported()) {
    return { ok: false, code: "UNSUPPORTED_VERSION" };
  }
  try {
    const result = await Promotion.grantReward({ promotionCode, amount });
    return { ok: true, key: result.key };
  } catch (e) {
    const code = (e as { code?: string } | null)?.code ?? "UNKNOWN_ERROR";
    return { ok: false, code };
  }
}
