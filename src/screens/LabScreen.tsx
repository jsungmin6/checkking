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
import OtherAppsModal from "../components/OtherAppsModal";
import DailyRewardModal from "../components/DailyRewardModal";
import MissionModal from "../components/MissionModal";
import { useMissions } from "../hooks/useMissions";
import { DAILY_REWARD_LIMIT, getDailyRewardCount } from "../utils/attendancePoints";
import { OTHER_APP_VISIT_POINTS, unvisitedCount } from "../utils/otherApps";
import { STREAK_REWARD_WON, syncTossPointLedger, TOSS_POINTS_RECEIVED_EVENT, TOSS_POINTS_RECEIVED_KEY } from "../utils/tossPromotion";
import { nextTossRewardDay } from "../utils/attendancePoints";
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
  const [showOtherApps, setShowOtherApps] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const { missions, markSeen: markMissionSeen, claim: claimMission } = useMissions();
  const dailyUsed = getDailyRewardCount();
  const claimableMissions = missions.filter((m) => m.done).length;
  // 아직 점수를 안 받은 앱 수. 모달에서 받고 나오면 줄어든다.
  const [unvisitedApps, setUnvisitedApps] = useState(unvisitedCount);
  const [tossPointsReceived, setTossPointsReceived] = useState(() => {
    const stored = Number(localStorage.getItem(TOSS_POINTS_RECEIVED_KEY) ?? "0");
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  });
  const { totalPoints, refresh: refreshPoints } = useAttendancePoints();
  const streakRewards = useStreakMilestoneRewards();
  // 다음 토스포인트까지 며칠 남았는지. 지급일이 더 없으면(97일차 이후) 숨긴다.
  const nextRewardDay = nextTossRewardDay(streakRewards.currentStreak);
  const tossRewardCountdown = nextRewardDay === null ? null : nextRewardDay - streakRewards.currentStreak;

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
        {/*
          있는 기능을 한눈에 보여주는 세 칸. 세로로 쌓으면 화면이 길어지기만 해서
          정사각형 버튼으로 나란히 둔다.
        */}
        <div className="lab-quick-grid">
          <button
            type="button"
            className={`lab-quick-tile${streakRewards.claimableRewards.length > 0 ? " is-ready" : ""}`}
            onClick={() => setShowStreakRewardModal(true)}
            aria-label={streakRewards.claimableRewards.length > 0
              ? "연속 출석 보상 — 받을 보상이 있어요"
              : "연속 출석 보상"}
          >
            <img className="lab-quick-icon" src="/출석왕_로고_배경제거.png" alt="" aria-hidden="true" />
            <strong>연속 출석</strong>
            <span className="lab-quick-state">
              {streakRewards.claimableRewards.length > 0
                ? "받을 보상 있음"
                : tossRewardCountdown !== null
                  ? `${tossRewardCountdown}일 뒤 ${STREAK_REWARD_WON}원`
                  : `${streakRewards.currentStreak}일째`}
            </span>
            {streakRewards.claimableRewards.length > 0 && <span className="lab-quick-dot" aria-hidden="true" />}
          </button>

          <button
            type="button"
            className="lab-quick-tile"
            onClick={() => setShowDailyReward(true)}
            aria-label={`오늘의 출석 보상 — ${DAILY_REWARD_LIMIT}번 중 ${dailyUsed}번 받음`}
          >
            <img className="lab-quick-icon" src="/rewards/gift-box-closed.png" alt="" aria-hidden="true" />
            <strong>오늘 출석</strong>
            <span className="lab-quick-state">{dailyUsed} / {DAILY_REWARD_LIMIT}번</span>
          </button>

          <button
            type="button"
            className={`lab-quick-tile${claimableMissions > 0 ? " is-ready" : ""}`}
            onClick={() => { markMissionSeen(); setShowMissions(true); }}
            aria-label={claimableMissions > 0 ? `미션 — ${claimableMissions}개 받을 수 있어요` : "미션"}
          >
            <span className="lab-quick-emoji" aria-hidden="true">🎯</span>
            <strong>미션</strong>
            <span className="lab-quick-state">
              {claimableMissions > 0
                ? `${claimableMissions}개 받기`
                : missions.length > 0 ? `${missions.length}개 남음` : "준비 중"}
            </span>
            {claimableMissions > 0 && <span className="lab-quick-dot" aria-hidden="true" />}
          </button>
        </div>
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
        {/* 클로버 다음. 다른 미니앱으로 보내고 처음 여는 앱마다 점수를 준다. */}
        <button className="lab-clover-card lab-other-apps-card" onClick={() => setShowOtherApps(true)}>
          <span className="lab-clover-card-icon" aria-hidden="true">🧭</span>
          <span className="lab-clover-card-copy">
            <strong>다른 앱 둘러보고 출석점수 받기</strong>
          </span>
          <span className="lab-clover-card-meta">
            {unvisitedApps > 0 && <span>{unvisitedApps}개 남음</span>}
          </span>
          <span className="lab-clover-card-arrow" aria-hidden="true">›</span>
          {unvisitedApps > 0 && (
            <span className="lab-clover-card-progress">
              <span className="lab-streak-card-ready">
                처음 열어보는 앱마다 {OTHER_APP_VISIT_POINTS.toLocaleString()}점
              </span>
              <span className="lab-clover-card-dot" aria-hidden="true" />
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
      {showDailyReward && <DailyRewardModal onClose={() => setShowDailyReward(false)} />}
      {showMissions && (
        <MissionModal
          missions={missions}
          onClose={() => setShowMissions(false)}
          onRewarded={(missionId) => { claimMission(missionId); void refreshPoints(); }}
        />
      )}
      {showOtherApps && (
        <OtherAppsModal
          onClose={() => { setShowOtherApps(false); setUnvisitedApps(unvisitedCount()); }}
          onEarned={() => { setUnvisitedApps(unvisitedCount()); void refreshPoints(); }}
        />
      )}
      {showTossPointsDetail && (
        <TossPointsReceivedModal amount={tossPointsReceived} onClose={() => setShowTossPointsDetail(false)} />
      )}
    </div>
  );
}
