import { api } from "./api";
import { addPoints, streakPoints, MAX_STREAK_DAY, type ClaimRewardResult } from "./attendancePoints";
import { readNumber, readStore, writeStore, POINTS_TOTAL_KEY } from "./nativeStore";

/**
 * 연속 출석일과 도장 수령 내역. **기기에서 관리한다.**
 *
 * 서버가 출석 기록으로 계산해 주기도 하지만, 그러면 도장 화면을 열 때마다 서버를
 * 봐야 하고 수령 내역을 원장 멱등 키로 역추적해야 했다. 지금은 **최초 1회만** 서버
 * 값을 당겨와 심고, 그 뒤로는 출석할 때마다 기기에서 올린다.
 *
 * 날짜는 모두 KST 기준이다. `toISOString()`은 UTC라 자정~오전 9시 사이에 하루가
 * 밀린다 — 반드시 `dateKey`를 쓴다.
 */

const PROGRESS_KEY = "att-streak-progress";
const TOSS_PAID_KEY = "att-streak-toss-paid";

export interface StreakProgress {
  /** 현재 연속 출석일. */
  streak: number;
  /** 이번 연속 구간이 시작된 날(YYYY-MM-DD). 구간이 끊기면 새로 잡힌다. */
  cycleStart: string;
  /** 마지막으로 출석한 날(YYYY-MM-DD). 연속 여부를 이 값으로 판단한다. */
  lastAttended: string;
  /** 이번 구간에서 도장을 받은 일차. */
  claimedDays: number[];
  /** 서버 값을 한 번 당겨왔는지. */
  synced: boolean;
}

const EMPTY: StreakProgress = {
  streak: 0,
  cycleStart: "",
  lastAttended: "",
  claimedDays: [],
  synced: false,
};

export const dateKey = (date: Date) => date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

function shiftDays(key: string, days: number): string {
  const base = new Date(`${key}T00:00:00+09:00`);
  base.setDate(base.getDate() + days);
  return dateKey(base);
}

export const STREAK_PROGRESS_EVENT = "att-streak-progress-change";

