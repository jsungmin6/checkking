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

// TEMP dev-only mock data for the "로컬 미리보기" bypass. Remove before shipping.
// 방 4개(-1~-4)를 두어 "하루 3회 상한" 같은 여러 방 넘나드는 동작을 로컬에서 테스트할 수 있게 한다.
const DEV_ROOM_IDS = [-1, -2, -3, -4];
const DEV_ROOM_NAMES = new Map<number, string>([
  [-1, "로컬 미리보기 방 1"], [-2, "로컬 미리보기 방 2"], [-3, "로컬 미리보기 방 3"], [-4, "로컬 미리보기 방 4"],
]);
const devCheckInCount = new Map<number, number>(DEV_ROOM_IDS.map((id) => [id, 0]));
const devDailyRank = new Map<number, number | null>(DEV_ROOM_IDS.map((id) => [id, null]));

/** "로컬 미리보기" 버튼을 누를 때마다 호출 — 다시 출석할 수 있도록 상태를 초기화한다 */
export function resetDevPreview() {
  for (const id of DEV_ROOM_IDS) {
    devCheckInCount.set(id, 0);
    devDailyRank.set(id, null);
    localStorage.removeItem(`att-points-claimed-date-${id}`);
    localStorage.removeItem(`att-points-streak-${id}`);
  }
}

const DEV_MEMBERS = [
  { userId: -1, nickname: "민준" },
  { userId: -2, nickname: "하준" },
  { userId: -3, nickname: "서연" },
];

function devMock(path: string, method: string): unknown | undefined {
  if (!import.meta.env.DEV) return undefined;

  if (path === "/classrooms/my") {
    return { classrooms: DEV_ROOM_IDS.map((id) => ({
      classroomId: id, name: DEV_ROOM_NAMES.get(id), ownerId: -1, ownerNickname: "민준",
      isOwner: true, memberCount: 3, maxMembers: 50, todayCheckedIn: (devCheckInCount.get(id) ?? 0) > 0,
      todayRank: devDailyRank.get(id) ?? null, isPublic: false, inviteCode: `PREVIEW${-id}`,
      joined: true, isDemo: true,
    })) };
  }

  const roomMatch = path.match(/^\/classrooms\/(-[1-4])(\/.*)?$/);
  if (!roomMatch) return undefined;
  const id = Number(roomMatch[1]);
  const sub = roomMatch[2] ?? "";
  const checkedIn = (devCheckInCount.get(id) ?? 0) > 0;

  if (sub === "") {
    return {
      classroomId: id, name: DEV_ROOM_NAMES.get(id), inviteCode: `PREVIEW${-id}`, ownerId: -1, ownerNickname: "민준",
      validationType: "NONE", gpsConfig: null, wifiConfig: null,
      checkInStartTime: null, checkInEndTime: null, includeWeekends: true, isPublic: false,
      memberCount: 3, createdAt: "2026-10-01T00:00:00",
    };
  }
  if (sub === "/attendance/today") {
    const rank = devDailyRank.get(id) ?? null;
    return {
      date: "2026-10-20",
      myRank: rank,
      myCheckInTime: checkedIn ? "09:00:00" : null,
      totalCheckedIn: checkedIn ? 1 : 0,
      totalMembers: 3,
      rankings: checkedIn ? [{ rank, userId: -1, nickname: "민준", checkInTime: "09:00:00", status: "PRESENT" }] : [],
      absentMembers: DEV_MEMBERS.filter((m) => !checkedIn || m.userId !== -1).map((m) => ({ ...m, status: "ABSENT" })),
    };
  }
  if (sub === "/attendance/check-in" && method === "POST") {
    const nextCount = (devCheckInCount.get(id) ?? 0) + 1;
    const rank = Math.floor(Math.random() * 3) + 1; // 로컬 테스트용: 1~3등을 랜덤으로 순환 확인
    devCheckInCount.set(id, nextCount);
    devDailyRank.set(id, rank);
    return {
      attendanceId: nextCount, classroomId: id, checkInDate: "2026-10-20",
      checkInTime: "09:00:00", dailyRank: rank, totalCheckedIn: 1, totalMembers: 3, status: "PRESENT",
    };
  }
  return undefined;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const mocked = devMock(path, method);
  if (mocked !== undefined) return mocked as T;
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
