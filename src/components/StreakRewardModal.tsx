import { useState } from "react";
import GiftBox from "./GiftBox";
import { getStreakMilestoneRewards } from "../hooks/useAttendancePoints";

interface StreakRewardModalProps {
  currentStreak: number;
  claimedDays: number[];
  onClaim: (days: number) => number | null;
  onRewarded: (amount: number) => void;
  onClose: () => void;
}

export default function StreakRewardModal({
  currentStreak, claimedDays, onClaim, onRewarded, onClose,
}: StreakRewardModalProps) {
  const rewards = getStreakMilestoneRewards(currentStreak);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [openRequest, setOpenRequest] = useState(0);
  const [result, setResult] = useState<{ days: number; amount: number } | null>(null);
  const selectedReward = rewards.find(({ days }) => days === selectedDays);
  const claimableRewards = rewards.filter(({ days }) => currentStreak >= days && !claimedDays.includes(days));
  const nextReward = rewards.find(({ days }) => days > currentStreak);
  const hasMoreClaimable = claimableRewards.some(
    ({ days }) => currentStreak >= days && !claimedDays.includes(days),
  );

  const handleOpened = () => {
    if (selectedDays === null) return;
    const amount = onClaim(selectedDays);
    if (amount === null) return;
    onRewarded(amount);
    setResult({ days: selectedDays, amount });
  };

  const handleNext = () => {
    setResult(null);
    setSelectedDays(null);
  };

  const formatMilestone = (days: number) => days >= 7 ? `${days / 7}주` : `${days}일`;
  const formatRemaining = (days: number) => {
    const remaining = Math.max(0, days - currentStreak);
    if (days < 7 || remaining < 7) return `${remaining}일 남음`;
    const weeks = Math.floor(remaining / 7);
    const extraDays = remaining % 7;
    return `${weeks}주${extraDays ? ` ${extraDays}일` : ""} 남음`;
  };

  return (
    <div className="attendance-gift-overlay" onClick={onClose}>
      <section
        className="attendance-gift-dialog streak-reward-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="연속 출석 보상"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="attendance-gift-close" onClick={onClose} aria-label="닫기">×</button>
        <h2 className="attendance-gift-title">연속 출석 보상</h2>
        <div className="attendance-gift-rank">
          현재 {currentStreak}일 연속 출석
        </div>

        {result ? (
          <>
            <img className="attendance-gift-open-image" src="/rewards/gift-box-open.png" alt="포인트 보상이 나온 열린 선물 상자" />
            <h2 className="attendance-gift-title attendance-gift-result-title">{formatMilestone(result.days)} 연속 출석 달성!</h2>
            <div className="attendance-gift-total-label">보상 포인트</div>
            <div className="attendance-gift-total">+{result.amount.toLocaleString()}P</div>
            <button className="attendance-gift-confirm" onClick={hasMoreClaimable ? handleNext : onClose}>
              {hasMoreClaimable ? "다른 보상 받기" : "확인"}
            </button>
          </>
        ) : (
          <>
            {selectedReward ? (
              <GiftBox
                key={selectedReward.days}
                onOpened={handleOpened}
                autoOpenRequest={openRequest}
                label={`${formatMilestone(selectedReward.days)} 출석 보상`}
              />
            ) : (
              <GiftBox
                disabled
                onOpened={() => undefined}
                label="받을 보상을 선택해주세요"
                hint="아래에서 보상을 선택하세요"
              />
            )}

            <div className="streak-reward-list">
              {[...claimableRewards, ...(nextReward ? [nextReward] : [])].map(({ days, amount }) => {
                const canClaim = currentStreak >= days && !claimedDays.includes(days);
                return (
                  <div className={`streak-reward-row${canClaim ? " is-claimable" : ""}`} key={days}>
                    <div className="streak-reward-description">
                      <strong>{formatMilestone(days)} 연속 출석</strong>
                      <span>{amount.toLocaleString()}P</span>
                    </div>
                    {canClaim ? (
                      <button className="streak-reward-claim" onClick={() => { setSelectedDays(days); setOpenRequest((request) => request + 1); }}>받기</button>
                    ) : (
                      <span className="streak-reward-state">{formatRemaining(days)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
