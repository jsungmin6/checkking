import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getStreakMilestoneRewards } from "../hooks/useAttendancePoints";
import { isTossRewardDay } from "../utils/localStreak";
import { STREAK_REWARD_WON } from "../utils/tossPromotion";

const DAYS_PER_PAGE = 8;

/**
 * 7일차부터 5일마다(7·12·17·22…97) 출석점수 외에 토스포인트도 받는다.
 *
 * 조건과 금액이 **서버 StreakTossRewardService와 같아야 한다** — 화면에 적힌 금액과
 * 실제 지급액이 다르면 안 된다. 금액은 콘솔 프로모션 "출석왕_출석"의 지급액(10원)이다.
 */
// 지급 조건과 금액은 실제 지급 경로와 같은 곳에서 가져온다 — 화면에 보이는 금액과
// 실제 지급액이 달라지면 안 된다.
const TOSS_REWARD_WON = STREAK_REWARD_WON;

/** 포인트 탭 아이콘과 같은 P 코인. 작은 크기에서 뭉개지지 않게 면으로 채운다. */
function TossPointCoin() {
  return (
    <svg className="streak-reward-toss-coin" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 6.5h4.2a3.4 3.4 0 1 1 0 6.8H11v4.2H9V6.5Zm2 1.8v3.2h2.2a1.6 1.6 0 1 0 0-3.2H11Z" />
    </svg>
  );
}
const getPageForStreak = (streak: number) => Math.min(
  Math.ceil(100 / DAYS_PER_PAGE) - 1,
  Math.max(0, Math.floor(Math.max(0, streak - 1) / DAYS_PER_PAGE)),
);

interface StreakRewardModalProps {
  currentStreak: number;
  claimedDays: number[];
  /** 서버에 적립을 요청한다. 성공하면 적립액(이미 받았으면 0), 실패하면 null. */
  onClaim: (days: number) => Promise<number | null>;
  onClose: () => void;
}

export default function StreakRewardModal({
  currentStreak, claimedDays, onClaim, onClose,
}: StreakRewardModalProps) {
  const rewards = getStreakMilestoneRewards(currentStreak);
  const [stampAnimationDay, setStampAnimationDay] = useState<number | null>(null);
  const stampTimer = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const pages = Array.from({ length: Math.ceil(rewards.length / DAYS_PER_PAGE) }, (_, index) =>
    rewards.slice(index * DAYS_PER_PAGE, (index + 1) * DAYS_PER_PAGE),
  );

  useEffect(() => () => {
    if (stampTimer.current !== null) window.clearTimeout(stampTimer.current);
  }, []);

  useLayoutEffect(() => {
    const currentPage = getPageForStreak(currentStreak);
    if (carouselRef.current) carouselRef.current.scrollLeft = currentPage * carouselRef.current.clientWidth;
  }, [currentStreak]);

  const handleClaim = async (days: number) => {
    const amount = await onClaim(days);
    if (amount === null) return;   // 서버가 거절했다(아직 그 일차에 도달하지 않음 등)
    setStampAnimationDay(days);
    if (stampTimer.current !== null) window.clearTimeout(stampTimer.current);
    stampTimer.current = window.setTimeout(() => setStampAnimationDay(null), 700);
  };

  const remaining = (days: number) => `${Math.max(0, days - currentStreak)}일 후`;

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
        <h2 className="attendance-gift-title">출석 도장 모으기</h2>
        <div
          ref={carouselRef}
          className="streak-reward-carousel"
          role="group"
          aria-label="출석 보상 날짜 페이지"
        >
          {pages.map((pageRewards, pageIndex) => (
            <div className="streak-reward-page" key={pageIndex} aria-label={`${pageIndex + 1}번째 출석 보상 화면`}>
              {pageRewards.map(({ days, points }) => {
                  const attended = currentStreak >= days;
                  const isClaimed = claimedDays.includes(days);
                  const canClaim = points !== null && attended && !isClaimed;
                  const animating = stampAnimationDay === days;
                  const pointsTone = attended
                    ? "is-attended"
                    : points === 100_000
                      ? "is-diamond"
                      : points === 30_000
                        ? "is-gold"
                        : points === 10_000
                          ? "is-silver"
                          : "is-bronze";
                  return (
                    <button
                      type="button"
                      className={`streak-reward-card${canClaim ? " is-claimable" : ""}${attended ? " is-stamped" : ""}${isClaimed ? " is-claimed" : ""}${isTossRewardDay(days) ? " is-toss-reward" : ""}`}
                      key={days}
                      disabled={!canClaim}
                      aria-label={`${days}일차 ${points === null ? "출석 도장" : `${points.toLocaleString()}점`}`
                        + `${isTossRewardDay(days) ? `, 토스포인트 ${TOSS_REWARD_WON}원 추가` : ""}`
                        + ` ${canClaim ? "받기" : isClaimed ? "받음" : attended ? "완료" : remaining(days)}`}
                      onClick={() => { void handleClaim(days); }}
                    >
                      <span className="streak-reward-day">{days}일차</span>
                      <span className={`streak-reward-stamp${animating ? " is-animating" : ""}`} aria-hidden="true">
                        {isClaimed ? (
                          <img
                            className={`streak-reward-stamp-logo${animating ? " is-animating" : " is-permanent"}`}
                            src="/출석왕_로고_배경제거.png"
                            alt=""
                          />
                        ) : (
                          <>
                            <span>{attended ? "출석" : "도장"}</span>
                            <strong>{days}</strong>
                          </>
                        )}
                      </span>
                      <strong className={`streak-reward-points ${pointsTone}`}>{points === null ? "도장만" : `${points.toLocaleString()}점`}</strong>
                      {isTossRewardDay(days) && (
                        <span className="streak-reward-toss">
                          <TossPointCoin />
                          {TOSS_REWARD_WON}원
                        </span>
                      )}
                      <span className="streak-reward-card-state">
                        {canClaim ? "받기" : isClaimed ? <><span aria-hidden="true">✓</span> 받음</> : attended ? "완료" : remaining(days)}
                      </span>
                    </button>
                  );
              })}
            </div>
          ))}
        </div>
        <p className="streak-reward-caption">연속 출석이 쌓일수록 보상이 커져요! 놓치지 마세요.</p>
      </section>
    </div>
  );
}
