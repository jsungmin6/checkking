import { useEffect, useState } from "react";
import { api } from "../utils/api";
import RoomCard from "../components/RoomCard";
import HomeTabBar from "../components/HomeTabBar";
import TossBannerAd from "../components/TossBannerAd";
import AdMobBanner from "../components/AdMobBanner";
import Toast from "../components/Toast";
import ConvertPointsModal from "../components/ConvertPointsModal";
import FeedbackButton from "../components/FeedbackButton";
import MissionButton from "../components/MissionButton";
import MissionModal from "../components/MissionModal";
import NewsButton from "../components/NewsButton";
import NewsModal from "../components/NewsModal";
import FeedbackModal from "../components/FeedbackModal";
import OnboardingModal from "../components/OnboardingModal";
import { useToast } from "../hooks/useToast";
import { useAttendancePoints, useFeedbackReward, useGreetingMission, POINTS_TO_WON_RATE } from "../hooks/useAttendancePoints";
import { useNews } from "../hooks/useNews";
import { GREETING_MISSION_ACTIVE } from "../missions";
import { maybePromptPushConsentOnHome } from "../utils/pushConsent";
import type { HomeTab } from "../components/HomeTabBar";
import type { AccountType, ClassroomListItem } from "../types";

interface HomeScreenProps {
  accountType?: AccountType;
  onNavigateCreateRoom: () => void;
  onNavigatePublicRooms: () => void;
  onNavigateRoom: (classroomId: number) => void;
  onNavigateProfile: () => void;
}

export default function HomeScreen({
  accountType, onNavigateCreateRoom, onNavigatePublicRooms, onNavigateRoom, onNavigateProfile,
}: HomeScreenProps) {
  const [rooms, setRooms] = useState<ClassroomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toastMessage, showToast } = useToast();
  const roomLimit = accountType === "PREMIUM" ? 50 : 10;
  const { totalPoints, addPoints, requestConversion } = useAttendancePoints();
  const { alreadyRewarded: feedbackAlreadyRewarded, markRewarded: markFeedbackRewarded } = useFeedbackReward();
  const { done: missionDone, alreadyRewarded: missionRewarded, hasUpdate: missionHasUpdate, markSeen: markMissionSeen, markRewarded: markMissionRewarded } = useGreetingMission();
  const { news, hasUnread: newsHasUnread, markSeen: markNewsSeen } = useNews();
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  // 보상을 받고 나면 버튼이 영구히 사라진다. 이벤트를 내리면 GREETING_MISSION_ACTIVE=false.
  const showMissionButton = GREETING_MISSION_ACTIVE && !missionRewarded;
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem("att-onboarding-seen") !== "1");

  const handleConvertPoints = () => {
    if (totalPoints < POINTS_TO_WON_RATE) {
      showToast(`${POINTS_TO_WON_RATE.toLocaleString()}P부터 전환할 수 있어요`);
      return;
    }
    setShowConvertModal(true);
  };

  const handleConverted = (convertedCoins: number) => {
    requestConversion(convertedCoins);
    setShowConvertModal(false);
    showToast(`토스 포인트 ${(convertedCoins / POINTS_TO_WON_RATE).toLocaleString()}P로 전환됐어요`);
  };


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
        maybePromptPushConsentOnHome(data.classrooms.length > 0);
      })
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (tab: HomeTab) => {
    if (tab === "profile") {
      onNavigateProfile();
    } else if (tab === "publicRooms") onNavigatePublicRooms();
  };

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>내 방</div>
        {/* 방 만들기/참여는 "방 찾기" 탭에 모아두어, 홈 헤더에는 소식만 남긴다. */}
        <NewsButton hasUnread={newsHasUnread} onClick={() => { markNewsSeen(); setShowNewsModal(true); }} />
      </div>
      <div style={{
        margin: "0 16px 12px", padding: "16px 18px", borderRadius: "var(--radius-card)",
        background: "linear-gradient(135deg, var(--accent-blue), #5B9CF6)", color: "#fff",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12,
        flexShrink: 0, maxWidth: 420,
      }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>출석 포인트</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{totalPoints.toLocaleString()}P</div>
        </div>
        <button onClick={handleConvertPoints} style={{
          padding: "10px 14px", borderRadius: "var(--radius-button)", border: "none",
          background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700,
          whiteSpace: "nowrap", cursor: "pointer",
        }}>
          토스 포인트로 바꾸기
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
      {showConvertModal && (
        <ConvertPointsModal
          totalPoints={totalPoints}
          onClose={() => setShowConvertModal(false)}
          onConverted={handleConverted}
        />
      )}
      {showFeedbackModal && (
        <FeedbackModal
          onClose={() => setShowFeedbackModal(false)}
          alreadyRewarded={feedbackAlreadyRewarded}
          onRewarded={(amount) => { addPoints(amount); markFeedbackRewarded(); }}
        />
      )}
      {showNewsModal && <NewsModal news={news} onClose={() => setShowNewsModal(false)} />}
      {showMissionModal && (
        <MissionModal
          done={missionDone}
          onClose={() => setShowMissionModal(false)}
          onRewarded={(amount) => { addPoints(amount); markMissionRewarded(); }}
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
