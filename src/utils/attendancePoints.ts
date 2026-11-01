import { POINTS_TOTAL_KEY, readNumber, readStore, writeStore } from "./nativeStore";

/**
 * 출석점수의 단일 소스. **기기에 저장된 값이 진실이다.**
 *
 * 서버 원장으로 옮겼다가 되돌렸다. 앱인토스는 토스 앱 안에서만 도는 웹뷰고, 실제 돈
 * (토스포인트)의 지급 상한은 토스 콘솔이 강제한다. 출석점수는 그 지급의 입장권일 뿐이라
 * 서버 원장·잔액 테이블·이관 감사까지 둘 이유가 없었다. 그 구조는 Oracle 유니크 함정과
 * 트랜잭션 경계 문제로 하루에 네 번 장애를 냈다.
 *
 * 저장은 {@link ./nativeStore}를 쓴다 — `localStorage`가 아니라 앱인토스 네이티브
 * `Storage`가 진실이라, 웹뷰가 바뀌거나 딥링크로 들어와도 점수가 유지된다.
 *
 * **서버는 최초 1회만 본다.** 이미 서버 원장에 잔액이 쌓인 사용자를 위해 한 번
 * 내려받아 큰 쪽을 택하고, 그 뒤로는 서버를 보지 않는다.
 *
 * 여러 화면이 같은 값을 봐야 해서 모듈 수준 상태 + CustomEvent로 알린다.
 */

export const ATTENDANCE_POINTS_EVENT = "att-points-balance-change";

export type RewardKind = "WELCOME" | "STREAK" | "MISSION" | "CLOVER" | "FEEDBACK";

export interface ClaimRewardResult {
  amount: number;
  totalPoints: number;
  alreadyGiven: boolean;
}

export interface ClaimRewardOptions {
  /** 클로버 전용 — 황금 클로버는 보상이 더 크다. */
  golden?: boolean;
}

// ─── 보상 금액. 화면에 보이는 값과 같아야 한다 ──────────────────────────────

const WELCOME_POINTS = 10_000;
const FEEDBACK_POINTS = 5_000;
const MISSION_POINTS = 5_000;
const CLOVER_GOLDEN = { min: 2_000, max: 3_000 };
const CLOVER_NORMAL = { min: 800, max: 1_500 };

/** 1~7일차 도장. 8일차 이후는 {@link streakPoints}가 규칙으로 만든다. */
const FIRST_WEEK_STREAK_POINTS = [2_000, 5_000, 2_000, 5_000, 2_000, 5_000, 10_000];

export const MAX_STREAK_DAY = 100;

/** 토스포인트를 처음 받는 일차. */
export const FIRST_TOSS_REWARD_DAY = 7;
/** 첫 지급 이후 이 간격으로 받는다 — 7·12·17… */
export const TOSS_REWARD_INTERVAL = 5;

/**
 * 토스포인트를 함께 받는 일차인지. 7일차가 처음이고 그 뒤로 5일마다다(7·12·17…97).
 *
 * 지급 조건이자 보상 종류를 가르는 기준이라 {@link streakPoints}와 같은 곳에 둔다.
 */
export function isTossRewardDay(day: number): boolean {
  return day >= FIRST_TOSS_REWARD_DAY && (day - FIRST_TOSS_REWARD_DAY) % TOSS_REWARD_INTERVAL === 0;
}

/**
 * `streak`보다 뒤에 오는 가장 가까운 토스포인트 지급일. 더 없으면 null.
 *
 * "며칠만 더 출석하면 받는다"를 안내하는 데 쓴다. 지금 일차가 지급일이어도 그날은
 * 세지 않는다 — 아직 안 받았다면 "받을 수 있다"고 따로 알려야 할 상태다.
 */
export function nextTossRewardDay(streak: number): number | null {
  if (streak < FIRST_TOSS_REWARD_DAY) return FIRST_TOSS_REWARD_DAY;
  const elapsed = streak - FIRST_TOSS_REWARD_DAY;
  const next = FIRST_TOSS_REWARD_DAY + (Math.floor(elapsed / TOSS_REWARD_INTERVAL) + 1) * TOSS_REWARD_INTERVAL;
  return next > MAX_STREAK_DAY ? null : next;
}

/**
 * 그 일차에 받는 출석점수.
 *
 * **토스포인트를 받는 날에는 출석점수를 주지 않는다.** 둘 다 주면 보상이 겹쳐
 * 그날만 과하게 커진다. 그날의 보상은 현금성인 토스포인트 쪽이다.
 *
 * 나머지는 1~7일차 표를 따르고, 100일차 100,000 / 10의 배수 30,000 / 그 외 10,000이다.
 */
