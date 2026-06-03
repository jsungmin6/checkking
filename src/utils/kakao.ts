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

// REST API 키 기반 카카오 인가 URL 생성
function getKakaoAuthUrl(redirectUri: string): string {
  return `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_JS_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
}

export async function startKakaoLogin() {
  if (isCapacitor()) {
    // iOS Capacitor: 인앱 브라우저로 카카오 로그인
    // 리다이렉트 URI를 라이브 URL로 설정하고 앱으로 돌아오는 방식
    const { Browser } = await import("@capacitor/browser");
    const redirectUri = KAKAO_REDIRECT_URI;
    console.log("[등교왕] iOS 카카오 로그인 시작, redirect:", redirectUri);

    // 브라우저가 리다이렉트 URI로 돌아오면 감지
    const listener = await Browser.addListener("browserFinished", () => {
      console.log("[등교왕] iOS 인앱 브라우저 닫힘");
      listener.remove();
    });

    await Browser.open({ url: getKakaoAuthUrl(redirectUri) });
  } else {
    // 웹 브라우저: 기존 리다이렉트 방식
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
