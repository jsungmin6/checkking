import { isTossApp } from "./platform";
import { api } from "./api";

/**
 * 콘솔에 등록한 알림 캠페인의 발송 코드. 글자까지 같아야 한다.
 * 동의는 코드 단위라서, 코드가 늘어나면 그만큼 따로 받아야 한다.
 */
const TEMPLATES = [
  { key: "attendance", code: "checkking-attendance-reminder" },
  { key: "mission", code: "checkking-new-mission" },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]["key"];

// 출석 알림은 이 키로 이미 동의를 받아둔 사용자가 있어서 그대로 쓴다. 바꾸면 전원에게 다시 묻게 된다.
const LEGACY_ATTENDANCE_STATUS_KEY = "att-push-consent-status";
const statusKey = (key: TemplateKey) =>
  key === "attendance" ? LEGACY_ATTENDANCE_STATUS_KEY : `att-push-consent-${key}`;

const LAST_ASKED_KEY = "att-push-consent-last-asked"; // 자동 질문용, 날짜 문자열

// toISOString()은 UTC 기준이라 자정~오전 9시(KST) 사이엔 아직 "어제"로 취급된다. 한국 시간 기준으로 계산한다.
const todayKey = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

function hasAgreed(key: TemplateKey): boolean {
  return localStorage.getItem(statusKey(key)) === "agreed";
}

/** 출석 알림에 동의했는지 — 내 정보 화면에서 설정 행을 숨길지 판단하는 데 쓴다. */
export function hasAgreedToPushConsent(): boolean {
  return hasAgreed("attendance");
}

export type PushConsentResult = "newAgreement" | "alreadyAgreed" | "agreementRejected" | "unsupported";
export type PushConsentSource = "HOME" | "SETTINGS";

/** 동의 화면을 직접 띄운다. source는 어디서 호출됐는지(서버 기록/텔레그램 알림용)를 나타낸다. */
export async function requestPushConsent(
  source: PushConsentSource,
  templateKey: TemplateKey = "attendance",
): Promise<PushConsentResult> {
  if (!isTossApp()) return "unsupported";

  const { Notification } = await import("@apps-in-toss/web-framework");
  if (!Notification.requestAgreement.isSupported()) return "unsupported";

  const template = TEMPLATES.find((t) => t.key === templateKey)!;

  return new Promise((resolve) => {
    const cleanup = Notification.requestAgreement({
      options: { templateCode: template.code },
      onEvent: ({ type }) => {
        if (type === "newAgreement" || type === "alreadyAgreed") {
          localStorage.setItem(statusKey(templateKey), "agreed");
        }
        // 새로 동의한 경우에만 알린다. alreadyAgreed까지 보내면 같은 사람이 여러 번 찍힌다.
        if (type === "newAgreement") {
          api("/notifications/push-consent", {
            method: "POST",
            body: JSON.stringify({ source, template: templateKey }),
          }).catch(() => {});
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
 * 출석을 마친 뒤에 출석 알림 동의를 물어본다.
 *
 * 홈 진입 직후에 띄웠더니 "미니앱 접속 직후 바텀시트가 바로 노출된다"는 이유로 심사에서 반려됐다.
 * 사용자가 아무것도 하지 않았는데 뜨는 것이 문제이므로, 출석이라는 행동을 마친 뒤로 옮겼다.
 *
 * 하루 1회만 — 거절했어도 다음 날 다시 물어볼 수 있다.
 */
export function maybePromptPushConsentAfterCheckIn() {
  if (hasAgreed("attendance")) return;

  const today = todayKey();
  if (localStorage.getItem(LAST_ASKED_KEY) === today) return;
  localStorage.setItem(LAST_ASKED_KEY, today);

  void requestPushConsent("HOME", "attendance");
}

/**
 * 미션 보상을 받은 뒤에 미션 알림 동의를 물어본다.
 *
 * 동의는 발송 코드마다 따로 받아야 하는데, 출석 알림과 같은 자리에서 연달아 띄우면 피로하다.
 * 미션을 해본 사람이 다음 미션 알림에 관심이 있을 테니 그 시점이 맥락에도 맞다.
 */
export function maybePromptMissionPushConsent() {
  if (hasAgreed("mission")) return;
  void requestPushConsent("HOME", "mission");
}
