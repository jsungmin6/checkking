import { API_BASE_URL, TOKEN_KEYS } from "../constants";
import type { ApiResponse, TokenRefreshResponse } from "../types";

function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.REFRESH);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEYS.ACCESS, access);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
}

export function clearTokens() {
  console.log("[등교왕] 토큰 삭제");
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) {
    console.log("[등교왕] 토큰 갱신 이미 진행 중, 대기");
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.log("[등교왕] refresh token 없음, 갱신 불가");
      return false;
    }

    try {
      console.log("[등교왕] 토큰 갱신 시도");
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        console.log("[등교왕] 토큰 갱신 실패:", res.status);
        return false;
      }

      const json = (await res.json()) as ApiResponse<TokenRefreshResponse>;
      if (!json.success) {
        console.log("[등교왕] 토큰 갱신 응답 실패:", json);
        return false;
      }

      setTokens(json.data.accessToken, json.data.refreshToken);
      console.log("[등교왕] 토큰 갱신 성공");
      return true;
    } catch (e) {
      console.error("[등교왕] 토큰 갱신 에러:", e);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method ?? "GET";
  console.log(`[등교왕] API ${method} ${path}`);
  const startTime = Date.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error(`[등교왕] API ${method} ${path} TIMEOUT (${elapsed}ms)`);
      throw new ApiError("TIMEOUT", "서버 응답 시간이 초과되었습니다", 0);
    }
    console.error(`[등교왕] API ${method} ${path} NETWORK ERROR (${elapsed}ms):`, e);
    throw e;
  }

  const elapsed = Date.now() - startTime;

  if (res.status === 401 && token) {
    console.log(`[등교왕] API ${method} ${path} 401 → 토큰 갱신 시도`);
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      res = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers });
    } else {
      console.log(`[등교왕] API ${method} ${path} 토큰 갱신 실패 → 로그아웃`);
    }
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    console.error(`[등교왕] API ${method} ${path} ${res.status} ERROR (${elapsed}ms):`, json.error);
    throw new ApiError(json.error.code, json.error.message, res.status);
  }

  console.log(`[등교왕] API ${method} ${path} ${res.status} OK (${elapsed}ms)`);
  return json.data;
}
