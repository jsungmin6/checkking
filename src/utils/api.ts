import { API_BASE_URL, TOKEN_KEYS } from "../constants";
import { isTossApp } from "./platform";
import { customEmojiMarker } from "./emoji";
import type { ApiResponse, TokenRefreshResponse } from "../types";

function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.REFRESH);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEYS.ACCESS, access);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
  // localStorage는 토스 딥링크 진입 등으로 웹뷰 인스턴스가 달라지면 유지가 안 될 수 있어서,
  // 토스 앱의 네이티브 저장소(앱 단위로 유지됨)에도 같이 보관해둔다. 실패해도 조용히 무시.
  if (isTossApp()) {
    void (async () => {
      try {
        const { Storage } = await import("@apps-in-toss/web-framework");
        await Storage.setItems({ [TOKEN_KEYS.ACCESS]: access, [TOKEN_KEYS.REFRESH]: refresh });
      } catch { /* ignore */ }
    })();
  }
}

export function clearTokens() {
  console.log("[등교왕] 토큰 삭제");
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
  if (isTossApp()) {
    void (async () => {
      try {
        const { Storage } = await import("@apps-in-toss/web-framework");
        await Storage.removeItem(TOKEN_KEYS.ACCESS);
        await Storage.removeItem(TOKEN_KEYS.REFRESH);
      } catch { /* ignore */ }
    })();
  }
}

/**
 * localStorage에 토큰이 없을 때, 토스 네이티브 저장소에서 복구를 시도한다.
 * 딥링크 등으로 새 웹뷰 인스턴스가 떠서 localStorage가 비어있는 경우를 위한 폴백.
 * 복구했으면 true를 반환한다.
 */