export function streakPoints(day: number): number {
  if (isTossRewardDay(day)) return 0;
  const firstWeek = FIRST_WEEK_STREAK_POINTS[day - 1];
  if (firstWeek !== undefined) return firstWeek;
  if (day === MAX_STREAK_DAY) return 100_000;
  return day % 10 === 0 ? 30_000 : 10_000;
}

// ─── 수령 기록(멱등) ────────────────────────────────────────────────────────

const WELCOME_GRANTED_KEY = "att-points-welcome-granted";
const FEEDBACK_GRANTED_KEY = "att-points-feedback-rewarded";
const MISSION_GRANTED_KEY = "att-mission-rewarded";
const CLOVER_GRANTED_KEY = "att-clover-rewarded";

function readList(key: string): string[] {
  try {
    const parsed = JSON.parse(readStore(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function appendToList(key: string, value: string, keep = 50) {
  const next = [...readList(key).filter((item) => item !== value), value].slice(-keep);
  writeStore(key, JSON.stringify(next));
}

// ─── 잔액 ──────────────────────────────────────────────────────────────────

let balance: number | null = null;

function publish(next: number) {
  const normalized = Math.max(0, Math.floor(next));
  balance = normalized;
  writeStore(POINTS_TOTAL_KEY, String(normalized));
  window.dispatchEvent(new CustomEvent(ATTENDANCE_POINTS_EVENT, { detail: normalized }));
}

/** 아직 저장소를 읽지 않았으면 null. 화면은 null일 때 숫자 대신 자리표시를 보여준다. */
export function getAttendancePoints(): number | null {
  return balance;
}

/** 저장소 값을 메모리로 올린다. nativeStore를 당겨온 뒤에 불러야 한다. */
export function loadAttendancePoints(): number {
  const stored = readNumber(POINTS_TOTAL_KEY, 0);
  publish(stored);
  return stored;
}

/** 점수를 더한다. 보상 지급의 공통 경로다. */
export function addPoints(amount: number): number {
  const next = Math.max(0, readNumber(POINTS_TOTAL_KEY, 0) + Math.floor(amount));
  publish(next);
  return next;
}

/**
 * 점수를 쓴다(복권 구매 등). 잔액이 부족하면 쓰지 않고 null.
 *
 * 저장소에서 바로 읽어 계산하므로, 모달 두 개가 떠 있어도 오래된 잔액으로 덮어쓰지 않는다.
 */
export function spendPoints(amount: number): number | null {
  const current = readNumber(POINTS_TOTAL_KEY, 0);
  if (amount <= 0 || current < amount) return null;
  const next = current - Math.floor(amount);
  publish(next);
  return next;
}

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * 저장소 값을 메모리로 올린다. **서버를 보지 않는다.**
 *
 * 한때 서버 잔액을 1회 당겨와 큰 쪽을 택했는데, 그 이관을 거친 사용자가 한 명뿐이라
 * 남길 이유가 없었다. 출석점수는 기기에만 있다.
 *
 * 화면이 `await`로 부르던 자리를 그대로 쓰도록 Promise를 돌려준다.
 */
export function syncAttendancePoints(): Promise<void> {
  loadAttendancePoints();
  return Promise.resolve();
}

// ─── 보상 ──────────────────────────────────────────────────────────────────

function settled(amount: number, alreadyGiven: boolean): ClaimRewardResult {
  return { amount, totalPoints: readNumber(POINTS_TOTAL_KEY, 0), alreadyGiven };
}

/**
 * 보상을 적립한다. 이미 받은 보상이면 `amount: 0`, `alreadyGiven: true`.
 *
 * Promise를 돌려주지만 네트워크를 쓰지 않는다 — 호출부가 await 형태라 시그니처를 유지했다.
 */
export async function claimReward(
  reward: RewardKind,
  ref?: string,
  options?: ClaimRewardOptions,
): Promise<ClaimRewardResult> {
  switch (reward) {
    case "WELCOME": {
      if (readStore(WELCOME_GRANTED_KEY) === "1") return settled(0, true);
      writeStore(WELCOME_GRANTED_KEY, "1");
      addPoints(WELCOME_POINTS);
      return settled(WELCOME_POINTS, false);
    }
    case "FEEDBACK": {
      if (readStore(FEEDBACK_GRANTED_KEY) === "1") return settled(0, true);
      writeStore(FEEDBACK_GRANTED_KEY, "1");
      addPoints(FEEDBACK_POINTS);
      return settled(FEEDBACK_POINTS, false);
    }
    case "MISSION": {
      if (!ref) return settled(0, true);
      if (readList(MISSION_GRANTED_KEY).includes(ref)) return settled(0, true);
      appendToList(MISSION_GRANTED_KEY, ref);
      addPoints(MISSION_POINTS);
      return settled(MISSION_POINTS, false);
    }
    case "CLOVER": {
      if (!ref) return settled(0, true);
      if (readList(CLOVER_GRANTED_KEY).includes(ref)) return settled(0, true);
      appendToList(CLOVER_GRANTED_KEY, ref);
      const range = options?.golden ? CLOVER_GOLDEN : CLOVER_NORMAL;
      const amount = randomInt(range.min, range.max);
      addPoints(amount);
      return settled(amount, false);
    }
    case "STREAK": {
      // 도장은 연속일 주기와 함께 관리해야 해서 localStreak가 담당한다.
      const day = Number(ref);
      if (!Number.isInteger(day) || day < 1 || day > MAX_STREAK_DAY) return settled(0, true);
      const { claimStreakDay } = await import("./localStreak");
      return claimStreakDay(day);
    }
  }
}

// ─── 출석 보상(등수 보너스 · 선물) ─────────────────────────────────────────

/** 방과 종류를 가리지 않고, 보상을 받는 출석은 하루 이 횟수까지만. */
const DAILY_REWARD_LIMIT = 3;
const DAILY_REWARD_COUNT_KEY = "att-reward-daily";
const GIFT_CLAIMED_KEY = "att-gift-claimed";

/** KST 기준 날짜. `toISOString()`은 UTC라 자정~오전 9시에 하루가 밀린다. */
const todayKey = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

interface DailyCount {
  date: string;
  count: number;
}

function readDailyCount(): DailyCount {
  try {
    const parsed = JSON.parse(readStore(DAILY_REWARD_COUNT_KEY) ?? "null");
    if (!parsed || parsed.date !== todayKey()) return { date: todayKey(), count: 0 };
    return { date: String(parsed.date), count: Number(parsed.count) || 0 };
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

/** 오늘 보상을 더 받을 수 있는지. */
export function hasRewardQuotaLeft(): boolean {
  return readDailyCount().count < DAILY_REWARD_LIMIT;
}

function consumeRewardQuota(): boolean {
  const current = readDailyCount();
  if (current.count >= DAILY_REWARD_LIMIT) return false;
  writeStore(DAILY_REWARD_COUNT_KEY, JSON.stringify({ date: current.date, count: current.count + 1 }));
  return true;
}

/** 등수별 즉시 보너스 범위. 4등부터는 없다. */
function rankBonusRange(dailyRank: number): { min: number; max: number } | null {
  if (dailyRank === 1) return { min: 800, max: 900 };
  if (dailyRank === 2) return { min: 700, max: 800 };
  if (dailyRank === 3) return { min: 600, max: 700 };
  return null;
}

/**
 * 1~3등 즉시 보너스를 적립한다. 1~3등이 아니거나 하루 상한을 넘겼으면 null.
 *
 * **등수만 서버에서 온다** — "내가 오늘 이 방에서 몇 번째인지"는 다른 사람의 출석
 * 기록이 있어야 알 수 있다. 금액과 하루 상한은 기기에서 판단한다.
 */
export function awardRankBonus(classroomId: number, dailyRank: number): number | null {
  const range = rankBonusRange(dailyRank);
  if (!range) return null;
  if (readList(GIFT_CLAIMED_KEY).includes(rankKey(classroomId))) return null;
  if (!consumeRewardQuota()) return null;
  appendToList(GIFT_CLAIMED_KEY, rankKey(classroomId));
  const amount = randomInt(range.min, range.max);
  addPoints(amount);
  return amount;
}

const rankKey = (classroomId: number) => `rank:${classroomId}:${todayKey()}`;
const giftKey = (classroomId: number) => `gift:${classroomId}:${todayKey()}`;

/** 그 방에서 오늘 선물을 이미 열었는지. */
export function hasClaimedGiftToday(classroomId: number): boolean {
  return readList(GIFT_CLAIMED_KEY).includes(giftKey(classroomId));
}

/**
 * 방별 출석 선물. 같은 방에서는 하루 1번, 방을 넘나들어도 등수 보너스와 합쳐서
 * 하루 {@link DAILY_REWARD_LIMIT}번까지다(방을 만들고 지우는 식의 무제한 수령 방지).
 *
 * 받을 수 없으면 null — 모달이 안내 문구를 보여준다.
 */
export function claimAttendanceGift(classroomId: number): { amount: number; totalPoints: number } | null {
  if (hasClaimedGiftToday(classroomId)) return null;
  if (!consumeRewardQuota()) return null;
  appendToList(GIFT_CLAIMED_KEY, giftKey(classroomId));
  const amount = randomInt(1_500, 2_000);
  return { amount, totalPoints: addPoints(amount) };
}

/** 잔액을 특정 값으로 맞춘다. 미리보기·초기화용. */
export function setAttendancePoints(next: number) {
  publish(next);
}

/** 로그아웃·미리보기 초기화에서 캐시를 비운다. 저장소 값은 지우지 않는다. */
export function resetAttendancePoints() {
  balance = null;
}
