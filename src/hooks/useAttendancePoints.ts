import { useLocalStorage } from "./useLocalStorage";

export const POINTS_TO_WON_RATE = 1000; // 1000P = 1원

// 방 구분 없이, 보상(선물상자/등수보너스 타입 무관)을 받는 체크인은 하루 최대 N번까지만.
const DAILY_REWARD_CHECKIN_LIMIT = 3;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

/** 당일 출석 순위별 즉시 보너스 금액 — 1~3등만 해당, 4등부터는 null(하루 상한과는 별개) */
export function rollDailyRankBonus(dailyRank: number): number | null {
  if (dailyRank === 1) return randomInt(500, 600);
  if (dailyRank === 2) return randomInt(400, 500);
  if (dailyRank === 3) return randomInt(300, 400);
  return null;
}

/** 오늘 보상을 받은 체크인 횟수 — 방 구분 없이 하루 최대 {@link DAILY_REWARD_CHECKIN_LIMIT}번까지만 */
export function useDailyRewardLimit() {
  const [state, setState] = useLocalStorage<{ date: string; count: number }>("att-points-reward-daily", { date: "", count: 0 });
  const today = dateKey(new Date());
  const count = state.date === today ? state.count : 0;
  const remaining = Math.max(0, DAILY_REWARD_CHECKIN_LIMIT - count);

  const increment = () => setState({ date: today, count: count + 1 });

  return { remaining, increment };
}

/** 방 전체 누적 출석 포인트 — 토스 포인트 전환의 기준이 되는 총량 */
export function useAttendancePoints() {
  const [totalPoints, setTotalPoints] = useLocalStorage<number>("att-points-total", 0);
  const [pendingConversion, setPendingConversion] = useLocalStorage<number | null>("att-points-conversion-pending", null);

  const addPoints = (amount: number) => setTotalPoints((prev) => prev + amount);

  /** amount는 POINTS_TO_WON_RATE의 배수만 전환하고, 나머지는 출석 포인트로 남겨둔다 */
  const requestConversion = (amount: number) => {
    if (amount <= 0 || amount > totalPoints) return false;
    setPendingConversion((prev) => (prev ?? 0) + amount);
    setTotalPoints((prev) => prev - amount);
    return true;
  };

  return { totalPoints, pendingConversion, addPoints, requestConversion };
}

/**
 * 방별 출석 선물 — 같은 방에서는 하루 1회만 200~800P 랜덤 지급한다.
 * (방을 넘나드는 하루 전체 상한은 {@link useDailyRewardLimit}에서 체크인 단위로 따로 관리한다.)
 */
export function useAttendanceGift(classroomId: number) {
  const [claimedDate, setClaimedDate] = useLocalStorage<string>(`att-points-claimed-date-${classroomId}`, "");

  const todayKey = dateKey(new Date());
  const alreadyClaimedToday = claimedDate === todayKey;

  const claim = (): number | null => {
    if (alreadyClaimedToday) return null;
    const amount = randomInt(200, 800);
    setClaimedDate(todayKey);
    return amount;
  };

  return { claim, alreadyClaimedToday };
}
