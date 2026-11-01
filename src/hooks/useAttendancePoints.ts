import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  ATTENDANCE_POINTS_EVENT,
  claimReward,
  fetchStreakRewardStatus,
  getAttendancePoints,
  syncAttendancePoints,
  type ClaimRewardResult,
  type RewardKind,
} from "../utils/attendancePoints";

export const POINTS_TO_WON_RATE = 1000; // 출석점수 1,000점 = 토스포인트 1P (현금 1원)

export interface StreakMilestoneReward {
  days: number;
  points: number | null;
}

/**
 * 보상표. **서버 PointRewardService.streakPoints()와 값이 같아야 한다** —
 * 화면에 보이는 금액과 실제 지급액이 달라지면 안 된다. 서버에 같은 표를 대조하는
 * 테스트가 있다(PointRewardServiceTest).
 */
const FIRST_WEEK_STREAK_REWARDS: StreakMilestoneReward[] = [
  { days: 1, points: 2_000 },
  { days: 2, points: 5_000 },
  { days: 3, points: 2_000 },
  { days: 4, points: 5_000 },
  { days: 5, points: 2_000 },
  { days: 6, points: 5_000 },
  { days: 7, points: 10_000 },
];

/** 1~7일차는 위 표, 8~100일차는 10의 배수 30,000 / 100일차 100,000 / 나머지 10,000. */
export function getStreakMilestoneRewards(_currentStreak?: number) {
  const rewards: StreakMilestoneReward[] = [...FIRST_WEEK_STREAK_REWARDS];
  for (let days = 8; days <= 100; days += 1) {
    const points = days === 100 ? 100_000 : days % 10 === 0 ? 30_000 : 10_000;
    rewards.push({ days, points });
  }
  return rewards;
}

/**
 * 출석 도장 상태. 연속일과 "이번 주기에 받은 일차"를 **서버에서** 받는다.
 *
 * 예전에는 localStorage에 수령 기록을 두어 기기를 바꾸면 연속 출석과 수령 내역이
 * 전부 날아갔다. 지금은 서버가 출석 기록으로 연속일을 계산하고, 수령 내역도
 * 원장의 멱등 키(streak:<일차>:<주기시작일>)로 관리한다.
 */
export function useStreakMilestoneRewards() {
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const rewards = getStreakMilestoneRewards();

  const refresh = useCallback(async () => {
    const status = await fetchStreakRewardStatus();
    setCurrentStreak(status.currentStreak);
    setClaimedDays(status.claimedDays);
  }, []);

  useEffect(() => {
    void refresh().catch(() => { /* 네트워크 실패 시 마지막 값 유지 */ });
  }, [refresh]);

  const streak = currentStreak ?? 0;
  const claimableRewards = rewards.filter(
    ({ days, points }) => points !== null && streak >= days && !claimedDays.includes(days),
  );

  /** 서버가 금액을 정한다. 성공하면 적립액을 돌려준다(이미 받았으면 0). */
  const claim = useCallback(async (days: number): Promise<number | null> => {
    try {
      const result = await claimReward("STREAK", String(days));
      setClaimedDays((previous) => (previous.includes(days) ? previous : [...previous, days]));
      return result.amount;
    } catch {
      return null;
    }
  }, []);

  return { currentStreak, claimedDays, rewards, claimableRewards, claim, refresh };
}

/**
 * 출석인사 미션 — 인사를 한 번 남기면 보상을 받을 수 있다.
 * 완료/수령 플래그는 배지 표시용 UI 상태이고, 실제 지급과 중복 방지는 서버가 한다.
 */
const GREETING_MISSION_DONE_KEY = "att-mission-greeting-done";

/** 인사 작성이 성공한 순간 호출 — 미션을 켜기 전에 인사한 사람도 보상 대상이 되도록 항상 기록한다. */
export function markGreetingMissionDone() {
  localStorage.setItem(GREETING_MISSION_DONE_KEY, "1");
}

export function useGreetingMission() {
  const [done, setDone] = useLocalStorage<boolean>(GREETING_MISSION_DONE_KEY, false);
  const [rewarded, setRewarded] = useLocalStorage<boolean>("att-mission-greeting-rewarded", false);
  // 마지막으로 열어본 시점의 미션 상태. 지금 상태와 다르면 "아직 못 본 변화"가 있다는 뜻이라 배지를 띄운다.
  const [seenState, setSeenState] = useLocalStorage<string>("att-mission-greeting-seen", "");
  const state = done ? "done" : "none";
  return {
    done,
    alreadyRewarded: rewarded,
    hasUpdate: seenState !== state,
    markSeen: () => setSeenState(state),
    markDone: () => setDone(true),
    markRewarded: () => setRewarded(true),
  };
}

/**
 * "문의하기" 완료 보상. 중복 방지는 서버가 한다(사용자당 1회 + 문의 기록 존재 확인).
 * 여기 플래그는 버튼 문구를 바꾸는 UI 용도다.
 */
export function useFeedbackReward() {
  const [rewarded, setRewarded] = useLocalStorage<boolean>("att-points-feedback-rewarded", false);
  const markRewarded = () => setRewarded(true);
  return { alreadyRewarded: rewarded, markRewarded };
}

/**
 * 누적 출석점수. **서버 잔액을 그대로 보여준다.**
 *
 * `totalPoints`가 `null`이면 아직 서버 값을 못 받은 상태다. 화면은 0이 아니라
 * 자리표시(`-`)를 보여줘야 한다 — 0을 보여주면 "점수가 사라졌다"로 읽힌다.
 */
export function useAttendancePoints() {
  const [totalPoints, setTotalPoints] = useState<number | null>(getAttendancePoints());

  useEffect(() => {
    const onChange = (event: Event) => setTotalPoints((event as CustomEvent<number>).detail);
    window.addEventListener(ATTENDANCE_POINTS_EVENT, onChange);
    void syncAttendancePoints().catch(() => { /* 실패해도 화면은 떠야 한다 */ });
    return () => window.removeEventListener(ATTENDANCE_POINTS_EVENT, onChange);
  }, []);

  /** 보상 적립. 금액은 서버가 정하므로 종류만 넘긴다. */
  const claim = useCallback(
    (reward: RewardKind, ref?: string): Promise<ClaimRewardResult> => claimReward(reward, ref),
    [],
  );

  return { totalPoints, claim, refresh: syncAttendancePoints };
}
