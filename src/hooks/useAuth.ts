import { useCallback, useState, useEffect } from "react";
import { TOKEN_KEYS, KAKAO_REDIRECT_URI } from "../constants";
import { api, clearTokens } from "../utils/api";
import type { AuthResponse, User, Profile } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEYS.ACCESS);
    if (!token) {
      setState({ user: null, loading: false });
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
        });
      })
      .catch(() => {
        clearTokens();
        setState({ user: null, loading: false });
      });
  }, []);

  const loginWithKakao = useCallback(async (authorizationCode: string) => {
    const data = await api<AuthResponse>("/auth/login/kakao", {
      method: "POST",
      body: JSON.stringify({ authorizationCode, redirectUri: KAKAO_REDIRECT_URI }),
    });
    localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
    setState({ user: data.user, loading: false });
    return data;
  }, []);

  const loginWithToss = useCallback(async (authorizationCode: string, referrer: string) => {
    const data = await api<AuthResponse>("/auth/login/toss", {
      method: "POST",
      body: JSON.stringify({ authorizationCode, referrer }),
    });
    localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
    setState({ user: data.user, loading: false });
    return data;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setState({ user: null, loading: false });
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
    loginWithKakao,
    loginWithToss,
    logout,
    updateNickname,
  };
}
