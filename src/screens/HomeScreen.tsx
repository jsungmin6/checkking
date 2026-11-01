import { useEffect, useState } from "react";
import { api } from "../utils/api";
import RoomCard from "../components/RoomCard";
import HomeTabBar from "../components/HomeTabBar";
import TossBannerAd from "../components/TossBannerAd";
import AdMobBanner from "../components/AdMobBanner";
import Toast from "../components/Toast";
import FeedbackButton from "../components/FeedbackButton";
import MissionButton from "../components/MissionButton";
import MissionModal from "../components/MissionModal";
import NewsButton from "../components/NewsButton";
import NewsModal from "../components/NewsModal";
import FeedbackModal from "../components/FeedbackModal";
import OnboardingModal from "../components/OnboardingModal";
import StreakRewardModal from "../components/StreakRewardModal";
import { useToast } from "../hooks/useToast";
import { useAttendancePoints, useFeedbackReward, useStreakMilestoneRewards } from "../hooks/useAttendancePoints";
import { useMissions } from "../hooks/useMissions";
import { useNews } from "../hooks/useNews";
import { maybePromptMissionPushConsent } from "../utils/pushConsent";
import type { HomeTab } from "../components/HomeTabBar";
import type { AccountType, ClassroomListItem } from "../types";

interface HomeScreenProps {
  accountType?: AccountType;
  onNavigateCreateRoom: () => void;
  onNavigatePublicRooms: () => void;
  onNavigateRoom: (classroomId: number) => void;
  onNavigateProfile: () => void;
  onNavigateLab: () => void;
}

interface AttendanceLotteryWinner {
  id: number;
  nickname: string;
  amountWon: number;
  paidAt: string;
}

const WINNER_ROTATION_INTERVAL_MS = 3_000;
const WINNER_REFRESH_INTERVAL_MS = 30_000;

function maskWinnerNickname(nickname: string): string {
  const characters = Array.from(nickname);
  if (characters.length <= 2) return nickname;
  return `${"*".repeat(characters.length - 2)}${characters.slice(-2).join("")}`;
}

