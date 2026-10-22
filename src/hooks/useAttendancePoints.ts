import { useLocalStorage } from "./useLocalStorage";

export const POINTS_TO_WON_RATE = 1000; // 1000P = 1원

// 클라이언트에만 저장되는 값이라, 조작되더라도 손해가 토스 하루 전환 한도(100P≈100원) 수준을
// 넘지 않도록 누적 상한을 둔다.
const MAX_LOCAL_POINTS = 100_000;

const TOTAL_POINTS_KEY = "att-points-total";
const WELCOME_BONUS_GRANTED_KEY = "att-points-welcome-granted";
const WELCOME_BONUS_AMOUNT = 1000;

/**
 * 완전 신규 가입 시 1회만 1000P를 지급한다. 로컬스토리지 플래그로만 중복 방지하므로
 * 앱 재설치/기기 변경 시 다시 받을 수 있지만, 서버 포인트가 아니라 영향이 작아 허용한다.
 */
export function grantWelcomeBonusIfNew(isNewUser: boolean) {
  if (!isNewUser) return;
  if (localStorage.getItem(WELCOME_BONUS_GRANTED_KEY) === "1") return;
  const current = Number(localStorage.getItem(TOTAL_POINTS_KEY) ?? "0");
  const next = Math.min(MAX_LOCAL_POINTS, current + WELCOME_BONUS_AMOUNT);
  localStorage.setItem(TOTAL_POINTS_KEY, String(next));
  localStorage.setItem(WELCOME_BONUS_GRANTED_KEY, "1");
}

// 방 구분 없이, 보상(선물상자/등수보너스 타입 무관)을 받는 체크인은 하루 최대 N번까지만.
const DAILY_REWARD_CHECKIN_LIMIT = 3;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
// toISOString()은 UTC 기준이라 자정~오전 9시(KST) 사이에는 아직 "어제"로 취급돼 하루 리셋이 안 된다.
// 반드시 한국 시간 기준 날짜로 계산해야 한다.
const dateKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

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
  const [totalPoints, setTotalPoints] = useLocalStorage<number>(TOTAL_POINTS_KEY, 0);
  const [pendingConversion, setPendingConversion] = useLocalStorage<number | null>("att-points-conversion-pending", null);

  const addPoints = (amount: number) => setTotalPoints((prev) => Math.min(MAX_LOCAL_POINTS, prev + amount));

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
