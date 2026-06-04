import { useCallback, useState, useEffect } from "react";
import { TOKEN_KEYS, KAKAO_REDIRECT_URI } from "../constants";
import { api, clearTokens } from "../utils/api";
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

    // sessionStorage에서 카카오 인가코드 확인 (웹 전용)
    const kakaoCode = sessionStorage.getItem(KAKAO_CODE_KEY);
    const kakaoTime = sessionStorage.getItem("kakao_auth_time");

    sessionStorage.removeItem(KAKAO_CODE_KEY);
    sessionStorage.removeItem("kakao_auth_time");

    const isExpired = kakaoTime && (Date.now() - Number(kakaoTime)) > 5 * 60 * 1000;

    if (kakaoCode) {
      console.log(`[등교왕] 카카오 코드 발견 (길이: ${kakaoCode.length}, 만료: ${isExpired})`);
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

  // 웹: 인가코드 기반 카카오 로그인
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

  // iOS: 카카오 네이티브 SDK access_token 기반 로그인
  const loginWithKakaoToken = useCallback(async (kakaoAccessToken: string) => {
    console.log("[등교왕] loginWithKakaoToken 호출 (iOS 네이티브)");
    const data = await api<AuthResponse>("/auth/login/kakao/token", {
      method: "POST",
      body: JSON.stringify({ accessToken: kakaoAccessToken }),
    });
    localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
    setState({ user: data.user, loading: false, error: null });
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
    loginWithKakaoToken,
    loginWithToss,
    logout,
    updateNickname,
  };
}
