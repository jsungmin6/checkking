import { useEffect, useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import TermsViewer from "../components/TermsViewer";
import { api } from "../utils/api";
import { validateNickname } from "../utils/profanity";
import { hasAgreedToPushConsent, requestPushConsent } from "../utils/pushConsent";
import type { User } from "../types";
import { markMissionDone } from "../hooks/useMissions";
import { avatarEmojiSrc } from "../utils/emoji";
import AvatarChangeModal from "../components/AvatarChangeModal";
import { useAttendancePoints } from "../hooks/useAttendancePoints";

interface ProfileScreenProps {
  user: User;
  onNavigateHome: () => void;
  onNavigatePublicRooms: () => void;
  onNavigateLab: () => void;
  onLogout: () => void;
  onNicknameUpdate: (nickname: string) => void;
  onAvatarUpdate: (avatarIndex: number) => void;
}

export default function ProfileScreen({ user, onNavigateHome, onNavigatePublicRooms, onNavigateLab, onLogout, onNicknameUpdate, onAvatarUpdate }: ProfileScreenProps) {
  const [changingAvatar, setChangingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewingTerms, setViewingTerms] = useState<{ url: string; title: string } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [nickname, setNickname] = useState(user.nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushAgreed, setPushAgreed] = useState(hasAgreedToPushConsent());
  const [pushRequesting, setPushRequesting] = useState(false);
  const [appBestStreak, setAppBestStreak] = useState<number | null>(null);
  const [cloverSummary, setCloverSummary] = useState<{ personalBestMs: number | null; myRank: number | null } | null>(null);
  const { totalPoints } = useAttendancePoints();

  useEffect(() => {
    let cancelled = false;
    void api<{ appBestStreak?: number }>("/classrooms/my")
      .then((overview) => { if (!cancelled) setAppBestStreak(overview.appBestStreak ?? 0); })
      .catch(() => {});
    void api<{ personalBestMs: number | null; myRank: number | null }>("/labs/clover")
      .then((overview) => { if (!cancelled) setCloverSummary(overview); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleTogglePushConsent = async () => {
    setPushRequesting(true);
    try {
      const result = await requestPushConsent("SETTINGS");
      if (result === "newAgreement" || result === "alreadyAgreed") {
        setPushAgreed(true);
      } else if (result === "unsupported") {
        alert("토스 앱에서만 설정할 수 있어요. 앱을 최신 버전으로 업데이트해주세요.");
      }
    } finally {
      setPushRequesting(false);
    }
  };

  const handleSaveNickname = async () => {
    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api<{ userId: number; nickname: string }>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ nickname }),
      });
      // 저장만 눌러도 완료되면 미션이 아니다 — 쓰던 이름과 달라졌을 때만 쳐준다.
      if (nickname !== user.nickname) markMissionDone("nickname");
      onNicknameUpdate(nickname);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
    try {
      await api("/users/me", { method: "DELETE" });
      onLogout();
    } catch (e) {
      alert(e instanceof Error ? e.message : "탈퇴 실패");
    }
  };

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      {viewingTerms && <TermsViewer url={viewingTerms.url} title={viewingTerms.title} onClose={() => setViewingTerms(null)} />}
      {changingAvatar && (
        <AvatarChangeModal
          userId={user.userId}
          currentIndex={user.avatarIndex ?? user.userId}
          onClose={() => setChangingAvatar(false)}
          onChanged={onAvatarUpdate}
        />
      )}
      <div style={{ padding: "20px 20px 12px" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>내 정보</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
        <div style={{ padding: "24px 16px 0" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>프로필</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <button
              onClick={() => setChangingAvatar(true)}
              aria-label="프로필 캐릭터 바꾸기"
              style={{
                width: 76, height: 76, borderRadius: "50%", background: "var(--bg-card)",
                boxShadow: "var(--shadow-card)", overflow: "hidden", padding: 6, boxSizing: "border-box",
                display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer",
              }}
            >
              <img src={avatarEmojiSrc(user.userId, user.avatarIndex)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </button>
            <div style={{ flex: 1, minWidth: 0, background: "var(--bg-card)", borderRadius: "var(--radius-card)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
              <div style={{ padding: "16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 15 }}>
                <span>닉네임</span>
                {editing ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ width: 80, minWidth: 0, padding: "8px 6px", borderRadius: "var(--radius-input)", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14 }} />
                    <span onClick={handleSaveNickname} style={{ color: "var(--accent-blue)", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: saving ? 0.5 : 1 }}>{saving ? "..." : "저장"}</span>
                    <span onClick={() => { setEditing(false); setNickname(user.nickname); setError(null); }} style={{ color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>취소</span>
                  </div>
                ) : (
                  <span onClick={() => setEditing(true)} style={{ color: "var(--accent-blue)", cursor: "pointer", fontWeight: 500 }}>{user.nickname} ✏️</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
            {[
              { label: "최대 연속 출석", value: appBestStreak === null ? "-" : `${appBestStreak}일` },
              { label: "누적 포인트", value: `${totalPoints.toLocaleString()}P` },
              { label: "클로버 기록", value: cloverSummary?.personalBestMs != null
                ? `${cloverSummary.myRank != null ? `${cloverSummary.myRank}위 · ` : ""}${(cloverSummary.personalBestMs / 1000).toFixed(2)}초`
                : "기록 없음" },
            ].map((item) => (
              <div key={item.label} style={{ minWidth: 0, padding: "12px 6px", borderRadius: 12, background: "var(--bg-card)", boxShadow: "var(--shadow-card)", textAlign: "center" }}>
                <div style={{ overflow: "hidden", color: "var(--text-primary)", fontSize: 13, fontWeight: 750, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
                <div style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 10 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginTop: 8 }}>{error}</div>}

          {!pushAgreed && (
            <>
              <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>알림</div>
              <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                <div onClick={pushRequesting ? undefined : handleTogglePushConsent} style={{
                  padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15,
                  cursor: pushRequesting ? "default" : "pointer",
                }}>
                  <span>출석 알림 받기</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{pushRequesting ? "..." : "설정하기 >"}</span>
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>계정 관리</div>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            <div onClick={() => setAccountOpen(!accountOpen)} style={{
              padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, cursor: "pointer",
            }}>
              <span>계정 관리</span>
              <span style={{ color: "var(--text-secondary)", fontSize: 13, transition: "transform 0.2s", transform: accountOpen ? "rotate(90deg)" : "none" }}>{">"}</span>
            </div>
            {accountOpen && (
              <>
                <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, borderTop: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>등급</span>
                  <span style={{ color: user.accountType === "PREMIUM" ? "var(--accent-blue)" : "var(--text-secondary)", fontWeight: 600 }}>
                    {user.accountType === "PREMIUM" ? "프리미엄" : "일반"}
                  </span>
                </div>
                <div onClick={onLogout} style={{
                  padding: "14px 20px", fontSize: 14, color: "var(--text-secondary)", cursor: "pointer", borderTop: "1px solid var(--border)",
                }}>
                  로그아웃
                </div>
                <div onClick={handleDeleteAccount} style={{
                  padding: "14px 20px", fontSize: 14, color: "var(--accent-red)", cursor: "pointer", borderTop: "1px solid var(--border)",
                }}>
                  회원 탈퇴
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: "24px 16px 0" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>약관 및 정책</div>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            {[
              { label: "서비스 이용약관", path: "/terms.html" },
              { label: "개인정보 처리방침", path: "/privacy.html" },
              { label: "위치정보 이용약관", path: "/location-terms.html" },
            ].map((item, i, arr) => (
              <div key={item.path} onClick={() => setViewingTerms({ url: item.path, title: item.label })} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 20px", fontSize: 15, color: "var(--text-primary)", cursor: "pointer",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span>{item.label}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{">"}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 32 }} />
      </div>

      {/* 배너 광고는 홈에서만 띄운다 */}
      <div style={{ flexShrink: 0 }}>
        <HomeTabBar active="profile" onSelect={(tab) => {
          if (tab === "home") onNavigateHome();
          else if (tab === "publicRooms") onNavigatePublicRooms();
          else if (tab === "lab") onNavigateLab();
        }} />
      </div>
    </div>
  );
}
