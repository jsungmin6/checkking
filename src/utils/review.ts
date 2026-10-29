import { isTossApp } from "./platform";

const CHECKIN_COUNT_KEY = "att-checkin-count";
const REVIEW_REQUESTED_KEY = "att-review-requested";

/**
 * 이 횟수만큼 출석한 뒤에야 리뷰를 물어본다.
 * 처음 써본 사람에게 들이대면 낮은 별점이 돌아오기 때문에, 앱을 충분히 써본 뒤로 미룬다.
 */
const MIN_CHECKINS_BEFORE_REVIEW = 5;

/** 출석에 성공할 때마다 호출 — 리뷰를 언제 물어볼지 판단하는 데만 쓴다. */
export function recordCheckInForReview() {
  const current = Number(localStorage.getItem(CHECKIN_COUNT_KEY) ?? "0");
  localStorage.setItem(CHECKIN_COUNT_KEY, String(current + 1));
}

/**
 * 조건이 맞으면 토스 리뷰 창을 띄운다.
 *
 * 토스가 사용자 피로도를 보고 노출 여부를 정하므로 호출해도 안 뜰 수 있고,
 * 떴더라도 제출했는지 취소했는지는 알 수 없다(콜백이 없다).
 * 그래서 이 함수의 결과에 다음 화면 이동이나 보상을 연결하면 안 된다.
 */
export async function maybeRequestReview() {
  if (!isTossApp()) return;
  if (localStorage.getItem(REVIEW_REQUESTED_KEY) === "1") return;
  if (Number(localStorage.getItem(CHECKIN_COUNT_KEY) ?? "0") < MIN_CHECKINS_BEFORE_REVIEW) return;

  try {
    const { Review } = await import("@apps-in-toss/web-framework");
    if (!Review.request.isSupported()) return;
    // 실제로 떴는지는 알 수 없으므로, 한 번 시도한 것으로 치고 다시 묻지 않는다.
    localStorage.setItem(REVIEW_REQUESTED_KEY, "1");
    await Review.request();
  } catch {
    // 토스앱 버전이 낮거나(UNSUPPORTED_APP_VERSION) 내부 사정으로 실패한 경우.
    // 사용자가 요청한 적 없는 창이라 알릴 것이 없다.
  }
}
