import { useCallback, useState, useEffect } from "react";
import { TOKEN_KEYS, KAKAO_REDIRECT_URI } from "../constants";
import { api, clearTokens } from "../utils/api";
import { isCapacitor } from "../utils/platform";
import type { AuthResponse, User, Profile } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const KAKAO_CODE_KEY = "kakao_auth_code";

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    console.log("[등교왕] useAuth 초기화 시작");

    // sessionStorage에서 카카오 인가코드 확인
    const kakaoCode = sessionStorage.getItem(KAKAO_CODE_KEY);
    const kakaoTime = sessionStorage.getItem("kakao_auth_time");

    // 즉시 삭제 (실패해도 재시도하지 않음)
    sessionStorage.removeItem(KAKAO_CODE_KEY);
    sessionStorage.removeItem("kakao_auth_time");

    // 5분 이내 코드만 사용
    const isExpired = kakaoTime && (Date.now() - Number(kakaoTime)) > 5 * 60 * 1000;

    if (kakaoCode) {
      console.log(`[등교왕] 카카오 코드 발견 (길이: ${kakaoCode.length}, 만료: ${isExpired}, 경과: ${kakaoTime ? Math.round((Date.now() - Number(kakaoTime)) / 1000) + "초" : "시간없음"})`);
    }

    if (kakaoCode && !isExpired) {
      console.log("[등교왕] 카카오 코드로 로그인 시도");
      api<AuthResponse>("/auth/login/kakao", {
        method: "POST",
        body: JSON.stringify({ authorizationCode: kakaoCode, redirectUri: KAKAO_REDIRECT_URI }),
      })
        .then((data) => {
          console.log("[등교왕] 카카오 로그인 성공:", data.user.nickname);
          localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
          localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
          setState({ user: data.user, loading: false, error: null });
        })
        .catch((e) => {
          console.error("[등교왕] 카카오 로그인 실패:", e);
          setState({ user: null, loading: false, error: e instanceof Error ? e.message : "카카오 로그인 실패" });
        });
      return;
    }

    if (kakaoCode && isExpired) {
      console.log("[등교왕] 카카오 코드 만료됨, 무시");
    }

    // 저장된 토큰으로 세션 복원
    const token = localStorage.getItem(TOKEN_KEYS.ACCESS);
    if (!token) {
      console.log("[등교왕] 저장된 토큰 없음 → 로그인 화면");
      setState({ user: null, loading: false, error: null });
      return;
    }

    console.log("[등교왕] 저장된 토큰으로 세션 복원 시도");
    api<Profile>("/users/me")
      .then((profile) => {
        console.log("[등교왕] 세션 복원 성공:", profile.nickname);
        setState({
          user: {
            userId: profile.userId,
            nickname: profile.nickname,
            loginType: profile.loginType,
          },
          loading: false,
          error: null,
        });
      })
      .catch((e) => {
        console.error("[등교왕] 세션 복원 실패:", e);
        clearTokens();
        setState({ user: null, loading: false, error: null });
      });
  }, []);

  // iOS 딥링크 수신 (checkking://login?accessToken=...&refreshToken=...&userId=...&nickname=...&loginType=...)
  useEffect(() => {
    if (!isCapacitor()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { App: CapApp } = await import("@capacitor/app");
      const listener = await CapApp.addListener("appUrlOpen", async (event) => {
        console.log("[등교왕] 딥링크 수신:", event.url);

        try {
          const url = new URL(event.url);
          if (url.host === "login") {
            const error = url.searchParams.get("error");
            if (error) {
              console.error("[등교왕] iOS 카카오 로그인 에러:", error);
              setState({ user: null, loading: false, error: decodeURIComponent(error) });
              return;
            }

            const accessToken = url.searchParams.get("accessToken");
            const refreshToken = url.searchParams.get("refreshToken");
            const userId = url.searchParams.get("userId");
            const nickname = url.searchParams.get("nickname");
            const loginType = url.searchParams.get("loginType");

            if (accessToken && refreshToken && userId && nickname && loginType) {
              console.log("[등교왕] iOS 로그인 성공:", nickname);
              localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
              localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
              setState({
                user: { userId: Number(userId), nickname: decodeURIComponent(nickname), loginType: loginType as "KAKAO" | "TOSS" },
                loading: false,
                error: null,
              });

              // InAppBrowser 닫기
              try {
                const { Browser } = await import("@capacitor/browser");
                await Browser.close();
              } catch { /* 이미 닫혔을 수 있음 */ }
            }
          }
        } catch (e) {
          console.error("[등교왕] 딥링크 처리 에러:", e);
        }
      });

      cleanup = () => listener.remove();
    })();

    return () => { cleanup?.(); };
  }, []);

  const loginWithKakao = useCallback(async (authorizationCode: string) => {
    console.log("[등교왕] loginWithKakao 호출");
    const data = await api<AuthResponse>("/auth/login/kakao", {
      method: "POST",
      body: JSON.stringify({ authorizationCode, redirectUri: KAKAO_REDIRECT_URI }),
    });
    localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
    setState({ user: data.user, loading: false, error: null });
    return data;
  }, []);

  const loginWithToss = useCallback(async (authorizationCode: string, referrer: string) => {
    console.log("[등교왕] loginWithToss 호출");
    const data = await api<AuthResponse>("/auth/login/toss", {
      method: "POST",
      body: JSON.stringify({ authorizationCode, referrer }),
    });
    localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
    setState({ user: data.user, loading: false, error: null });
    return data;
  }, []);

  const logout = useCallback(() => {
    console.log("[등교왕] 로그아웃");
    clearTokens();
    setState({ user: null, loading: false, error: null });
  }, []);

  const updateNickname = useCallback((nickname: string) => {
    setState((prev) => {
      if (!prev.user) return prev;
      return { ...prev, user: { ...prev.user, nickname } };
    });
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    authError: state.error,
    loginWithKakao,
    loginWithToss,
    logout,
    updateNickname,
  };
}
