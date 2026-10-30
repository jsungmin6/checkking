import { isTossApp } from "./platform";
import { api } from "./api";

// 콘솔에 등록한 "출석왕_출석시간알림" 캠페인의 발송 코드와 동일해야 한다.
const TEMPLATE_CODE = "checkking-attendance-reminder";

const STATUS_KEY = "att-push-consent-status"; // "agreed"면 다시 안 물어봄
const LAST_ASKED_KEY = "att-push-consent-last-asked"; // 홈 화면 자동 질문용, 날짜 문자열

// toISOString()은 UTC 기준이라 자정~오전 9시(KST) 사이엔 아직 "어제"로 취급된다. 한국 시간 기준으로 계산한다.
const todayKey = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

export function hasAgreedToPushConsent(): boolean {
  return localStorage.getItem(STATUS_KEY) === "agreed";
}

export type PushConsentResult = "newAgreement" | "alreadyAgreed" | "agreementRejected" | "unsupported";
export type PushConsentSource = "HOME" | "SETTINGS";

/** 동의 화면을 직접 띄운다. source는 어디서 호출됐는지(서버 기록/텔레그램 알림용)를 나타낸다. */
export async function requestPushConsent(source: PushConsentSource): Promise<PushConsentResult> {
  if (!isTossApp()) return "unsupported";

  const { Notification } = await import("@apps-in-toss/web-framework");
  if (!Notification.requestAgreement.isSupported()) return "unsupported";

  return new Promise((resolve) => {
    const cleanup = Notification.requestAgreement({
      options: { templateCode: TEMPLATE_CODE },
      onEvent: ({ type }) => {
        if (type === "newAgreement" || type === "alreadyAgreed") {
          localStorage.setItem(STATUS_KEY, "agreed");
          api("/notifications/push-consent", { method: "POST", body: JSON.stringify({ source }) }).catch(() => {});
        }
        cleanup();
        resolve(type);
      },
      onError: () => {
        cleanup();
        resolve("unsupported");
      },
    });
  });
}

/**
 * 출석을 마친 뒤에 한 번 물어본다.
 *
 * 홈 진입 직후에 띄웠더니 "미니앱 접속 직후 바텀시트가 바로 노출된다"는 이유로 심사에서 반려됐다.
 * 사용자가 아무것도 하지 않았는데 뜨는 것이 문제이므로, 출석이라는 행동을 마친 뒤로 옮겼다.
 *
 * - 이미 동의했으면(로컬 캐시 기준) 아예 호출하지 않는다.
 * - 하루 1회만 — 거절했어도 다음 날 다시 물어볼 수 있다.
 */
export function maybePromptPushConsentAfterCheckIn() {
  if (hasAgreedToPushConsent()) return;

  const today = todayKey();
  if (localStorage.getItem(LAST_ASKED_KEY) === today) return;
  localStorage.setItem(LAST_ASKED_KEY, today);

  void requestPushConsent("HOME");
}
