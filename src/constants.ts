export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081/api";

export const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? "";
export const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI ?? `${window.location.origin}/oauth/kakao`;

export const TOKEN_KEYS = {
  ACCESS: "access_token",
  REFRESH: "refresh_token",
} as const;
