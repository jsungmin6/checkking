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
    // sessionStorage에서 카카오 인가코드 확인
    const kakaoCode = sessionStorage.getItem(KAKAO_CODE_KEY);
    if (kakaoCode) {
      // removeItem은 API 호출 후에 (StrictMode 2회 실행 대응)
      api<AuthResponse>("/auth/login/kakao", {
        method: "POST",
        body: JSON.stringify({ authorizationCode: kakaoCode, redirectUri: KAKAO_REDIRECT_URI }),
      })
        .then((data) => {
          sessionStorage.removeItem(KAKAO_CODE_KEY);
          localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
          localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
          setState({ user: data.user, loading: false, error: null });
        })
        .catch((e) => {
          sessionStorage.removeItem(KAKAO_CODE_KEY);
          setState({ user: null, loading: false, error: e instanceof Error ? e.message : "카카오 로그인 실패" });
        });
      return;
    }

    // 저장된 토큰으로 세션 복원
    const token = localStorage.getItem(TOKEN_KEYS.ACCESS);
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }

    api<Profile>("/users/me")
      .then((profile) => {
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
      .catch(() => {
        clearTokens();
        setState({ user: null, loading: false, error: null });
      });
  }, []);

  const loginWithKakao = useCallback(async (authorizationCode: string) => {
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
