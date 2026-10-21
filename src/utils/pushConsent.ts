import { isTossApp } from "./platform";
import { api } from "./api";

// 콘솔에 등록한 "출석왕_출석시간알림" 캠페인의 발송 코드와 동일해야 한다.
const TEMPLATE_CODE = "checkking-attendance-reminder";

const STATUS_KEY = "att-push-consent-status"; // "agreed"면 다시 안 물어봄
const LAST_ASKED_KEY = "att-push-consent-last-asked"; // 홈 화면 자동 질문용, 날짜 문자열

const todayKey = () => new Date().toISOString().slice(0, 10);

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
 * 홈 화면 진입 시 자동으로 한 번 물어본다.
 * - 이미 동의했으면(로컬 캐시 기준) 아예 호출하지 않는다.
 * - 참여한 방이 하나도 없으면 묻지 않는다.
 * - 하루 1회만 — 거절했어도 다음 날 다시 물어볼 수 있다.
 */
export function maybePromptPushConsentOnHome(hasAnyRoom: boolean) {
  if (!hasAnyRoom) return;
  if (hasAgreedToPushConsent()) return;

  const today = todayKey();
  if (localStorage.getItem(LAST_ASKED_KEY) === today) return;
  localStorage.setItem(LAST_ASKED_KEY, today);

  void requestPushConsent("HOME");
}
