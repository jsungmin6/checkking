// === 환경별 API URL 자동 결정 ===
// 우선순위: 환경변수 > 자동 감지
function resolveApiBaseUrl(): string {
  // 1. 환경변수가 명시적으로 설정되어 있으면 그걸 사용
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  // 2. 라이브 배포 (Vercel 등)
  if (window.location.hostname.includes("vercel.app")) {
    // TODO: 서버 라이브 배포 후 실제 도메인으로 변경
    return "https://chesscode.duckdns.org/api";
  }

  // 3. 로컬 개발 (PC 브라우저 + 로컬 서버)
  return "http://localhost:8081/api";
}

function resolveKakaoRedirectUri(): string {
  const envUri = import.meta.env.VITE_KAKAO_REDIRECT_URI;
  if (envUri) return envUri;

  return `${window.location.origin}/oauth/kakao`;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? "";
export const KAKAO_REDIRECT_URI = resolveKakaoRedirectUri();

// iOS 서버 콜백 URL (REST API Key 사용)
export const KAKAO_SERVER_CALLBACK_URL = "https://chesscode.duckdns.org/api/auth/callback/kakao";
export const KAKAO_REST_API_KEY = "7149559f898939399037a8ffc2b64d17";

export const TOKEN_KEYS = {
  ACCESS: "access_token",
  REFRESH: "refresh_token",
} as const;
