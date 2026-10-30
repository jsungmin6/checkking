import { isTossApp } from "./platform";
import { api } from "./api";

const REVIEW_ASKED_KEY = "att-review-asked";

/**
 * 이 횟수만큼 출석한 뒤에야 만족도를 물어본다.
 * 처음 써본 사람에게 들이대면 낮은 별점이 돌아오기 때문에, 앱을 충분히 써본 뒤로 미룬다.
 */
const MIN_CHECKINS_BEFORE_ASKING = 5;

/**
 * "출석왕 쓰기 어떠세요?"를 지금 띄워도 되는지.
 *
 * 횟수는 기기에 세지 않고 서버가 준 누적 출석을 쓴다. 기기에 세면 기능을 배포한 날부터
 * 0에서 다시 시작해서, 정작 오래 써온 사람이 한참 뒤에야 대상이 된다.
 */
export function shouldAskSatisfaction(totalCheckIns: number): boolean {
  // 토스 앱에서만 뜨는 화면이라, 로컬에서는 ?satisfaction=1 로 디자인을 확인한다.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("satisfaction") === "1") return true;
  if (!isTossApp()) return false;
  if (localStorage.getItem(REVIEW_ASKED_KEY) === "1") return false;
  return totalCheckIns >= MIN_CHECKINS_BEFORE_ASKING;
}

/** 한 번 물어봤으면 어떤 답을 했든 다시 묻지 않는다. */
export function markSatisfactionAsked() {
  localStorage.setItem(REVIEW_ASKED_KEY, "1");
}

/** 어느 쪽을 골랐는지 서버에 알려 텔레그램으로 받는다. 실패해도 사용자 흐름에는 영향이 없다. */
export function reportSatisfaction(choice: "GOOD" | "DISMISS") {
  void api("/notifications/review-prompt", {
    method: "POST",
    body: JSON.stringify({ choice }),
  }).catch(() => {});
}

/** 리뷰 요청을 지원하는 환경인지 모달을 보여주기 전에 확인한다. */
export async function isTossReviewSupported(): Promise<boolean> {
  // 로컬 디자인 확인용 모달은 토스 SDK가 없는 브라우저에서도 열 수 있게 한다.
  if (!isTossApp()) {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).get("satisfaction") === "1";
  }
  try {
    const { Review } = await import("@apps-in-toss/web-framework");
    return Review.request.isSupported();
  } catch {
    return false;
  }
}

/**
 * 토스 리뷰 창을 띄운다.
 *
 * 토스가 사용자 피로도를 보고 노출 여부를 정하므로 호출해도 안 뜰 수 있고,
 * 떴더라도 제출했는지 취소했는지는 알 수 없다(콜백이 없다).
 * 그래서 이 함수의 결과에 다음 화면 이동이나 보상을 연결하면 안 된다.
 */
export async function requestTossReview() {
  if (!isTossApp()) return;
  try {
    const { Review } = await import("@apps-in-toss/web-framework");
    if (!Review.request.isSupported()) return;
    await Review.request();
  } catch {
    // 토스앱 버전이 낮거나(UNSUPPORTED_APP_VERSION) 내부 사정으로 실패한 경우.
    // 사용자가 요청한 적 없는 창이라 알릴 것이 없다.
  }
}
