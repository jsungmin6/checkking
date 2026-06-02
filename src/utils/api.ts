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
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const json = (await res.json()) as ApiResponse<TokenRefreshResponse>;
      if (!json.success) return false;

      setTokens(json.data.accessToken, json.data.refreshToken);
      return true;
    } catch {
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

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    }
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, res.status);
  }

  return json.data;
}
