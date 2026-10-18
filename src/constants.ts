// === 환경별 API URL 자동 결정 ===
// 우선순위: 환경변수 > 자동 감지
function resolveApiBaseUrl(): string {
  // 1. Capacitor 네이티브 앱 (iOS)
  if ((window as unknown as Record<string, unknown>).Capacitor) {
    return "https://chesscode.duckdns.org/api/attendance";
  }

  // 2. 앱인토스 (토스 앱 내 웹뷰)
  if (navigator.userAgent.includes("TossApp")) {
    return "https://chesscode.duckdns.org/api/attendance";
  }

  // 3. 라이브 배포 (Vercel 등)
  if (window.location.hostname.includes("vercel.app")) {
    return "https://chesscode.duckdns.org/api/attendance";
  }

  // 4. 로컬 개발 (PC 브라우저 + 로컬 서버)
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
export const KAKAO_SERVER_CALLBACK_URL = "https://chesscode.duckdns.org/api/attendance/auth/callback/kakao";
export const KAKAO_REST_API_KEY = "7149559f898939399037a8ffc2b64d17";

export const TOKEN_KEYS = {
  ACCESS: "access_token",
  REFRESH: "refresh_token",
} as const;
