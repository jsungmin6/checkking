import { useLocalStorage } from "./useLocalStorage";

export const POINTS_TO_WON_RATE = 1000; // 1000P = 1원

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

/** 당일 출석 순위별 즉시 보너스 — 1~3등만 지급, 4등부터는 없음 */
export function rollDailyRankBonus(dailyRank: number): number | null {
  if (dailyRank === 1) return randomInt(500, 600);
  if (dailyRank === 2) return randomInt(400, 500);
  if (dailyRank === 3) return randomInt(300, 400);
  return null;
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

/** 방별 출석 선물 — 연속 출석과 무관하게 하루 1회, 500~1000P 랜덤 지급 */
export function useAttendanceGift(classroomId: number) {
  const [claimedDate, setClaimedDate] = useLocalStorage<string>(`att-points-claimed-date-${classroomId}`, "");

  const todayKey = dateKey(new Date());
  const alreadyClaimedToday = claimedDate === todayKey;

  const claim = () => {
    const amount = randomInt(200, 800);
    setClaimedDate(todayKey);
    return amount;
  };

  return { claim, alreadyClaimedToday };
}
