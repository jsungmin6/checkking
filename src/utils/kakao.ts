import { KAKAO_JS_KEY, KAKAO_REDIRECT_URI } from "../constants";

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

export function startKakaoLogin() {
  ensureInitialized();
  window.Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI });
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
