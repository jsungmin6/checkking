import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  ATTENDANCE_POINTS_EVENT,
  claimReward,
  getAttendancePoints,
  loadAttendancePoints,
  streakPoints,
  syncAttendancePoints,
  MAX_STREAK_DAY,
  type ClaimRewardOptions,
  type ClaimRewardResult,
  type RewardKind,
} from "../utils/attendancePoints";
import {
  STREAK_PROGRESS_EVENT,
  getStreakProgress,
  hasTossRewardPaid,
  isTossRewardDay,
  syncStreakFromServer,
  type StreakProgress,
} from "../utils/localStreak";
import { grantStreakReward } from "../utils/tossPromotion";

export const POINTS_TO_WON_RATE = 1000; // 출석점수 1,000점 = 토스포인트 1P (현금 1원)

export interface StreakMilestoneReward {
  days: number;
  points: number | null;
}

/** 1~100일차 보상표. 금액은 {@link streakPoints}가 정한다. */
export function getStreakMilestoneRewards(_currentStreak?: number) {
  const rewards: StreakMilestoneReward[] = [];
  for (let days = 1; days <= MAX_STREAK_DAY; days += 1) {
    rewards.push({ days, points: streakPoints(days) });
  }
  return rewards;
}

/**
 * 출석 도장 상태. **수령 내역은 기기가, 연속일은 서버가 기준이다.**
 *
 * 출석은 언제나 서버를 거치므로 연속일은 서버 쪽이 맞다 — 기기 값이 뒤처져 있으면
 * 끌어올린다. 반면 "어느 일차를 받았는지"는 이제 기기에만 쌓이므로 서버가 덮지 않는다.
 */
export function useStreakMilestoneRewards() {
  const [progress, setProgress] = useState<StreakProgress>(getStreakProgress);
  const rewards = getStreakMilestoneRewards();

  const refresh = useCallback(async () => {
    const next = await syncStreakFromServer();
    setProgress(next);
    // 도장은 받았는데 토스포인트 지급만 실패한 일차를 메운다. 지급 한도를 넘겨
    // 실패했으면(4110) 다음 날 여기서 다시 받는다.
    for (const day of next.claimedDays) {
      if (isTossRewardDay(day) && !hasTossRewardPaid(day)) {
        await grantStreakReward(day).catch(() => 0);
      }
    }
  }, []);

  useEffect(() => {
    const onChange = (event: Event) => setProgress((event as CustomEvent<StreakProgress>).detail);
    window.addEventListener(STREAK_PROGRESS_EVENT, onChange);
    void refresh().catch(() => { /* 네트워크 실패 시 기기 값 유지 */ });
    return () => window.removeEventListener(STREAK_PROGRESS_EVENT, onChange);
  }, [refresh]);

  const streak = progress.streak;
  const claimedDays = progress.claimedDays;
  const claimableRewards = rewards.filter(
    ({ days, points }) => points !== null && streak >= days && !claimedDays.includes(days),
  );

  /** 도장을 받는다. 지급 대상 일차면 토스포인트도 함께 지급한다. */
  const claim = useCallback(async (days: number): Promise<number | null> => {
    const result = await claimReward("STREAK", String(days));
    setProgress(getStreakProgress());
    if (result.amount > 0 || result.alreadyGiven) {
      // 지급 실패가 도장 수령을 막지 않는다. 실패하면 기록이 남지 않아 다음에 다시 시도된다.
      void grantStreakReward(days).catch(() => 0);
    }
    return result.amount;
  }, []);

  return { currentStreak: streak, claimedDays, rewards, claimableRewards, claim, refresh };
}

/**
 * 출석인사 미션 — 인사를 한 번 남기면 보상을 받을 수 있다.
 * 완료/수령 플래그는 배지 표시용이고, 중복 지급은 attendancePoints가 막는다.
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

/** "문의하기" 완료 보상. 중복 지급은 attendancePoints가 막고, 여기 플래그는 버튼 문구용이다. */
export function useFeedbackReward() {
  const [rewarded, setRewarded] = useLocalStorage<boolean>("att-points-feedback-rewarded", false);
  const markRewarded = () => setRewarded(true);
  return { alreadyRewarded: rewarded, markRewarded };
}

/**
 * 누적 출석점수. **기기에 저장된 값을 보여준다.**
 *
 * `totalPoints`가 `null`이면 아직 저장소를 읽지 않은 상태다. 화면은 0이 아니라
 * 자리표시(`-`)를 보여줘야 한다 — 0을 보여주면 "점수가 사라졌다"로 읽힌다.
 */
export function useAttendancePoints() {
  const [totalPoints, setTotalPoints] = useState<number | null>(getAttendancePoints());

  useEffect(() => {
    const onChange = (event: Event) => setTotalPoints((event as CustomEvent<number>).detail);
    window.addEventListener(ATTENDANCE_POINTS_EVENT, onChange);
    loadAttendancePoints();
    void syncAttendancePoints().catch(() => { /* 실패해도 화면은 떠야 한다 */ });
    return () => window.removeEventListener(ATTENDANCE_POINTS_EVENT, onChange);
  }, []);

  const claim = useCallback(
    (reward: RewardKind, ref?: string, options?: ClaimRewardOptions): Promise<ClaimRewardResult> =>
      claimReward(reward, ref, options),
    [],
  );

  return { totalPoints, claim, refresh: syncAttendancePoints };
}
