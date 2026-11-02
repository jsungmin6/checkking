import { getSchemeUri } from "@apps-in-toss/web-framework";
import { TOKEN_KEYS } from "../constants";

const REFERRER_ENDPOINT = "https://chesscode.duckdns.org/api/attendance/diagnostics/referrer";

let reported = false;
let reportedWithUser = false;
/** 이번 실행에서 읽은 진입 경로. 로그인 뒤 다시 보낼 때 쓴다. */
let entryReferrer: string | null = null;

function readReferrer(): string | null {
  try {
    return new URL(getSchemeUri()).searchParams.get("referrer");
  } catch {
    // 경로를 못 읽어도 진입 자체는 남긴다. 그래야 "알 수 없음"도 셀 수 있다.
    return null;
  }
}

function send(referrer: string | null, token?: string | null) {
  void fetch(REFERRER_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ appName: "checkking", referrer }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * 앱을 연 경로를 한 번 남긴다. **로그인 전이라 누구인지는 아직 모른다.**
 *
 * 로그인까지 가지 않고 나가는 사람도 세야 하므로 여기서 먼저 보낸다.
 */
export function reportAppEntryReferrer(appName: string): void {
  if (reported) return;
  reported = true;
  if (typeof navigator === "undefined" || !navigator.userAgent.includes("TossApp")) return;
  if (appName !== "checkking") return;

  entryReferrer = readReferrer();
  send(entryReferrer);
}

/**
 * 로그인한 뒤 같은 경로를 한 번 더 보낸다. **이번에는 토큰을 실어 userId가 남는다.**
 *
 * 진입 로그만으로는 "이 경로로 들어온 사람이 무엇을 했는지"를 이을 수 없다. 서버가
 * 토큰에서 userId를 꺼내 함께 적어 두면, 이후 요청 로그(user=…)와 연결된다.
 *
 * 실행당 한 번만 보낸다. 실패해도 조용히 넘어간다 — 통계용이라 본 흐름을 막지 않는다.
 */
export function reportEntryReferrerWithUser(): void {
  if (reportedWithUser) return;
  if (typeof navigator === "undefined" || !navigator.userAgent.includes("TossApp")) return;

  const token = localStorage.getItem(TOKEN_KEYS.ACCESS);
  if (!token) return;

  reportedWithUser = true;
  send(entryReferrer ?? readReferrer(), token);
}
