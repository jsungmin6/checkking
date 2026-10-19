import { useState } from "react";
import { isTossApp, isAndroid } from "../utils/platform";
import TermsViewer from "../components/TermsViewer";
import { startKakaoLogin } from "../utils/kakao";
import { startAppleLogin } from "../utils/apple";
import type { User } from "../types";

interface LoginScreenProps {
  onLogin: (user: User) => void;
  loginWithKakaoToken: (accessToken: string) => Promise<void>;
  loginWithApple: (identityToken: string) => Promise<void>;
  loginWithToss: (code: string, referrer: string) => Promise<{ user: User }>;
  kakaoLoading?: boolean;
  kakaoError?: string | null;
  onDevPreview?: () => void;
}

export default function LoginScreen({ onLogin, loginWithKakaoToken, loginWithApple, loginWithToss, kakaoLoading, kakaoError, onDevPreview }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingTerms, setViewingTerms] = useState<{ url: string; title: string } | null>(null);


  const handleKakaoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startKakaoLogin();
      if (result) {
        console.log("[출석왕] iOS 카카오 access_token 획득");
        await loginWithKakaoToken(result.accessToken);
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      setError(`카카오 에러: ${err.message ?? "알 수 없음"} (code: ${err.code ?? "none"})`);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startAppleLogin();
      console.log("[출석왕] Apple identity token 획득");
      await loginWithApple(result.identityToken);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      setError(`Apple 에러: ${err.message ?? "알 수 없음"} (code: ${err.code ?? "none"})`);
    } finally {
      setLoading(false);
    }
  };

  const handleTossLogin = async () => {
    setLoading(true);
    setError(null);
    let step = "토스 인증";
    try {
      const { TossAuth } = await import("@apps-in-toss/web-framework");
      const { authorizationCode, referrer } = await TossAuth.login();
      step = "서버 로그인 처리";
      const data = await loginWithToss(authorizationCode, referrer);
      onLogin(data.user);
    } catch (e) {
      setError(`${step}에 실패했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  const isToss = isTossApp();
  const isLoading = loading || kakaoLoading;
  const displayError = error || kakaoError;

  return (
    <div className="page" style={{ alignItems: "center", justifyContent: "center", gap: 16, padding: 20, background: "var(--bg-card)" }}>
      <img src="/출석왕_로고_배경제거.png" alt="출석왕" style={{ width: 120, height: 120 }} />
      <div style={{ fontSize: 24, fontWeight: 700 }}>출석왕</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>누가 제일 먼저 올까?</div>

      {displayError && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 8 }}>{displayError}</div>}

      <div style={{ width: "80%", display: "flex", flexDirection: "column", gap: 10 }}>
        {isToss ? (
          <>
            <button onClick={handleTossLogin} disabled={isLoading} style={{
              width: "100%", padding: 16, borderRadius: "var(--radius-button)", background: "#0064FF",
              color: "#fff", fontSize: 16, fontWeight: 700, opacity: isLoading ? 0.6 : 1,
            }}>
              {isLoading ? "로그인 중..." : "토스로 시작하기"}
            </button>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
              미성년자는 토스 정책에 따라 이용이 제한될 수 있습니다.<br/>
              이 경우 App Store에서 "출석왕" iOS 앱을 이용해주세요.
            </div>
          </>
        ) : (
          <>
            {!isAndroid() && (
              <button onClick={handleAppleLogin} disabled={isLoading} style={{
                width: "100%", padding: 16, borderRadius: 12, background: "#000",
                color: "#fff", fontSize: 16, fontWeight: 600, opacity: isLoading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                border: "none",
              }}>
                <svg width="20" height="24" viewBox="0 0 17 20" fill="currentColor">
                  <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.356-.037-.054-1.494-1.752-3.807-1.752-1.617-.016-3.162.948-3.984.948-.822 0-2.092-.924-3.438-.899C2.232 5.205.66 6.547.66 10.372c0 2.525 1.476 6.397 2.666 6.397.637.014 1.755-.949 3.094-.949 1.339 0 2.317.949 3.438.921 1.483-.024 2.387-2.371 2.387-2.371-.046-.019-2.7-1.036-2.7-4.131zM11.15 3.292c.746-.903 1.249-2.156 1.111-3.405-1.073.044-2.374.715-3.143 1.616-.69.796-1.293 2.067-1.131 3.287 1.197.093 2.418-.608 3.163-1.498z"/>
                </svg>
                {isLoading ? "로그인 중..." : "Apple로 시작하기"}
              </button>
            )}
            <button onClick={handleKakaoLogin} disabled={isLoading} style={{
              width: "100%", padding: 16, borderRadius: 12, background: "#FEE500",
              color: "rgba(0, 0, 0, 0.85)", fontSize: 16, fontWeight: 600, opacity: isLoading ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              border: "none",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1C4.477 1 0 4.477 0 8.667c0 2.7 1.777 5.077 4.467 6.433-.147.53-.95 3.41-.983 3.633 0 0-.02.166.088.229.108.063.234.014.234.014.308-.043 3.573-2.332 4.133-2.726.352.05.71.076 1.061.076 5.523 0 10-3.477 10-7.659C20 4.477 15.523 1 10 1"/>
              </svg>
              {isLoading ? "로그인 중..." : "카카오로 시작하기"}
            </button>
          </>
        )}
      </div>

      <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
        로그인 시{" "}
        <span onClick={() => setViewingTerms({ url: "/terms.html", title: "서비스 이용약관" })} style={{ color: "var(--text-secondary)", textDecoration: "underline", cursor: "pointer" }}>이용약관</span>,{" "}
        <span onClick={() => setViewingTerms({ url: "/privacy.html", title: "개인정보 처리방침" })} style={{ color: "var(--text-secondary)", textDecoration: "underline", cursor: "pointer" }}>개인정보 처리방침</span>,{" "}
        <span onClick={() => setViewingTerms({ url: "/location-terms.html", title: "위치정보 이용약관" })} style={{ color: "var(--text-secondary)", textDecoration: "underline", cursor: "pointer" }}>위치정보 이용약관</span>에<br/>동의한 것으로 간주됩니다.
      </div>
      {onDevPreview && (
        <button onClick={onDevPreview} style={{
          marginTop: 20, padding: "10px 18px", borderRadius: "var(--radius-button)",
          background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
          border: "1px dashed var(--border-color)",
        }}>
          🛠 로컬 미리보기 (DEV)
        </button>
      )}
      {viewingTerms && <TermsViewer url={viewingTerms.url} title={viewingTerms.title} onClose={() => setViewingTerms(null)} />}
    </div>
  );
}
