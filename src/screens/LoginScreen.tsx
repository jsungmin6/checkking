import { useState } from "react";
import { isTossApp } from "../utils/platform";
import type { User } from "../types";

interface LoginScreenProps {
  onLogin: (user: User) => void;
  loginWithKakao: (code: string) => Promise<{ user: User }>;
  loginWithToss: (code: string, referrer: string) => Promise<{ user: User }>;
}

export default function LoginScreen({ onLogin, loginWithKakao, loginWithToss }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKakaoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: iOS에서 카카오 SDK 연동 (Capacitor 플러그인)
      // const { authorizationCode } = await KakaoSDK.login();
      const authorizationCode = "dev_kakao_code";
      const data = await loginWithKakao(authorizationCode);
      onLogin(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "카카오 로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleTossLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { appLogin } = await import("@apps-in-toss/web-framework");
      const { authorizationCode, referrer } = await appLogin();
      const data = await loginWithToss(authorizationCode, referrer);
      onLogin(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "토스 로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const isToss = isTossApp();

  return (
    <div className="page" style={{ alignItems: "center", justifyContent: "center", gap: 16, padding: 20 }}>
      <div style={{ fontSize: 48 }}>🏫</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>등교왕</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>누가 제일 먼저 올까?</div>

      {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <div style={{ width: "80%", display: "flex", flexDirection: "column", gap: 10 }}>
        {isToss ? (
          <button onClick={handleTossLogin} disabled={loading} style={{
            width: "100%", padding: 14, borderRadius: 10, background: "#0064FF",
            color: "#fff", fontSize: 15, fontWeight: 600, opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "로그인 중..." : "토스로 시작하기"}
          </button>
        ) : (
          <button onClick={handleKakaoLogin} disabled={loading} style={{
            width: "100%", padding: 14, borderRadius: 10, background: "#FEE500",
            color: "#000", fontSize: 15, fontWeight: 600, opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "로그인 중..." : "카카오로 시작하기"}
          </button>
        )}
      </div>
    </div>
  );
}
