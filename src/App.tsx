import { useState, useCallback, useEffect, useRef } from "react";
import { closeView, graniteEvent } from "@apps-in-toss/web-framework";
import { useAuth } from "./hooks/useAuth";
import { isCapacitor, isIOS, isTossApp } from "./utils/platform";
import { resetDevPreview, api } from "./utils/api";
import { TOKEN_KEYS } from "./constants";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import CreateRoomScreen from "./screens/CreateRoomScreen";
import JoinRoomScreen from "./screens/JoinRoomScreen";
import RoomScreen from "./screens/RoomScreen";
import RankingScreen from "./screens/RankingScreen";
import StatsScreen from "./screens/StatsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import TermsAgreementScreen from "./screens/TermsAgreementScreen";
import PublicRoomsScreen from "./screens/PublicRoomsScreen";
import OnboardingModal from "./components/OnboardingModal";
import type { ScreenName, User } from "./types";

export default function App() {
  const { user: authUser, loading, authError, needsTermsAgreement, loginWithKakaoToken, loginWithApple, loginWithToss, acceptTerms, logout, updateNickname } = useAuth();
  // TEMP dev-only local preview bypass (no real login). Remove before shipping.
  const [devPreviewUser, setDevPreviewUser] = useState<User | null>(null);
  const user = authUser ?? devPreviewUser;
  const [screen, setScreen] = useState<ScreenName>("home");
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const attInitRef = useRef(false);
  const inviteLinkHandledRef = useRef(false);
  const entryLoggedRef = useRef(false);

  // 초대 딥링크로 들어올 때마다 "토스 전체탭에서 멈춤"/"출석왕 홈으로 옴"이 왜 매번 다른지,
  // 왜 로그인이 매번 풀리는지 확인하기 위한 진단 로그 — 로그인 여부와 무관하게 앱 진입 시 1회 전송.
  useEffect(() => {
    if (entryLoggedRef.current) return;
    entryLoggedRef.current = true;
    (async () => {
      let initialURL: string | null = null;
      try {
        if (isTossApp()) {
          const { Environment } = await import("@apps-in-toss/web-framework");
          initialURL = Environment.initialURL;
        }
      } catch { /* ignore */ }

      void api("/diagnostics/app-entry", {
        method: "POST",
        body: JSON.stringify({
          hasToken: !!localStorage.getItem(TOKEN_KEYS.ACCESS),
          isTossApp: isTossApp(),
          inviteCode: new URLSearchParams(window.location.search).get("inviteCode"),
          initialURL,
          locationSearch: window.location.search,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    })();
  }, []);

  // 공유 초대 링크(intoss://checkking/join?inviteCode=XXXXXX)로 앱이 열렸을 때 참여 화면으로 이동.
  // 파라미터 이름을 "code"로 하면 안 된다 — index.html의 카카오 리다이렉트 캡처 스크립트가
  // "code" 쿼리를 전부 카카오 인가코드로 오인해 가로채서, 초대 코드가 카카오 로그인 시도로 새버린다.
  // window.location.search 뿐 아니라, 토스 앱이 실제로 전달하는 원본 스킴 URL(Environment.initialURL)도 같이 확인한다.
  useEffect(() => {
    if (inviteLinkHandledRef.current || loading || !user || needsTermsAgreement) return;

    const fromLocation = new URLSearchParams(window.location.search).get("inviteCode");
    if (fromLocation) {
      inviteLinkHandledRef.current = true;
      setPendingInviteCode(fromLocation);
      setScreen("joinRoom");
      return;
    }

    if (!isTossApp()) return;
    (async () => {
      try {
        const { Environment } = await import("@apps-in-toss/web-framework");
        const code = new URL(Environment.initialURL).searchParams.get("inviteCode");
        if (code && !inviteLinkHandledRef.current) {
          inviteLinkHandledRef.current = true;
          setPendingInviteCode(code);
          setScreen("joinRoom");
        }
      } catch {
        // initialURL이 없거나 파싱 불가 — 무시
      }
    })();
  }, [loading, user, needsTermsAgreement]);

  // 앱인토스 네이티브 뒤로가기를 SPA 화면 이동에 연결한다.
  useEffect(() => {
    if (!isTossApp()) return;
    return graniteEvent.addEventListener("backEvent", {
      onEvent: () => {
        if (screen !== "home") setScreen("home");
        else void closeView();
      },
    });
  }, [screen]);

  // ATT → AdMob 초기화 (loading 끝나고 앱이 active 상태일 때)
  useEffect(() => {
    if (loading || attInitRef.current || !isCapacitor() || isIOS()) return;
    attInitRef.current = true;

    (async () => {
      try {
        const { AppTrackingTransparency } = await import("@capgo/capacitor-app-tracking-transparency");
        const { status } = await AppTrackingTransparency.getStatus();
        if (status === "notDetermined") {
          await new Promise((r) => setTimeout(r, 500));
          await AppTrackingTransparency.requestPermission();
        }
      } catch {}
    })();
  }, [loading]);

  const navigateTo = useCallback((s: ScreenName, roomId?: number) => {
    setScreen(s);
    if (roomId !== undefined) setActiveRoomId(roomId);
  }, []);

  const handleLogin = useCallback((_user: User) => {
    setScreen("home");
  }, []);

  const guidePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("guidePreview") === "1";

  if (guidePreview) {
    return <OnboardingModal onClose={() => window.location.assign("/")} />;
  }

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
      <LoginScreen
        onLogin={handleLogin}
        loginWithKakaoToken={loginWithKakaoToken}
        loginWithApple={loginWithApple}
        loginWithToss={loginWithToss}
        kakaoError={authError}
        onDevPreview={import.meta.env.DEV ? () => {
          localStorage.setItem("att-points-total", "1500"); // TEMP: 로컬 확인용
          resetDevPreview();
          setDevPreviewUser({ userId: -1, nickname: "민준", loginType: "KAKAO", accountType: "FREE" });
        } : undefined}
      />
    );
  }

  if (needsTermsAgreement) {
    return <TermsAgreementScreen onAgree={acceptTerms} onCancel={logout} />;
  }

  switch (screen) {
    case "home":
      return (
        <HomeScreen
          accountType={user.accountType}
          onNavigateProfile={() => navigateTo("profile")}
          onNavigateCreateRoom={() => navigateTo("createRoom")}
          onNavigateJoinRoom={() => navigateTo("joinRoom")}
          onNavigatePublicRooms={() => navigateTo("publicRooms")}
          onNavigateRoom={(id) => navigateTo("room", id)}
        />
      );
    case "profile":
      return (
        <ProfileScreen
          user={user}
          onNavigateHome={() => navigateTo("home")}
          onNavigatePublicRooms={() => navigateTo("publicRooms")}
          onLogout={() => { logout(); setScreen("home"); }}
          onNicknameUpdate={updateNickname}
        />
      );
    case "createRoom":
      return <CreateRoomScreen accountType={user.accountType} onBack={() => navigateTo("home")} onCreated={(id) => navigateTo("room", id)} />;
    case "joinRoom":
      return <JoinRoomScreen initialCode={pendingInviteCode ?? undefined} onBack={() => navigateTo("home")} onJoined={(id) => navigateTo("room", id)} />;
    case "publicRooms":
      return <PublicRoomsScreen accountType={user.accountType} onNavigateHome={() => navigateTo("home")} onNavigateProfile={() => navigateTo("profile")} onJoined={(id) => navigateTo("room", id)} />;
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
          onBack={() => navigateTo("home")}
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
          onBack={() => navigateTo("home")}
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
          onBack={() => navigateTo("home")}
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
