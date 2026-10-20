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
// 방을 넉넉히 두어 "하루 3회 상한", 홈/오픈방 리스트가 길어질 때 하단 탭바 고정 여부 같은 걸 로컬에서 테스트할 수 있게 한다.
const DEV_ROOM_COUNT = 20;
const DEV_ROOM_IDS = Array.from({ length: DEV_ROOM_COUNT }, (_, i) => -(i + 1));
const DEV_ROOM_NAMES = new Map<number, string>(DEV_ROOM_IDS.map((id) => [id, `로컬 미리보기 방 ${-id}`]));

// 오픈방 화면 스크롤 테스트용 가짜 공개방 목록
const DEV_PUBLIC_ROOM_IDS = Array.from({ length: 15 }, (_, i) => -(100 + i));
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
  { userId: -4, nickname: "지우" },
  { userId: -5, nickname: "아린" },
];

// 방 1(-1)은 순위/랭킹/통계 디자인 점검용으로 가짜 멤버·기록을 채워둔다.
const ROOM1_OTHERS_TODAY = [
  { userId: -2, nickname: "하준", checkInTime: "07:42:10" },
  { userId: -4, nickname: "지우", checkInTime: "07:55:03" },
  { userId: -5, nickname: "아린", checkInTime: "08:31:47" },
];

function buildRoom1Today(checkedIn: boolean, myCheckInTime: string | null) {
  const entries = ROOM1_OTHERS_TODAY.map((m) => ({ ...m, status: "PRESENT" as const }));
  if (checkedIn) entries.push({ userId: -1, nickname: "민준", checkInTime: myCheckInTime ?? "09:00:00", status: "PRESENT" as const });
  entries.sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));
  const rankings = entries.map((e, i) => ({ rank: i + 1, ...e }));
  const me = rankings.find((r) => r.userId === -1);
  const absentMembers = [{ userId: -3, nickname: "서연", status: "ABSENT" as const }];
  if (!checkedIn) absentMembers.unshift({ userId: -1, nickname: "민준", status: "ABSENT" as const });
  return {
    date: "2026-10-20",
    myRank: me?.rank ?? null,
    myCheckInTime: me?.checkInTime ?? null,
    totalCheckedIn: rankings.length,
    totalMembers: DEV_MEMBERS.length,
    rankings,
    absentMembers,
  };
}

const ROOM1_MONTHLY_RANKING = [
  { rank: 1, userId: -2, nickname: "하준", avgRank: 1.4, totalPresent: 18, totalDays: 20 },
  { rank: 2, userId: -4, nickname: "지우", avgRank: 2.1, totalPresent: 19, totalDays: 20 },
  { rank: 3, userId: -1, nickname: "민준", avgRank: 2.6, totalPresent: 17, totalDays: 20 },
  { rank: 4, userId: -5, nickname: "아린", avgRank: 3.0, totalPresent: 15, totalDays: 20 },
  { rank: 5, userId: -3, nickname: "서연", avgRank: 3.8, totalPresent: 12, totalDays: 20 },
];

const ROOM1_MONTHLY_DAYS = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20];
const ROOM1_MONTHLY_TIMES = ["07:58:12", "08:10:45", "07:45:03", "08:25:30", "07:50:19"];
const ROOM1_MONTHLY_RANKS = [1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1, 3];

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

  if (path === "/classrooms/public") {
    return { classrooms: DEV_PUBLIC_ROOM_IDS.map((id, i) => ({
      classroomId: id, name: `로컬 오픈방 ${i + 1}`, ownerId: id, ownerNickname: `방장${i + 1}`,
      isOwner: false, memberCount: (i % 20) + 1, maxMembers: 20, todayCheckedIn: false,
      todayRank: null, isPublic: true, inviteCode: `PUBLIC${-id}`, joined: false, isDemo: false,
    })) };
  }

  const roomMatch = path.match(/^\/classrooms\/(-\d+)(\/.*)?$/);
  if (!roomMatch) return undefined;
  const id = Number(roomMatch[1]);
  if (!DEV_ROOM_IDS.includes(id)) return undefined;
  const sub = roomMatch[2] ?? "";
  const checkedIn = (devCheckInCount.get(id) ?? 0) > 0;

  if (sub === "") {
    return {
      classroomId: id, name: DEV_ROOM_NAMES.get(id), inviteCode: `PREVIEW${-id}`, ownerId: -1, ownerNickname: "민준",
      validationType: "NONE", gpsConfig: null, wifiConfig: null,
      checkInStartTime: null, checkInEndTime: null, includeWeekends: true, isPublic: false,
      memberCount: id === -1 ? DEV_MEMBERS.length : 3, createdAt: "2026-10-01T00:00:00",
    };
  }
  if (sub === "/attendance/today") {
    if (id === -1) return buildRoom1Today(checkedIn, "09:00:00");
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
  if (id === -1 && sub.startsWith("/statistics/ranking")) {
    return { period: "MONTHLY", year: 2026, month: 10, criteria: "AVG_RANK", rankings: ROOM1_MONTHLY_RANKING };
  }
  if (id === -1 && sub.startsWith("/attendance/monthly")) {
    return ROOM1_MONTHLY_DAYS.map((d, i) => ({
      checkInDate: `2026-10-${String(d).padStart(2, "0")}`,
      checkInTime: ROOM1_MONTHLY_TIMES[i % ROOM1_MONTHLY_TIMES.length],
      dailyRank: ROOM1_MONTHLY_RANKS[i % ROOM1_MONTHLY_RANKS.length],
      status: "PRESENT",
    }));
  }
  if (sub === "/attendance/check-in" && method === "POST") {
    const nextCount = (devCheckInCount.get(id) ?? 0) + 1;
    // 방 1은 고정 시간(09:00)에 체크인하므로, 다른 멤버들 시간과 비교해 실제 순위를 일관되게 계산한다.
    const rank = id === -1 ? buildRoom1Today(true, "09:00:00").myRank ?? 1 : Math.floor(Math.random() * 3) + 1;
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
