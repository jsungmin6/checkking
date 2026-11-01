import { useCallback, useEffect, useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import TossBannerAd from "../components/TossBannerAd";
import AdMobBanner from "../components/AdMobBanner";
import type { HomeTab } from "../components/HomeTabBar";
import { api } from "../utils/api";
import AttendanceLotteryModal from "../components/AttendanceLotteryModal";
import TossPointsReceivedModal from "../components/TossPointsReceivedModal";
import { useAttendancePoints } from "../hooks/useAttendancePoints";
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
  const [tossPointsReceived, setTossPointsReceived] = useState(() => {
    const stored = Number(localStorage.getItem(TOSS_POINTS_RECEIVED_KEY) ?? "0");
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  });
  const { totalPoints, refresh: refreshPoints } = useAttendancePoints();

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
        <p className="lab-footnote">포인트 기능을 계속 추가할게요.</p>
      </main>

      <TossBannerAd />
      <HomeTabBar active="lab" onSelect={handleTabChange} />
      <AdMobBanner />
      {showLotteryModal && (
        <AttendanceLotteryModal
          totalPoints={totalPoints ?? 0}
          onClose={() => { setShowLotteryModal(false); void refreshLotteryState(); }}
          onPointsChanged={() => { void refreshLotteryState(); }}
        />
      )}
      {showTossPointsDetail && (
        <TossPointsReceivedModal amount={tossPointsReceived} onClose={() => setShowTossPointsDetail(false)} />
      )}
    </div>
  );
}
