import { useCallback, useEffect, useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import TossBannerAd, { BANNER_AD_GROUPS } from "../components/TossBannerAd";
import AdMobBanner from "../components/AdMobBanner";
import type { HomeTab } from "../components/HomeTabBar";
import { api } from "../utils/api";
import AttendanceLotteryModal from "../components/AttendanceLotteryModal";
import TossPointsReceivedModal from "../components/TossPointsReceivedModal";
import { useAttendancePoints, useStreakMilestoneRewards } from "../hooks/useAttendancePoints";
import StreakRewardModal from "../components/StreakRewardModal";
import {  syncTossPointLedger, TOSS_POINTS_RECEIVED_EVENT, TOSS_POINTS_RECEIVED_KEY } from "../utils/tossPromotion";
import "../styles/lab.css";

interface Props {
  onNavigateHome: () => void;
  onNavigatePublicRooms: () => void;
  onNavigateProfile: () => void;
  onOpenCloverFinder: () => void;
}

interface CloverOverview {
  personalBestMs: number | null;
  myRank: number | null;
  participantCount: number;
  ranking: Array<{ rank: number; nickname: string; bestTimeMs: number | null; failed: boolean }>;
}

export default function LabScreen({
  onNavigateHome, onNavigatePublicRooms, onNavigateProfile, onOpenCloverFinder,
}: Props) {
  const [personalBestMs, setPersonalBestMs] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [showLotteryModal, setShowLotteryModal] = useState(false);
  const [showTossPointsDetail, setShowTossPointsDetail] = useState(false);
  const [showStreakRewardModal, setShowStreakRewardModal] = useState(false);
  const [tossPointsReceived, setTossPointsReceived] = useState(() => {
    const stored = Number(localStorage.getItem(TOSS_POINTS_RECEIVED_KEY) ?? "0");
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  });
  const { totalPoints, refresh: refreshPoints } = useAttendancePoints();
  const streakRewards = useStreakMilestoneRewards();

  /**
   * 복권 결과 뒤 화면을 맞춘다.
   *
   * 출석점수(차감)와 받은 토스포인트(당첨 지급)가 **둘 다** 바뀌므로 함께 다시 읽는다.
   * 예전에는 출석점수만 갱신해서, 당첨돼도 "받은 토스포인트"가 그대로였다.
   */
  const refreshLotteryState = useCallback(async () => {
    await Promise.allSettled([refreshPoints(), syncTossPointLedger()]);
  }, [refreshPoints]);

  useEffect(() => {
    void syncTossPointLedger();
  }, []);

  useEffect(() => {
    const updateReceivedPoints = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (Number.isFinite(detail)) setTossPointsReceived(detail);
    };
    const updateFromStorage = (event: StorageEvent) => {
      if (event.key !== TOSS_POINTS_RECEIVED_KEY) return;
      const stored = Number(event.newValue ?? "0");
      setTossPointsReceived(Number.isFinite(stored) && stored > 0 ? stored : 0);
    };
    window.addEventListener(TOSS_POINTS_RECEIVED_EVENT, updateReceivedPoints);
    window.addEventListener("storage", updateFromStorage);
    return () => {
      window.removeEventListener(TOSS_POINTS_RECEIVED_EVENT, updateReceivedPoints);
      window.removeEventListener("storage", updateFromStorage);
    };
  }, []);

  useEffect(() => {
    api<CloverOverview>("/labs/clover")
      .then((overview) => {
        setPersonalBestMs(overview.personalBestMs ?? null);
        setMyRank(overview.myRank ?? null);
        setParticipantCount(overview.participantCount ?? 0);
      })
      .catch(() => {});
  }, []);

  const handleTabChange = (tab: HomeTab) => {
    if (tab === "home") onNavigateHome();
    else if (tab === "publicRooms") onNavigatePublicRooms();
    else if (tab === "profile") onNavigateProfile();
  };

  return (
    <div className="page lab-page">
      <header className="lab-header">
        <h1>포인트</h1>
        <button
          type="button"
          className="lab-received-points"
          onClick={() => setShowTossPointsDetail(true)}
          aria-label={`출석왕에서 지금까지 받은 토스포인트 ${tossPointsReceived.toLocaleString()}원 자세히 보기`}
        >
          <span className="lab-received-points-icon" aria-hidden="true"><span>P</span></span>
          <span className="lab-received-points-label">출석왕에서 받은 토스포인트</span>
          <strong>{tossPointsReceived.toLocaleString()}원</strong>
          <span className="lab-received-points-chevron" aria-hidden="true">›</span>
        </button>
      </header>

      <main className="lab-content">
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12,
          marginBottom: 14, padding: "16px 18px", borderRadius: "var(--radius-card)",
          background: "linear-gradient(135deg, var(--accent-blue), #5B9CF6)", color: "#fff",
        }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>출석점수</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{totalPoints === null ? "-" : `${totalPoints.toLocaleString()}점`}</div>
          </div>
          <button type="button" onClick={() => setShowLotteryModal(true)} style={{
            padding: "10px 14px", borderRadius: "var(--radius-button)", border: "none",
            background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700,
            whiteSpace: "nowrap", cursor: "pointer",
          }}>
            출석복권 구매
          </button>
        </div>
        <p className="lab-activity-intro">다양한 활동을 통해 빠르게 출석 점수를 모아 봐요!</p>
        {/* 클로버와 같은 카드. 출석 도장은 점수를 모으는 가장 큰 경로라 나란히 둔다. */}
        <button
          className="lab-clover-card lab-streak-card"
          onClick={() => setShowStreakRewardModal(true)}
          aria-label={streakRewards.claimableRewards.length > 0
            ? "출석 보상 확인 — 받을 보상이 있어요"
            : "출석 보상 확인"}
        >
          <span className="lab-clover-card-icon" aria-hidden="true">
            <img src="/출석왕_로고_배경제거.png" alt="" />
          </span>
          <span className="lab-clover-card-copy">
            <strong>출석 보상 확인</strong>
          </span>
          <span className="lab-clover-card-meta">
            <span>연속 {streakRewards.currentStreak}일</span>
          </span>
          <span className="lab-clover-card-arrow" aria-hidden="true">›</span>
          {streakRewards.claimableRewards.length > 0 && (
            <span className="lab-clover-card-progress">
              <span className="lab-streak-card-ready">받을 보상이 있어요</span>
              <span className="lab-clover-card-dot" aria-hidden="true" />
            </span>
          )}
        </button>
        <button className="lab-clover-card" onClick={onOpenCloverFinder}>
          <span className="lab-clover-card-icon" aria-hidden="true">
            <img src="/emojis/redrawn/wellwish-chick.png" alt="" />
          </span>
          <span className="lab-clover-card-copy">
            <strong>네잎 클로버 빨리 찾기</strong>
          </span>
          <span className="lab-clover-card-meta">
            {participantCount !== null && <span>{participantCount}명 참여</span>}
          </span>
          <span className="lab-clover-card-arrow" aria-hidden="true">›</span>
          {(personalBestMs !== null || myRank !== null) && (
            <span className="lab-clover-card-progress">
              {personalBestMs !== null && <span>최고 기록 {(personalBestMs / 1000).toFixed(2)}초</span>}
              {myRank !== null && <span>{myRank}위</span>}
            </span>
          )}
        </button>
        {/*
          클로버 카드 아래. 이미지 강조형은 세로로 길어서 높이를 고정하면 잘린다 —
          height를 주지 않고 광고가 정하게 둔다.
        */}
        <TossBannerAd
          adGroupId={BANNER_AD_GROUPS.imageEmphasis}
          variant="expanded"
          height={null}
          className="lab-inline-ad"
        />
        <p className="lab-footnote">포인트 기능을 계속 추가할게요.</p>
      </main>

      <HomeTabBar active="lab" onSelect={handleTabChange} />
      <AdMobBanner />
      {showLotteryModal && (
        <AttendanceLotteryModal
          totalPoints={totalPoints ?? 0}
          onClose={() => { setShowLotteryModal(false); void refreshLotteryState(); }}
          onPointsChanged={() => { void refreshLotteryState(); }}
        />
      )}
      {showStreakRewardModal && (
        <StreakRewardModal
          currentStreak={streakRewards.currentStreak}
          claimedDays={streakRewards.claimedDays}
          grantFailure={streakRewards.grantFailure}
          onClaim={streakRewards.claim}
          onClose={() => { setShowStreakRewardModal(false); void refreshPoints(); }}
        />
      )}
      {showTossPointsDetail && (
        <TossPointsReceivedModal amount={tossPointsReceived} onClose={() => setShowTossPointsDetail(false)} />
      )}
    </div>
  );
}