export async function restoreTokensFromTossStorage(): Promise<boolean> {
  if (!isTossApp()) return false;
  if (getAccessToken()) return false;
  try {
    const { Storage } = await import("@apps-in-toss/web-framework");
    const items = await Storage.getItems([TOKEN_KEYS.ACCESS, TOKEN_KEYS.REFRESH]);
    const access = items[TOKEN_KEYS.ACCESS];
    const refresh = items[TOKEN_KEYS.REFRESH];
    if (!access || !refresh) return false;
    localStorage.setItem(TOKEN_KEYS.ACCESS, access);
    localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
    return true;
  } catch {
    return false;
  }
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
// 방을 넉넉히 두어 "하루 3회 상한", 홈/방 찾기 리스트가 길어질 때 하단 탭바 고정 여부 같은 걸 로컬에서 테스트할 수 있게 한다.
const DEV_ROOM_COUNT = 20;
const DEV_ROOM_IDS = Array.from({ length: DEV_ROOM_COUNT }, (_, i) => -(i + 1));
const DEV_ROOM_NAMES = new Map<number, string>(DEV_ROOM_IDS.map((id) => [id, `로컬 미리보기 방 ${-id}`]));
const SHOWCASE_MY_ROOM_NAMES: Record<number, string> = {
  [-1]: "아침 기상 챌린지",
  [-2]: "스터디카페 출첵방",
  [-3]: "헬스 루틴 인증",
  [-4]: "매일 영어 한마디",
  [-5]: "미라클모닝 6시반",
  [-6]: "달리기 모임 새벽반",
  [-7]: "다이어트 같이해요",
  [-8]: "자격증 공부방",
};
for (const [id, name] of Object.entries(SHOWCASE_MY_ROOM_NAMES)) {
  DEV_ROOM_NAMES.set(Number(id), name);
}

// 방 찾기 화면 스크롤 테스트용 가짜 공개방 목록
const DEV_PUBLIC_ROOM_IDS = Array.from({ length: 15 }, (_, i) => -(100 + i));
const devCheckInCount = new Map<number, number>(DEV_ROOM_IDS.map((id) => [id, 0]));
const devDailyRank = new Map<number, number | null>(DEV_ROOM_IDS.map((id) => [id, null]));
const devAnnouncement = new Map<number, string>();
const devGreetings = new Map<number, Array<{ greetingId: number; userId: number; nickname: string; content: string; imageAvailable?: boolean; imageDataUrl?: string; reportCount: number; hidden: boolean; mine: boolean; createdAt: string }>>();
let devGreetingSeq = 1000;

function seedTime(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

// 출석인사 탭 UI/스크롤 점검용 — 이모지만/이모지+코멘트/코멘트만 3가지 조합을 방 1에 미리 채워둔다.
devGreetings.set(-1, [
  { greetingId: 12, userId: -2, nickname: "하준", content: "이제 막 출석했어요, 오늘 하루도 모두 힘내봐요", reportCount: 0, hidden: false, mine: false, createdAt: seedTime(93) },
  { greetingId: 11, userId: -3, nickname: "서연", content: customEmojiMarker("wellwish-frog"), reportCount: 0, hidden: false, mine: false, createdAt: seedTime(84) },
  { greetingId: 10, userId: -1, nickname: "민준", content: `${customEmojiMarker("attendance-penguin")} 할수있다`, reportCount: 0, hidden: false, mine: false, createdAt: seedTime(75) },
  { greetingId: 9, userId: -5, nickname: "아린", content: "오늘 7시에 일어나서 출석했어요!", reportCount: 0, hidden: false, mine: false, createdAt: seedTime(66) },
  { greetingId: 8, userId: -4, nickname: "지우", content: `${customEmojiMarker("wellwish-cloud")} 날씨 좋네요 다들 화이팅`, reportCount: 0, hidden: false, mine: false, createdAt: seedTime(57) },
  { greetingId: 7, userId: -2, nickname: "하준", content: customEmojiMarker("together-rabbit-tortoise"), reportCount: 0, hidden: false, mine: false, createdAt: seedTime(48) },
  { greetingId: 6, userId: -3, nickname: "서연", content: "늦잠 잘뻔했는데 겨우 출석했어요 ㅠㅠ", reportCount: 0, hidden: false, mine: false, createdAt: seedTime(40) },
  { greetingId: 5, userId: -1, nickname: "민준", content: `${customEmojiMarker("hello-rabbit")} 굿모닝`, reportCount: 0, hidden: false, mine: true, createdAt: seedTime(31) },
  { greetingId: 4, userId: -5, nickname: "아린", content: customEmojiMarker("morning-hamster"), reportCount: 1, hidden: false, mine: false, createdAt: seedTime(24) },
  { greetingId: 3, userId: -4, nickname: "지우", content: "출석 완료! 다들 좋은 하루 보내세요", reportCount: 0, hidden: false, mine: false, createdAt: seedTime(16) },
  { greetingId: 2, userId: -2, nickname: "하준", content: `${customEmojiMarker("cheer-puppy")} 오늘도 화이팅입니다!`, reportCount: 0, hidden: false, mine: false, createdAt: seedTime(9) },
  { greetingId: 1, userId: -3, nickname: "서연", content: customEmojiMarker("attendance-rabbit"), reportCount: 0, hidden: false, mine: false, createdAt: seedTime(2) },
]);
devGreetingSeq = 100;

/** "로컬 미리보기" 버튼을 누를 때마다 호출 — 다시 출석할 수 있도록 상태를 초기화한다 */
export function resetDevPreview() {
  for (const id of DEV_ROOM_IDS) {
    devCheckInCount.set(id, 0);
    devDailyRank.set(id, null);
    localStorage.removeItem(`att-points-claimed-date-${id}`);
  }
  // 방 구분 없이 하루 전체 상한(최대 3번)을 추적하는 키 — 이것도 같이 안 지우면
  // 한 번 다 써버린 뒤로는 새로고침해도 계속 선물상자가 안 뜬다.
  localStorage.removeItem("att-points-reward-daily");
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
  { rank: 6, userId: -6, nickname: "도윤", avgRank: 4.2, totalPresent: 14, totalDays: 20 },
  { rank: 7, userId: -7, nickname: "시우", avgRank: 4.9, totalPresent: 13, totalDays: 20 },
  { rank: 8, userId: -8, nickname: "유나", avgRank: 5.3, totalPresent: 11, totalDays: 20 },
  { rank: 9, userId: -9, nickname: "건우", avgRank: 5.8, totalPresent: 10, totalDays: 20 },
  { rank: 10, userId: -10, nickname: "예은", avgRank: 6.4, totalPresent: 9, totalDays: 20 },
  { rank: 11, userId: -11, nickname: "로운", avgRank: 7.1, totalPresent: 8, totalDays: 20 },
  { rank: 12, userId: -12, nickname: "하율", avgRank: 7.9, totalPresent: 7, totalDays: 20 },
];

const ROOM1_MONTHLY_DAYS = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20];
const ROOM1_MONTHLY_TIMES = ["07:58:12", "08:10:45", "07:45:03", "08:25:30", "07:50:19"];
const ROOM1_MONTHLY_RANKS = [1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1, 3];

function devMock(path: string, method: string, body?: string): unknown | undefined {
  if (!import.meta.env.DEV) return undefined;

  if (path === "/notifications/feedback" && method === "POST") {
    return { received: true };
  }
  if (path === "/notifications/mission-completed" && method === "POST") {
    return { received: true };
  }
  if (path === "/notifications/review-prompt" && method === "POST") {
    return { received: true };
  }
  if (path === "/diagnostics/app-entry" && method === "POST") {
    return { received: true };
  }

  if (path === "/classrooms/my") {
    // ?emptyRooms=1 로 열면 "참여한 방이 없는" 첫 화면을 로컬에서 확인할 수 있다.
    if (new URLSearchParams(window.location.search).get("emptyRooms") === "1") {
      return { classrooms: [] };
    }
    return { classrooms: DEV_ROOM_IDS.map((id) => ({
      classroomId: id, name: DEV_ROOM_NAMES.get(id), ownerId: -1, ownerNickname: "민준",
      // 방장/참여자 표시를 둘 다 확인할 수 있게 홀수 방만 방장으로 둔다.
      isOwner: -id % 2 === 1, memberCount: 3, maxMembers: 100, todayCheckedIn: (devCheckInCount.get(id) ?? 0) > 0,
      todayRank: devDailyRank.get(id) ?? null, isPublic: false, inviteCode: `PREVIEW${-id}`,
      joined: true, isDemo: true,
      // 인증 태그와 안 읽은 인사 점이 섞여 보이는지 확인할 수 있게 방마다 다르게 둔다.
      validationType: -id % 3 === 1 ? "PHOTO" : -id % 3 === 2 ? "GPS" : "NONE",
      latestGreetingId: id === -1 ? 12 : -id % 4 === 0 ? 5 : null,
    })) };
  }

  if (path === "/classrooms/public") {
    const SHOWCASE_ROOMS = [
      { name: "광교숲도서관 출석", owner: "유재원", memberCount: 17, maxMembers: 30 },
      { name: "50대 파이어~!", owner: "김민정", memberCount: 8, maxMembers: 30 },
      { name: "산책", owner: "이경민", memberCount: 8, maxMembers: 30 },
      { name: "미라클모닝 6시반", owner: "박서준", memberCount: 24, maxMembers: 30 },
      { name: "스터디카페 출첵방", owner: "정윤우", memberCount: 12, maxMembers: 20 },
      { name: "헬스 루틴 인증", owner: "최하은", memberCount: 19, maxMembers: 30 },
      { name: "직장인 아침독서", owner: "강지호", memberCount: 6, maxMembers: 15 },
      { name: "매일 영어 한마디", owner: "윤서아", memberCount: 15, maxMembers: 30 },
      { name: "달리기 모임 새벽반", owner: "임도윤", memberCount: 9, maxMembers: 20 },
      { name: "출석왕 도전방", owner: "한소율", memberCount: 22, maxMembers: 30 },
      { name: "다이어트 같이해요", owner: "오은우", memberCount: 11, maxMembers: 25 },
      { name: "자격증 공부방", owner: "신예린", memberCount: 7, maxMembers: 15 },
      { name: "요가 조식 인증", owner: "배수민", memberCount: 13, maxMembers: 20 },
      { name: "코딩테스트 매일풀이", owner: "조민재", memberCount: 18, maxMembers: 30 },
      { name: "등산 동호회 주말반", owner: "홍지유", memberCount: 10, maxMembers: 25 },
    ];
    return { classrooms: DEV_PUBLIC_ROOM_IDS.map((id, i) => {
      const room = SHOWCASE_ROOMS[i % SHOWCASE_ROOMS.length]!;
      return {
        classroomId: id, name: room.name, ownerId: id, ownerNickname: room.owner,
        isOwner: false, memberCount: room.memberCount, maxMembers: room.maxMembers, todayCheckedIn: false,
        // 암호방 배지가 섞여 보이는지 확인할 수 있게 3개마다 하나는 비공개로 둔다.
        todayRank: null, isPublic: i % 3 !== 1, inviteCode: `PUBLIC${-id}`, joined: false, isDemo: false,
        validationType: i % 4 === 0 ? "PHOTO" : i % 4 === 2 ? "GPS" : "NONE",
      };
    }) };
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
      memberCount: id === -1 ? DEV_MEMBERS.length : 3, maxMembers: 100, createdAt: "2026-10-01T00:00:00",
      announcement: devAnnouncement.get(id) ?? null,
      latestGreetingId: (devGreetings.get(id) ?? []).reduce((max, g) => Math.max(max, g.greetingId), 0) || null,
    };
  }
  if (sub === "/announcement" && method === "PUT") {
    return { classroomId: id, announcement: "" };
  }
  if (sub === "/greetings" && method === "GET") {
    return { greetings: devGreetings.get(id) ?? [] };
  }
  if (sub === "/greetings" && method === "POST") {
    const list = devGreetings.get(id) ?? [];
    let content = "(새 인사)";
    let parsed: { content?: string; imageBase64?: string } | null = null;
    try {
      parsed = body ? JSON.parse(body) : null;
      if (parsed?.content) content = parsed.content;
    } catch { /* ignore */ }
    const greeting = {
      greetingId: devGreetingSeq++, userId: -1, nickname: "민준", content,
      imageAvailable: !!parsed?.imageBase64,
      imageDataUrl: parsed?.imageBase64 ? `data:image/jpeg;base64,${parsed.imageBase64}` : undefined,
      reportCount: 0, hidden: false, mine: true, createdAt: new Date().toISOString(),
    };
    devGreetings.set(id, [...list, greeting]);
    return greeting;
  }
  const reportMatch = sub.match(/^\/greetings\/(\d+)\/report$/);
  if (reportMatch && method === "POST") {
    const gid = Number(reportMatch[1]);
    const list = devGreetings.get(id) ?? [];
    const found = list.find((g) => g.greetingId === gid);
    if (found) found.reportCount++;
    return { reportCount: found?.reportCount ?? 0 };
  }
  const hideMatch = sub.match(/^\/greetings\/(\d+)\/hide$/);
  if (hideMatch && method === "PUT") {
    const gid = Number(hideMatch[1]);
    const list = devGreetings.get(id) ?? [];
    const found = list.find((g) => g.greetingId === gid);
    if (found) { found.hidden = true; found.content = "삭제된 코멘트입니다"; }
    return { hidden: true };
  }
  const editMatch = sub.match(/^\/greetings\/(\d+)$/);
  if (editMatch && method === "PUT") {
    const gid = Number(editMatch[1]);
    const list = devGreetings.get(id) ?? [];
    const found = list.find((g) => g.greetingId === gid);
    try {
      const parsed = body ? JSON.parse(body) : null;
      if (found && parsed) {
        if (parsed.content) found.content = parsed.content;
        if (parsed.imageBase64) {
          found.imageAvailable = true;
          found.imageDataUrl = `data:image/jpeg;base64,${parsed.imageBase64}`;
        } else if (parsed.removeImage) {
          found.imageAvailable = false;
          found.imageDataUrl = undefined;
        }
      }
    } catch { /* ignore */ }
    return found;
  }
  if (editMatch && method === "DELETE") {
    const gid = Number(editMatch[1]);
    const list = devGreetings.get(id) ?? [];
    devGreetings.set(id, list.filter((g) => g.greetingId !== gid));
    return { deleted: true };
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
  if (sub === "/members") {
    return { members: DEV_MEMBERS.slice(0, 3).map((m) => ({ ...m, isOwner: m.userId === -1, joinedAt: "2026-10-01T00:00:00" })) };
  }
  const memberStatsMatch = sub.match(/^\/statistics\/members\/(-?\d+)$/);
  if (memberStatsMatch) {
    // 프로필 모달 확인용 — 사람마다 다른 수치가 보이도록 userId 로 조금씩 흔든다.
    const targetId = Number(memberStatsMatch[1]);
    const spread = Math.abs(targetId) % 5;
    return {
      userId: targetId, nickname: "멤버", classroomId: id,
      avgRank: Math.round((1.4 + spread * 0.6) * 10) / 10, avgCheckInTime: `0${6 + (spread % 3)}:${String(10 + spread * 7).padStart(2, "0")}:00`,
      totalPresent: 24 - spread * 3, firstPlaceCount: 7 - spread, topThreeCount: 15 - spread * 2,
      currentStreak: 9 - spread, earliestCheckIn: "05:12:00", latestCheckIn: "08:58:00",
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
      checkInTime: "09:00:00", dailyRank: rank, totalCheckedIn: 1, totalMembers: 3, status: "PRESENT", myTotalCheckIns: 7,
    };
  }
  return undefined;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const mocked = devMock(path, method, options.body as string | undefined);
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

/** 인증이 필요한 이미지 같은 바이너리 응답을 받아요. */
export async function apiBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetchWithTimeout(`${API_BASE_URL}${path}`, { headers });
  if (res.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getAccessToken()}`;
      res = await fetchWithTimeout(`${API_BASE_URL}${path}`, { headers });
    }
  }

  if (!res.ok) {
    let message = "사진을 불러오지 못했어요";
    try {
      const json = await res.json() as ApiResponse<unknown>;
      if (!json.success) message = json.error.message;
    } catch { /* 바이너리 오류 응답이면 기본 문구를 사용해요. */ }
    throw new ApiError("IMAGE_LOAD_FAILED", message, res.status);
  }
  return res.blob();
}
