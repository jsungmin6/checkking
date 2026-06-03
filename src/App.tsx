import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { getKakaoCodeFromUrl, clearKakaoCodeFromUrl } from "./utils/kakao";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import CreateRoomScreen from "./screens/CreateRoomScreen";
import JoinRoomScreen from "./screens/JoinRoomScreen";
import RoomScreen from "./screens/RoomScreen";
import RankingScreen from "./screens/RankingScreen";
import StatsScreen from "./screens/StatsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import type { ScreenName, User } from "./types";

export default function App() {
  const { user, loading, loginWithKakao, loginWithToss, logout, updateNickname } = useAuth();
  const [screen, setScreen] = useState<ScreenName>("home");
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoError, setKakaoError] = useState<string | null>(null);

  // 카카오 리다이렉트 후 ?code= 파라미터 처리 (마운트 시 1회만)
  useEffect(() => {
    const code = getKakaoCodeFromUrl();
    if (!code) return;

    clearKakaoCodeFromUrl();
    setKakaoLoading(true);
    loginWithKakao(code)
      .then(() => setScreen("home"))
      .catch((e) => setKakaoError(e instanceof Error ? e.message : "카카오 로그인 실패"))
      .finally(() => setKakaoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateTo = useCallback((s: ScreenName, roomId?: number) => {
    setScreen(s);
    if (roomId !== undefined) setActiveRoomId(roomId);
  }, []);

  const handleLogin = useCallback((_user: User) => {
    setScreen("home");
  }, []);

  if (loading || kakaoLoading) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid var(--accent-blue)", borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
        }} />
        {kakaoLoading && <div style={{ color: "var(--text-secondary)", marginTop: 16, fontSize: 14 }}>카카오 로그인 중...</div>}
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen onLogin={handleLogin} loginWithToss={loginWithToss} kakaoError={kakaoError} />
    );
  }

  switch (screen) {
    case "home":
      return (
        <HomeScreen
          user={user}
          onNavigateProfile={() => navigateTo("profile")}
          onNavigateCreateRoom={() => navigateTo("createRoom")}
          onNavigateJoinRoom={() => navigateTo("joinRoom")}
          onNavigateRoom={(id) => navigateTo("room", id)}
        />
      );
    case "profile":
      return (
        <ProfileScreen
          user={user}
          onBack={() => navigateTo("home")}
          onLogout={() => { logout(); setScreen("login"); }}
          onNicknameUpdate={updateNickname}
        />
      );
    case "createRoom":
      return <CreateRoomScreen onBack={() => navigateTo("home")} onCreated={(id) => navigateTo("room", id)} />;
    case "joinRoom":
      return <JoinRoomScreen onBack={() => navigateTo("home")} onJoined={(id) => navigateTo("room", id)} />;
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