export function getStreakProgress(): StreakProgress {
  try {
    const parsed = JSON.parse(readStore(PROGRESS_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return EMPTY;
    return {
      streak: Number(parsed.streak) || 0,
      cycleStart: String(parsed.cycleStart ?? ""),
      lastAttended: String(parsed.lastAttended ?? ""),
      claimedDays: Array.isArray(parsed.claimedDays) ? parsed.claimedDays.map(Number).filter(Number.isInteger) : [],
      synced: parsed.synced === true,
    };
  } catch {
    return EMPTY;
  }
}

function save(next: StreakProgress) {
  writeStore(PROGRESS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(STREAK_PROGRESS_EVENT, { detail: next }));
}

/**
 * 출석에 성공한 순간 호출한다. 하루에 여러 번 불려도 한 번만 올라간다.
 *
 * 어제 출석했으면 연속이 이어지고, 하루라도 빠졌으면 1일차로 새 구간을 시작한다.
 * 새 구간이 시작되면 수령 내역도 비운다 — 같은 일차를 다시 받을 수 있어야 한다.
 */
export function recordAttendance(): StreakProgress {
  const today = dateKey(new Date());
  const previous = getStreakProgress();
  if (previous.lastAttended === today) return previous;

  const continued = previous.lastAttended !== "" && previous.lastAttended === shiftDays(today, -1);
  const next: StreakProgress = continued
    ? {
        ...previous,
        streak: Math.min(MAX_STREAK_DAY, previous.streak + 1),
        lastAttended: today,
        synced: true,
      }
    : { streak: 1, cycleStart: today, lastAttended: today, claimedDays: [], synced: true };
  save(next);
  return next;
}

/**
 * 서버가 계산해 둔 연속일을 당겨와 **기기 값이 뒤처져 있으면 끌어올린다.**
 *
 * 한 번만 당겨오게 했다가 되돌렸다. 연속일은 출석 기록에서 나오고 출석은 언제나
 * 서버를 거치므로, 서버 값이 더 크면 그쪽이 맞다. 1회로 묶어 두면 기기가 한 번
 * 뒤처졌을 때 고칠 방법이 없다(기기 저장소를 직접 편집할 수 없다).
 *
 * **기기 값이 더 크면 서버를 무시한다.** 그리고 수령 내역은 서버 값으로 덮지 않고
 * 합친다 — 도장 수령은 이제 기기에만 기록되므로, 덮으면 받은 일차를 다시 받게 된다.
 * 같은 이유로 cycleStart도 유지한다. 주기가 바뀐 것으로 보이면 수령·지급 기록이
 * 통째로 초기화되어 중복 지급이 난다.
 */
export async function syncStreakFromServer(): Promise<StreakProgress> {
  const current = getStreakProgress();
  try {
    const status = await api<{ currentStreak: number; claimedDays: number[] }>("/points/streak-rewards");
    const serverStreak = Math.min(MAX_STREAK_DAY, Number(status.currentStreak) || 0);
    const serverClaimed = Array.isArray(status.claimedDays)
      ? status.claimedDays.map(Number).filter(Number.isInteger)
      : [];
    // 서버 수령 내역은 기기로 넘어오기 전의 기록이다. 첫 싱크에서만 합친다.
    const claimedDays = current.synced
      ? current.claimedDays
      : [...new Set([...current.claimedDays, ...serverClaimed])].sort((a, b) => a - b);

    if (serverStreak <= current.streak) {
      save({ ...current, claimedDays, synced: true });
      return getStreakProgress();
    }
    const today = dateKey(new Date());
    const next: StreakProgress = {
      streak: serverStreak,
      cycleStart: current.cycleStart || shiftDays(today, -(serverStreak - 1)),
      lastAttended: current.lastAttended || today,
      claimedDays,
      synced: true,
    };
    save(next);
    return next;
  } catch {
    return current;   // 네트워크 실패면 플래그를 세우지 않는다. 다음 진입에 다시 시도한다.
  }
}

/** 도장을 받는다. 아직 그 일차에 도달하지 않았거나 이미 받았으면 `amount: 0`. */
export function claimStreakDay(day: number): ClaimRewardResult {
  const progress = getStreakProgress();
  const settled = (amount: number, alreadyGiven: boolean): ClaimRewardResult => ({
    amount,
    totalPoints: readNumber(POINTS_TOTAL_KEY, 0),
    alreadyGiven,
  });
  if (progress.streak < day) return settled(0, false);
  if (progress.claimedDays.includes(day)) return settled(0, true);

  save({ ...progress, claimedDays: [...progress.claimedDays, day] });
  const amount = streakPoints(day);
  addPoints(amount);
  return settled(amount, false);
}

// ─── 토스포인트 지급 대상 일차 ──────────────────────────────────────────────

// 조건은 보상 금액을 정하는 곳(attendancePoints)에 있다 — 그날은 출석점수를 주지
// 않으므로 두 규칙이 떨어져 있으면 한쪽만 고치는 실수가 난다. 여기서는 다시 내보낸다.
export { FIRST_TOSS_REWARD_DAY, TOSS_REWARD_INTERVAL, isTossRewardDay } from "./attendancePoints";

interface TossPaidRecord {
  cycleStart: string;
  days: number[];
}

function readTossPaid(): TossPaidRecord {
  try {
    const parsed = JSON.parse(readStore(TOSS_PAID_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return { cycleStart: "", days: [] };
    return {
      cycleStart: String(parsed.cycleStart ?? ""),
      days: Array.isArray(parsed.days) ? parsed.days.map(Number).filter(Number.isInteger) : [],
    };
  } catch {
    return { cycleStart: "", days: [] };
  }
}

/**
 * 이번 구간에서 그 일차의 토스포인트를 이미 받았는지.
 *
 * 구간이 바뀌면 기록을 버린다 — 연속이 끊기고 다시 7일을 채웠으면 또 받아야 한다.
 */
export function hasTossRewardPaid(day: number): boolean {
  const record = readTossPaid();
  const { cycleStart } = getStreakProgress();
  if (record.cycleStart !== cycleStart) return false;
  return record.days.includes(day);
}

/** 지급에 성공한 뒤 호출한다. 실패한 지급을 기록하면 다시 받을 기회가 사라진다. */
export function markTossRewardPaid(day: number) {
  const { cycleStart } = getStreakProgress();
  const record = readTossPaid();
  const days = record.cycleStart === cycleStart ? record.days : [];
  if (days.includes(day)) return;
  writeStore(TOSS_PAID_KEY, JSON.stringify({ cycleStart, days: [...days, day] }));
}
