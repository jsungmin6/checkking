import { KAKAO_JS_KEY, KAKAO_REDIRECT_URI } from "../constants";
import { isCapacitor } from "./platform";

declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        authorize: (options: { redirectUri: string }) => void;
      };
    };
  }
}

function ensureInitialized() {
  if (!window.Kakao) {
    throw new Error("카카오 SDK가 로드되지 않았습니다");
  }
  if (!KAKAO_JS_KEY) {
    throw new Error("VITE_KAKAO_JS_KEY가 설정되지 않았습니다");
  }
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JS_KEY);
  }
}

export async function startKakaoLogin() {
  const redirectUri = KAKAO_REDIRECT_URI;
  console.log("[등교왕] 카카오 로그인 시작, capacitor:", isCapacitor(), "redirect:", redirectUri);

  if (isCapacitor()) {
    // iOS Capacitor: 외부 Safari 브라우저로 카카오 로그인
    // Safari에서 카카오 로그인 → 카카오톡 앱 인증 → 리다이렉트 → 앱으로 복귀
    const { Browser } = await import("@capacitor/browser");
    const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_JS_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    console.log("[등교왕] iOS Safari로 카카오 로그인:", authUrl);

    await Browser.open({
      url: authUrl,
      presentationStyle: "popover",
    });
  } else {
    // 웹 브라우저: 카카오 JS SDK 사용
    ensureInitialized();
    window.Kakao.Auth.authorize({ redirectUri });
  }
}

export function getKakaoCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("code");
}

export function clearKakaoCodeFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  window.history.replaceState({}, "", url.toString());
}
