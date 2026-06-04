import { useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import { api } from "../utils/api";
import type { User } from "../types";

interface ProfileScreenProps {
  user: User;
  onNavigateHome: () => void;
  onLogout: () => void;
  onNicknameUpdate: (nickname: string) => void;
}

export default function ProfileScreen({ user, onNavigateHome, onLogout, onNicknameUpdate }: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user.nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveNickname = async () => {
    if (nickname.length < 2 || nickname.length > 20) {
      setError("닉네임은 2~20자여야 합니다");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api<{ userId: number; nickname: string }>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ nickname }),
      });
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

  const loginTypeLabel = user.loginType === "KAKAO" ? "카카오" : "토스";

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "20px 20px 12px", background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>내 정보</div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-blue)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto" }}>{user.nickname.charAt(0)}</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>{user.nickname}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>{loginTypeLabel} 로그인</div>
        </div>

        <div style={{ padding: "0 16px" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>프로필</div>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 }}>
              <span>닉네임</span>
              {editing ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ width: 120, padding: "8px 10px", borderRadius: "var(--radius-input)", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14 }} />
                  <span onClick={handleSaveNickname} style={{ color: "var(--accent-blue)", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: saving ? 0.5 : 1 }}>{saving ? "..." : "저장"}</span>
                  <span onClick={() => { setEditing(false); setNickname(user.nickname); setError(null); }} style={{ color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>취소</span>
                </div>
              ) : (
                <span onClick={() => setEditing(true)} style={{ color: "var(--accent-blue)", cursor: "pointer", fontWeight: 500 }}>{user.nickname} ✏️</span>
              )}
            </div>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", fontSize: 15, borderTop: "1px solid var(--border-light)" }}>
              <span>로그인 방식</span>
              <span style={{ color: "var(--text-secondary)" }}>{loginTypeLabel}</span>
            </div>
          </div>
          {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginTop: 8 }}>{error}</div>}
        </div>

        <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onLogout} style={{ width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 15 }}>로그아웃</button>
          <button onClick={handleDeleteAccount} style={{ width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "1px solid var(--accent-danger)", background: "var(--bg-card)", color: "var(--accent-danger)", fontSize: 15 }}>회원 탈퇴</button>
        </div>
      </div>

      <HomeTabBar active="profile" onSelect={(tab) => { if (tab === "home") onNavigateHome(); }} />
    </div>
  );
}
