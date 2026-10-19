import { isTossApp } from "./platform";

// 토스 콘솔 "출석왕_포인트교환" 프로모션(자체포인트). 콘솔에서 "진행 중"으로 전환하면 이걸로 교체.
export const POINTS_PROMOTION_CODE_TEST = "TEST_01M59XGPDJKMB4636WJYDABD1W";
export const POINTS_PROMOTION_CODE_REAL = "01M59XGPDJKMB4636WJYDABD1W";

// 임시: "출석왕_포인트교환" 프로모션이 아직 "진행 전"이라, 이미 운영 중인
// "출석왕_랭킹보기_리워드" 광고 그룹 ID를 promotionCode로 재사용해 동작만 확인한다.
// 보상 라벨이 "랭킹보기"로 찍혀 안 맞지만, 포인트교환 프로모션이 시작되면
// 위 POINTS_PROMOTION_CODE_REAL로 교체할 것.
export const POINTS_PROMOTION_CODE_FALLBACK = "ait.v2.live.320548a2f8304a56";

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
