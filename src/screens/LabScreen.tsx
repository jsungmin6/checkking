import { useEffect, useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import type { HomeTab } from "../components/HomeTabBar";
import DevRequestModal from "../components/DevRequestModal";
import { api } from "../utils/api";
import "../styles/lab.css";

interface Props {
  onNavigateHome: () => void;
  onNavigatePublicRooms: () => void;
  onNavigateProfile: () => void;
  onOpenCloverFinder: () => void;
}

interface CloverOverview {
  pendingBoxes: number;
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
  const [hasPendingBox, setHasPendingBox] = useState(false);
  const [showDevRequestModal, setShowDevRequestModal] = useState(false);

  useEffect(() => {
    api<CloverOverview>("/labs/clover")
      .then((overview) => {
        setPersonalBestMs(overview.personalBestMs ?? null);
        setMyRank(overview.myRank ?? null);
        setParticipantCount(overview.participantCount ?? 0);
        setHasPendingBox((overview.pendingBoxes ?? 0) > 0);
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
        <h1>놀이터</h1>
      </header>

      <main className="lab-content">
        <button className="lab-clover-card" onClick={onOpenCloverFinder}>
          <span className="lab-clover-card-icon" aria-hidden="true">
            <img src="/emojis/redrawn/wellwish-chick.png" alt="" />
          </span>
          <span className="lab-clover-card-copy">
            <strong>네잎 클로버 빨리 찾기</strong>
          </span>
          <span className="lab-clover-card-meta">
            {hasPendingBox && <span className="lab-clover-card-dot" aria-label="받을 출석박스가 있어요" />}
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
        <div style={{ marginTop: 18 }}>
          <div style={{ margin: "0 4px 8px", color: "var(--text-secondary)", fontSize: 12 }}>기타</div>
          <button onClick={() => setShowDevRequestModal(true)} style={{
            display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", border: 0, borderRadius: "var(--radius-card)",
            background: "var(--bg-card)", boxShadow: "var(--shadow-card)",
            color: "var(--text-primary)", fontSize: 15, textAlign: "left", cursor: "pointer",
          }}>
            <span>개발 요구하기</span>
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{">"}</span>
          </button>
        </div>
        <p className="lab-footnote">놀이터 기능은 이용하면서 계속 추가할게요.</p>
      </main>

      <HomeTabBar active="lab" onSelect={handleTabChange} />
      {showDevRequestModal && <DevRequestModal onClose={() => setShowDevRequestModal(false)} />}
    </div>
  );
}
