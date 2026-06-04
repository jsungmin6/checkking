import { KAKAO_JS_KEY, KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY, KAKAO_SERVER_CALLBACK_URL } from "../constants";
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
  console.log("[등교왕] 카카오 로그인 시작, capacitor:", isCapacitor());

  if (isCapacitor()) {
    // iOS: 서버 콜백 방식
    // REST API Key로 인가코드 요청 → 서버가 직접 code 수신 → JWT 발급 → checkking:// 스킴으로 앱에 전달
    const { Browser } = await import("@capacitor/browser");
    const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(KAKAO_SERVER_CALLBACK_URL)}&response_type=code`;
    console.log("[등교왕] iOS 서버 콜백 카카오 로그인:", authUrl);
    await Browser.open({ url: authUrl, presentationStyle: "popover" });
  } else {
    // 웹: JS SDK 리다이렉트 방식
    ensureInitialized();
    window.Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI });
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
