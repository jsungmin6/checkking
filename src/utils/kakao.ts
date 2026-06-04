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

export interface KakaoLoginResult {
  accessToken: string;
  refreshToken?: string;
}

export async function startKakaoLogin(): Promise<KakaoLoginResult | null> {
  console.log("[등교왕] 카카오 로그인 시작, capacitor:", isCapacitor());

  if (isCapacitor()) {
    // iOS: capacitor-kakao-login-plugin (네이티브 SDK)
    const { KakaoLoginPlugin } = await import("capacitor-kakao-login-plugin");
    console.log("[등교왕] iOS 카카오 네이티브 SDK 로그인");
    const result = await KakaoLoginPlugin.goLogin();
    console.log("[등교왕] iOS 카카오 로그인 결과:", result.accessToken ? "토큰 획득" : "실패");
    return { accessToken: result.accessToken, refreshToken: result.refreshToken };
  } else {
    // 웹: JS SDK 리다이렉트 방식 (기존)
    ensureInitialized();
    window.Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI });
    return null; // 리다이렉트되므로 여기서 반환 안 됨
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
