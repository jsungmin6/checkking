import { useState } from "react";
import BackHeader from "../components/BackHeader";
import { api } from "../utils/api";
import type { User } from "../types";

interface ProfileScreenProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onNicknameUpdate: (nickname: string) => void;
}

export default function ProfileScreen({ user, onBack, onLogout, onNicknameUpdate }: ProfileScreenProps) {
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
    <div className="page animate-fade-in">
      <BackHeader title="내 계정" onBack={onBack} />
      <div style={{ padding: 16, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-blue)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto" }}>{user.nickname.charAt(0)}</div>
        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 10 }}>{user.nickname}</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{loginTypeLabel} 로그인</div>
      </div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>프로필</div>
        <div style={{ background: "var(--bg-card)", borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
            <span>닉네임</span>
            {editing ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ width: 120, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14 }} />
                <span onClick={handleSaveNickname} style={{ color: "var(--accent-blue)", cursor: "pointer", fontSize: 13, opacity: saving ? 0.5 : 1 }}>{saving ? "..." : "저장"}</span>
                <span onClick={() => { setEditing(false); setNickname(user.nickname); setError(null); }} style={{ color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>취소</span>
              </div>
            ) : (
              <span onClick={() => setEditing(true)} style={{ color: "var(--accent-blue)", cursor: "pointer" }}>{user.nickname} ✏️</span>
            )}
          </div>
          <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", fontSize: 14, borderTop: "1px solid var(--border-light)" }}>
            <span>로그인 방식</span>
            <span style={{ color: "var(--text-secondary)" }}>{loginTypeLabel}</span>
          </div>
        </div>
        {error && <div style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>
      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        <button onClick={onLogout} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-secondary)", fontSize: 14 }}>로그아웃</button>
        <button onClick={handleDeleteAccount} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--accent-danger)", background: "transparent", color: "var(--accent-danger)", fontSize: 14 }}>회원 탈퇴</button>
      </div>
    </div>
  );
}
