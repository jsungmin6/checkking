import { useState, useCallback, useEffect, useRef } from "react";
import { closeView, graniteEvent } from "@apps-in-toss/web-framework";
import { useAuth } from "./hooks/useAuth";
import { isCapacitor, isIOS, isTossApp } from "./utils/platform";
import { resetDevPreview } from "./utils/api";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import CreateRoomScreen from "./screens/CreateRoomScreen";
import JoinRoomScreen from "./screens/JoinRoomScreen";
import RoomScreen from "./screens/RoomScreen";
import RankingScreen from "./screens/RankingScreen";
import StatsScreen from "./screens/StatsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import TermsAgreementScreen from "./screens/TermsAgreementScreen";
import PublicRoomsScreen from "./screens/PublicRoomsScreen";
import type { ScreenName, User } from "./types";

export default function App() {
  const { user: authUser, loading, authError, needsTermsAgreement, loginWithKakaoToken, loginWithApple, loginWithToss, acceptTerms, logout, updateNickname } = useAuth();
  // TEMP dev-only local preview bypass (no real login). Remove before shipping.
  const [devPreviewUser, setDevPreviewUser] = useState<User | null>(null);
  const user = authUser ?? devPreviewUser;
  const [screen, setScreen] = useState<ScreenName>("home");
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const attInitRef = useRef(false);

  // 앱인토스 네이티브 뒤로가기를 SPA 화면 이동에 연결한다.
  useEffect(() => {
    if (!isTossApp()) return;
    return graniteEvent.addEventListener("backEvent", {
      onEvent: () => {
        if (screen !== "home") setScreen("home");
        else void closeView();
      },
    });
  }, [screen]);

  // ATT → AdMob 초기화 (loading 끝나고 앱이 active 상태일 때)
  useEffect(() => {
    if (loading || attInitRef.current || !isCapacitor() || isIOS()) return;
    attInitRef.current = true;

    (async () => {
      try {
        const { AppTrackingTransparency } = await import("@capgo/capacitor-app-tracking-transparency");
        const { status } = await AppTrackingTransparency.getStatus();
        if (status === "notDetermined") {
          await new Promise((r) => setTimeout(r, 500));
          await AppTrackingTransparency.requestPermission();
        }
      } catch {}
    })();
  }, [loading]);

  const navigateTo = useCallback((s: ScreenName, roomId?: number) => {
    setScreen(s);
    if (roomId !== undefined) setActiveRoomId(roomId);
  }, []);

  const handleLogin = useCallback((_user: User) => {
    setScreen("home");
  }, []);

  if (loading) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid var(--accent-blue)", borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
        }} />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loginWithKakaoToken={loginWithKakaoToken}
        loginWithApple={loginWithApple}
        loginWithToss={loginWithToss}
        kakaoError={authError}
        onDevPreview={import.meta.env.DEV ? () => {
          localStorage.setItem("att-points-total", "1500"); // TEMP: 로컬 확인용
          resetDevPreview();
          setDevPreviewUser({ userId: -1, nickname: "민준", loginType: "KAKAO", accountType: "FREE" });
        } : undefined}
      />
    );
  }

  if (needsTermsAgreement) {
    return <TermsAgreementScreen onAgree={acceptTerms} onCancel={logout} />;
  }

  switch (screen) {
    case "home":
      return (
        <HomeScreen
          accountType={user.accountType}
          onNavigateProfile={() => navigateTo("profile")}
          onNavigateCreateRoom={() => navigateTo("createRoom")}
          onNavigateJoinRoom={() => navigateTo("joinRoom")}
          onNavigatePublicRooms={() => navigateTo("publicRooms")}
          onNavigateRoom={(id) => navigateTo("room", id)}
        />
      );
    case "profile":
      return (
        <ProfileScreen
          user={user}
          onNavigateHome={() => navigateTo("home")}
          onNavigatePublicRooms={() => navigateTo("publicRooms")}
          onLogout={() => { logout(); setScreen("home"); }}
          onNicknameUpdate={updateNickname}
        />
      );
    case "createRoom":
      return <CreateRoomScreen accountType={user.accountType} onBack={() => navigateTo("home")} onCreated={(id) => navigateTo("room", id)} />;
    case "joinRoom":
      return <JoinRoomScreen onBack={() => navigateTo("home")} onJoined={(id) => navigateTo("room", id)} />;
    case "publicRooms":
      return <PublicRoomsScreen accountType={user.accountType} onNavigateHome={() => navigateTo("home")} onNavigateProfile={() => navigateTo("profile")} onJoined={(id) => navigateTo("room", id)} />;
    case "room":
      if (!activeRoomId) { setScreen("home"); return null; }
      return (
        <RoomScreen
          classroomId={activeRoomId}
          user={user}
          onBack={() => navigateTo("home")}
          onTabChange={(tab) => {
            if (tab === "ranking") navigateTo("ranking");
            else if (tab === "stats") navigateTo("stats");
            else if (tab === "settings") navigateTo("settings");
          }}
        />
      );
    case "ranking":
      if (!activeRoomId) { setScreen("home"); return null; }
      return (
        <RankingScreen classroomId={activeRoomId} user={user}
          onBack={() => navigateTo("home")}
          onTabChange={(tab) => {
            if (tab === "today") navigateTo("room", activeRoomId);
            else if (tab === "stats") navigateTo("stats");
            else if (tab === "settings") navigateTo("settings");
          }}
        />
      );
    case "stats":
      if (!activeRoomId) { setScreen("home"); return null; }
      return (
        <StatsScreen classroomId={activeRoomId}
          onBack={() => navigateTo("home")}
          onTabChange={(tab) => {
            if (tab === "today") navigateTo("room", activeRoomId);
            else if (tab === "ranking") navigateTo("ranking");
            else if (tab === "settings") navigateTo("settings");
          }}
        />
      );
    case "settings":
      if (!activeRoomId) { setScreen("home"); return null; }
      return (
        <SettingsScreen classroomId={activeRoomId} user={user}
          onBack={() => navigateTo("home")}
          onTabChange={(tab) => {
            if (tab === "today") navigateTo("room", activeRoomId);
            else if (tab === "ranking") navigateTo("ranking");
            else if (tab === "stats") navigateTo("stats");
          }}
          onLeave={() => navigateTo("home")}
          onDelete={() => navigateTo("home")}
        />
      );
    default:
      return (
        <div className="page" style={{ padding: 16 }}>
          <p>화면: {screen} (구현 예정) {activeRoomId}</p>
          <button onClick={() => navigateTo("home")}>홈으로</button>
        </div>
      );
  }
}
