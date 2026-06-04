import { useState } from "react";
import { isTossApp } from "../utils/platform";
import { startKakaoLogin } from "../utils/kakao";
import type { User } from "../types";

interface LoginScreenProps {
  onLogin: (user: User) => void;
  loginWithKakaoToken: (accessToken: string) => Promise<void>;
  loginWithToss: (code: string, referrer: string) => Promise<{ user: User }>;
  kakaoLoading?: boolean;
  kakaoError?: string | null;
}

export default function LoginScreen({ onLogin, loginWithKakaoToken, loginWithToss, kakaoLoading, kakaoError }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKakaoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startKakaoLogin();
      if (result) {
        // iOS: 네이티브 SDK가 access_token 반환
        console.log("[등교왕] iOS 카카오 access_token 획득");
        await loginWithKakaoToken(result.accessToken);
      }
      // 웹: 리다이렉트되므로 여기에 도달하지 않음
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
  const isLoading = loading || kakaoLoading;
  const displayError = error || kakaoError;

  return (
    <div className="page" style={{ alignItems: "center", justifyContent: "center", gap: 16, padding: 20, background: "var(--bg-card)" }}>
      <div style={{ fontSize: 48 }}>🏫</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>등교왕</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>누가 제일 먼저 올까?</div>

      {displayError && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 8 }}>{displayError}</div>}

      <div style={{ width: "80%", display: "flex", flexDirection: "column", gap: 10 }}>
        {isToss ? (
          <button onClick={handleTossLogin} disabled={isLoading} style={{
            width: "100%", padding: 16, borderRadius: "var(--radius-button)", background: "#0064FF",
            color: "#fff", fontSize: 16, fontWeight: 700, opacity: isLoading ? 0.6 : 1,
          }}>
            {isLoading ? "로그인 중..." : "토스로 시작하기"}
          </button>
        ) : (
          <button onClick={handleKakaoLogin} disabled={isLoading} style={{
            width: "100%", padding: 16, borderRadius: "var(--radius-button)", background: "#FEE500",
            color: "#000", fontSize: 16, fontWeight: 700, opacity: isLoading ? 0.6 : 1,
          }}>
            {isLoading ? "로그인 중..." : "카카오로 시작하기"}
          </button>
        )}
      </div>
    </div>
  );
}
