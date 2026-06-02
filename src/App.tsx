import { useState, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import type { ScreenName, User } from "./types";

export default function App() {
  const { user, loading, loginWithKakao, loginWithToss, logout, updateNickname } = useAuth();
  const [screen, setScreen] = useState<ScreenName>("home");
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

  // updateNickname and logout are used in later tasks (ProfileScreen)
  void updateNickname;
  void logout;

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
      <LoginScreen onLogin={handleLogin} loginWithKakao={loginWithKakao} loginWithToss={loginWithToss} />
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
    default:
      return (
        <div className="page" style={{ padding: 16 }}>
          <p>화면: {screen} (구현 예정) {activeRoomId}</p>
          <button onClick={() => navigateTo("home")}>홈으로</button>
        </div>
      );
  }
}
