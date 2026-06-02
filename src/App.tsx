import { useState, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./screens/LoginScreen";
import type { ScreenName, User } from "./types";

export default function App() {
  const { user, loading, loginWithKakao, loginWithToss, logout, updateNickname } = useAuth();
  const [screen, setScreen] = useState<ScreenName>("home");
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

  // updateNickname is used in later tasks (ProfileScreen)
  void updateNickname;

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
        <div className="page" style={{ padding: 16 }}>
          <h2>내 방</h2>
          <p style={{ color: "var(--text-secondary)" }}>{user.nickname}님, 환영합니다! (화면 구현 예정)</p>
          <button onClick={logout} style={{ marginTop: 16, color: "var(--text-secondary)" }}>로그아웃</button>
        </div>
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
