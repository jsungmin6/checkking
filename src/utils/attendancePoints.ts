import { api } from "./api";

/**
 * 출석점수의 단일 소스. **서버 잔액만 믿는다.**
 *
 * 예전에는 localStorage(`att-points-total`)가 잔액이었다. 그래서 서버가 보상을 결정해도
 * 올려줄 잔액이 없었고, 복권 차감도 신뢰할 수 없었다. 지금은 서버 원장이 진실이고
 * 이 모듈은 화면이 공유하는 캐시일 뿐이다.
 *
 * 여러 화면이 같은 값을 봐야 해서 모듈 수준 상태 + CustomEvent로 알린다
 * (레포의 `tossPromotion.ts`가 쓰는 방식과 같다). Context를 새로 끼우지 않는다.
 */

export const ATTENDANCE_POINTS_EVENT = "att-points-balance-change";

/** 이관 전 기기에 남아 있던 잔액. 서버로 한 번 넘기고 나면 더 쓰지 않는다. */
const LEGACY_TOTAL_POINTS_KEY = "att-points-total";

export type RewardKind = "WELCOME" | "STREAK" | "MISSION" | "CLOVER" | "FEEDBACK";

interface BalanceResponse {
  totalPoints: number;
  migrated: boolean;
}

export interface ClaimRewardResult {
  amount: number;
  totalPoints: number;
  alreadyGiven: boolean;
}

export interface StreakRewardStatus {
  currentStreak: number;
  claimedDays: number[];
}

let balance: number | null = null;
let migrated = false;
let syncing: Promise<void> | null = null;

function publish(next: number) {
  balance = next;
  window.dispatchEvent(new CustomEvent(ATTENDANCE_POINTS_EVENT, { detail: next }));
}

/** 아직 서버 값을 못 받았으면 null. 화면은 null일 때 숫자 대신 자리표시를 보여준다. */
export function getAttendancePoints(): number | null {
  return balance;
}

export function isMigrated(): boolean {
  return migrated;
}

/** 이관 전 기기에 남아 있던 로컬 잔액. 없으면 0. */
function readLegacyLocalPoints(): number {
  const raw = Number(localStorage.getItem(LEGACY_TOTAL_POINTS_KEY) ?? "0");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/**
 * 서버 잔액을 가져오고, 아직 이관하지 않았으면 로컬 잔액을 1회 신고한다.
 *
 * 이관은 사용자당 한 번뿐이다(서버 `POINT_MIGRATION_AUDITS`의 행이 그 증거). 이후에는
 * `migrated=true`가 내려와 다시 신고하지 않는다. 재설치해서 로컬이 0이 된 사용자도
 * 서버가 `max(신고액, 서버잔액)`을 쓰므로 손해가 없다.
 *
 * 동시에 여러 화면이 호출해도 요청은 한 번만 나간다.
 */
export function syncAttendancePoints(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      let result = await api<BalanceResponse>("/points/balance");
      if (!result.migrated) {
        result = await api<BalanceResponse>("/points/migrate", {
          method: "POST",
          body: JSON.stringify({ claimedPoints: readLegacyLocalPoints() }),
        });
      }
      migrated = result.migrated;
      publish(result.totalPoints);
      if (migrated) {
        // 이관이 끝났으면 옛 잔액 키는 혼동만 준다. 서버가 진실이다.
        localStorage.removeItem(LEGACY_TOTAL_POINTS_KEY);
      }
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/**
 * 보상을 적립한다. **금액은 서버가 정한다** — 클라이언트는 종류와 참조값만 보낸다.
 * 이미 받은 보상이면 `amount: 0`, `alreadyGiven: true`가 돌아온다.
 */
export async function claimReward(reward: RewardKind, ref?: string): Promise<ClaimRewardResult> {
  const result = await api<ClaimRewardResult>("/points/rewards", {
    method: "POST",
    body: JSON.stringify({ reward, ref: ref ?? null }),
  });
  publish(result.totalPoints);
  return result;
}

/** 방별 출석 선물. 금액과 하루 상한 모두 서버가 판단한다. */
export async function claimAttendanceGift(classroomId: number): Promise<{ amount: number; totalPoints: number }> {
  const result = await api<{ amount: number; totalPoints: number }>(
    `/classrooms/${classroomId}/attendance/points/claim-gift`,
    { method: "POST" },
  );
  publish(result.totalPoints);
  return result;
}

/** 출석 도장 화면 상태. 연속일과 이번 주기 수령 내역 모두 서버 기준이다. */
export function fetchStreakRewardStatus(): Promise<StreakRewardStatus> {
  return api<StreakRewardStatus>("/points/streak-rewards");
}

/** 잔액이 서버에서 바뀐 뒤(복권 구매 등) 화면에 반영한다. */
export function setAttendancePoints(next: number) {
  publish(next);
}

/** 로그아웃·미리보기 초기화에서 캐시를 비운다. */
export function resetAttendancePoints() {
  balance = null;
  migrated = false;
  syncing = null;
}