export default function HomeScreen({
  accountType, onNavigateCreateRoom, onNavigatePublicRooms, onNavigateRoom, onNavigateProfile, onNavigateLab,
}: HomeScreenProps) {
  const [rooms, setRooms] = useState<ClassroomListItem[]>([]);
  const [recentLotteryWinners, setRecentLotteryWinners] = useState<AttendanceLotteryWinner[]>([]);
  const [recentLotteryWinnerIndex, setRecentLotteryWinnerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toastMessage, showToast } = useToast();
  const roomLimit = accountType === "PREMIUM" ? 50 : 10;
  const { claim: claimPointReward, refresh: refreshPoints } = useAttendancePoints();
  // 연속 출석일과 수령 내역을 서버에서 받는다. 기기를 바꿔도 이어진다.
  const streakRewards = useStreakMilestoneRewards();
  const appCurrentStreak = streakRewards.currentStreak;
  const { alreadyRewarded: feedbackAlreadyRewarded, markRewarded: markFeedbackRewarded } = useFeedbackReward();
  const { missions, hasUpdate: missionHasUpdate, markSeen: markMissionSeen, claim: claimMission } = useMissions();
  const { news, hasUnread: newsHasUnread, markSeen: markNewsSeen } = useNews();
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  // 이번에 보상을 받았는지 — 모달을 닫은 뒤 미션 알림 동의를 물어볼지 판단한다.
  const [missionJustRewarded, setMissionJustRewarded] = useState(false);
  // 남은 미션이 없으면(전부 보상받았거나 이벤트를 내렸으면) 버튼이 사라진다.
  const showMissionButton = missions.length > 0;
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showStreakRewardModal, setShowStreakRewardModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem("att-onboarding-seen") !== "1");

  const handleCreateRoom = async () => {
    let currentRooms = rooms;
    if (loading) {
      try {
        const data = await api<{ classrooms: ClassroomListItem[] }>("/classrooms/my");
        currentRooms = data.classrooms;
        setRooms(currentRooms);
      } catch {
        onNavigateCreateRoom();
        return;
      }
    }
    if (currentRooms.length >= roomLimit) {
      showToast(`방은 ${roomLimit}개까지만 이용할 수 있어요.`);
      return;
    }
    onNavigateCreateRoom();
  };

  useEffect(() => {
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/my")
      .then((data) => {
        setRooms(data.classrooms);
      })
      .catch(() => {
        setRooms([]);
      })
      .finally(() => setLoading(false));
  }, []);


  useEffect(() => {
    let active = true;
    const loadRecentLotteryWinner = () => {
      api<AttendanceLotteryWinner[]>("/labs/attendance-lottery/recent-winners")
        .then((winners) => {
          if (active) {
            setRecentLotteryWinners(winners.slice(0, 34));
          }
        })
        .catch(() => {
          // 일시적인 네트워크 오류에는 마지막으로 받은 당첨자 목록을 유지한다.
        });
    };
    loadRecentLotteryWinner();
    const refreshTimer = window.setInterval(loadRecentLotteryWinner, WINNER_REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    setRecentLotteryWinnerIndex(0);
  }, [recentLotteryWinners[0]?.id]);

  useEffect(() => {
    if (recentLotteryWinners.length < 2) {
      setRecentLotteryWinnerIndex(0);
      return;
    }
    const rotationTimer = window.setInterval(() => {
      setRecentLotteryWinnerIndex((current) => (current + 1) % recentLotteryWinners.length);
    }, WINNER_ROTATION_INTERVAL_MS);
    return () => window.clearInterval(rotationTimer);
  }, [recentLotteryWinners.length]);

  const handleTabChange = (tab: HomeTab) => {
    if (tab === "profile") {
      onNavigateProfile();
    } else if (tab === "publicRooms") onNavigatePublicRooms();
    else if (tab === "lab") onNavigateLab();
  };

  const activeLotteryWinner = recentLotteryWinners.length > 0
    ? recentLotteryWinners[recentLotteryWinnerIndex % recentLotteryWinners.length]
    : null;

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>내 방</div>
          <button
            type="button"
            className="app-streak-reward-badge"
            onClick={() => setShowStreakRewardModal(true)}
            aria-label={streakRewards.claimableRewards.length > 0
              ? "연속 출석 보상 확인"
              : `연속 출석 보상 ${appCurrentStreak ?? 0}일`}
          >
            <span>연속 출석 보상 <strong>{appCurrentStreak ?? 0}일</strong></span>
            {streakRewards.claimableRewards.length > 0 && <span className="streak-reward-dot" aria-label="받을 보상이 있어요" />}
          </button>
        </div>
        {/* 방 만들기/참여는 "방 찾기" 탭에 모아두어, 홈 헤더에는 소식만 남긴다. */}
        <NewsButton hasUnread={newsHasUnread} onClick={() => { markNewsSeen(); setShowNewsModal(true); }} />
      </div>
      <div className="attendance-box-promo">
        <div className="attendance-box-winner-window" aria-live="off">
          <span className="attendance-box-winner-label">최대 5,000원 당첨!</span>
          <span key={activeLotteryWinner?.id ?? "empty"} className="attendance-box-winner-line">
            {activeLotteryWinner
              ? `${maskWinnerNickname(activeLotteryWinner.nickname)}님 ${activeLotteryWinner.amountWon.toLocaleString()}원 당첨!`
              : "첫 당첨의 주인공이 되어보세요"}
          </span>
        </div>
        <button type="button" className="attendance-box-promo-button" onClick={onNavigateLab}>
          <svg className="attendance-box-promo-image" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M10 8h28a4 4 0 0 1 4 4v7a5 5 0 0 0 0 10v7a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-7a5 5 0 0 0 0-10v-7a4 4 0 0 1 4-4Z" fill="#fff" />
            <path d="M24 11v26" stroke="#8bb7fb" strokeWidth="2" strokeDasharray="2 3" />
            <path d="m16.8 17.2 1.7 3.5 3.9.6-2.8 2.7.7 3.9-3.5-1.8-3.5 1.8.7-3.9-2.8-2.7 3.9-.6 1.7-3.5Z" fill="#ffbd35" />
            <path d="M29 19h7M29 24h6M29 29h7" stroke="#4388ee" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="attendance-box-promo-action">
            <span>출석복권 받기</span>
            <span aria-hidden="true" className="attendance-box-promo-arrow">›</span>
          </span>
        </button>
      </div>

      <div style={{ padding: "12px 16px", flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>불러오는 중...</div>
        ) : rooms.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>아직 참여한 방이 없어요</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>방을 만들거나 다른 방에 참여해보세요</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleCreateRoom} style={{ padding: "12px 24px", borderRadius: "var(--radius-button)", background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 600 }}>방 만들기</button>
              {/* 참여는 "방 찾기" 탭에 모아두었으므로, 여기서는 코드 입력 화면이 아니라 그 탭으로 보낸다. */}
              <button onClick={onNavigatePublicRooms} style={{ padding: "12px 24px", borderRadius: "var(--radius-button)", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: 15, fontWeight: 600 }}>참여하기</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }} className="room-grid">
            {rooms.map((room) => (
              <RoomCard key={room.classroomId} room={room} onClick={() => onNavigateRoom(room.classroomId)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, position: "relative" }}>
        {(showMissionButton || !feedbackAlreadyRewarded) && (
          // 아래부터 쌓는다 — 편지 버튼이 사라지면 미션 버튼이 그 자리로 내려온다.
          <div style={{
            position: "absolute", right: 16, bottom: "calc(100% + 16px)", zIndex: 30,
            display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end",
          }}>
            {showMissionButton && (
              <MissionButton hasUpdate={missionHasUpdate} onClick={() => { markMissionSeen(); setShowMissionModal(true); }} />
            )}
            {!feedbackAlreadyRewarded && <FeedbackButton onClick={() => setShowFeedbackModal(true)} />}
          </div>
        )}
        <TossBannerAd />
        <HomeTabBar active="home" onSelect={handleTabChange} />
        <AdMobBanner />
      </div>
      <Toast message={toastMessage} />
      {showStreakRewardModal && (
        <StreakRewardModal
          currentStreak={appCurrentStreak ?? 0}
          claimedDays={streakRewards.claimedDays}
          onClaim={streakRewards.claim}
          onClose={() => { setShowStreakRewardModal(false); void refreshPoints(); }}
        />
      )}
      {showFeedbackModal && (
        <FeedbackModal
          onClose={() => setShowFeedbackModal(false)}
          alreadyRewarded={feedbackAlreadyRewarded}
          onRewarded={() => { void claimPointReward("FEEDBACK").catch(() => {}); markFeedbackRewarded(); }}
        />
      )}
      {showNewsModal && <NewsModal news={news} onClose={() => setShowNewsModal(false)} />}
      {showMissionModal && (
        <MissionModal
          missions={missions}
          onClose={() => {
            setShowMissionModal(false);
            // 선물상자 연출과 겹치지 않게 모달을 닫은 뒤에 물어본다.
            if (missionJustRewarded) {
              setMissionJustRewarded(false);
              maybePromptMissionPushConsent();
            }
          }}
          onRewarded={(missionId) => {
            void claimPointReward("MISSION", missionId).catch(() => {});
            claimMission(missionId);
            setMissionJustRewarded(true);
          }}
        />
      )}
      {showOnboarding && (
        <OnboardingModal onClose={() => {
          localStorage.setItem("att-onboarding-seen", "1");
          setShowOnboarding(false);
        }} />
      )}
    </div>
  );
}
