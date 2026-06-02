import { useState, useEffect } from "react";
import TabBar from "../components/TabBar";
import { api, ApiError } from "../utils/api";
import type { TabName } from "../components/TabBar";
import type { Classroom, ClassroomMember, User } from "../types";

interface SettingsScreenProps {
  classroomId: number;
  user: User;
  onTabChange: (tab: TabName) => void;
  onLeave: () => void;
  onDelete: () => void;
}

export default function SettingsScreen({ classroomId, user, onTabChange, onLeave, onDelete }: SettingsScreenProps) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  const isOwner = classroom?.ownerId === user.userId;

  useEffect(() => {
    Promise.all([
      api<Classroom>(`/classrooms/${classroomId}`),
      api<{ members: ClassroomMember[] }>(`/classrooms/${classroomId}/members`),
    ])
      .then(([c, m]) => { setClassroom(c); setMembers(m.members); })
      .finally(() => setLoading(false));
  }, [classroomId]);

  const handleCopyCode = () => {
    if (classroom) {
      navigator.clipboard.writeText(classroom.inviteCode);
      alert("초대 코드가 복사되었습니다!");
    }
  };

  const handleKick = async (userId: number, nickname: string) => {
    if (!confirm(`${nickname}님을 강퇴하시겠습니까?`)) return;
    try {
      await api(`/classrooms/${classroomId}/members/${userId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e) { alert(e instanceof ApiError ? e.message : "강퇴 실패"); }
  };

  const handleTransfer = async (userId: number, nickname: string) => {
    if (!confirm(`${nickname}님에게 방장을 위임하시겠습니까?`)) return;
    try {
      await api(`/classrooms/${classroomId}/owner`, { method: "PUT", body: JSON.stringify({ newOwnerId: userId }) });
      setClassroom((prev) => prev ? { ...prev, ownerId: userId } : null);
    } catch (e) { alert(e instanceof ApiError ? e.message : "위임 실패"); }
  };

  const handleLeave = async () => {
    if (!confirm("이 방을 나가시겠습니까?")) return;
    try {
      await api(`/classrooms/${classroomId}/members/me`, { method: "DELETE" });
      onLeave();
    } catch (e) { alert(e instanceof ApiError ? e.message : "나가기 실패"); }
  };

  const handleDeleteRoom = async () => {
    if (!confirm("정말 이 방을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
    try {
      await api(`/classrooms/${classroomId}`, { method: "DELETE" });
      onDelete();
    } catch (e) { alert(e instanceof ApiError ? e.message : "삭제 실패"); }
  };

  if (loading || !classroom) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>불러오는 중...</span>
        </div>
        <TabBar active="settings" onSelect={onTabChange} />
      </div>
    );
  }

  const rowStyle = (first?: boolean, last?: boolean): React.CSSProperties => ({
    background: "var(--bg-card)", padding: "14px 16px",
    display: "flex", justifyContent: "space-between", fontSize: 14,
    borderRadius: first && last ? 8 : first ? "8px 8px 0 0" : last ? "0 0 8px 8px" : 0,
    borderBottom: last ? "none" : "1px solid var(--bg-primary)",
  });

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: 16, fontSize: 17, fontWeight: 600 }}>방 설정</div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 16px" }}>
        <div style={rowStyle(true)}>
          <span>초대 코드</span>
          <span onClick={handleCopyCode} style={{ color: "var(--accent-blue)", fontWeight: 600, cursor: "pointer" }}>{classroom.inviteCode} 📋</span>
        </div>
        <div onClick={() => setShowMembers(!showMembers)} style={{ ...rowStyle(false, true), cursor: "pointer" }}>
          <span>멤버 관리</span>
          <span style={{ color: "var(--text-secondary)" }}>{members.length}명 {showMembers ? "▲" : "▼"}</span>
        </div>

        {showMembers && (
          <div style={{ marginTop: 2, marginBottom: 16 }}>
            {members.map((m) => (
              <div key={m.userId} style={{ background: "var(--bg-card)", padding: "10px 16px", display: "flex", alignItems: "center", fontSize: 13, borderBottom: "1px solid var(--bg-primary)" }}>
                <span>{m.nickname} {m.isOwner && "👑"}</span>
                {isOwner && !m.isOwner && (
                  <span style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                    <span onClick={() => handleTransfer(m.userId, m.nickname)} style={{ color: "var(--accent-orange)", cursor: "pointer" }}>위임</span>
                    <span onClick={() => handleKick(m.userId, m.nickname)} style={{ color: "var(--accent-danger)", cursor: "pointer" }}>강퇴</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "16px 0 8px" }}>방장 설정</div>
            <div style={rowStyle(true)}>
              <span>출석 검증 방식</span>
              <span style={{ color: "var(--text-secondary)" }}>{classroom.validationType}</span>
            </div>
            <div style={rowStyle(false, true)}>
              <span>출석 가능 시간</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {classroom.checkInStartTime && classroom.checkInEndTime ? `${classroom.checkInStartTime}~${classroom.checkInEndTime}` : "24시간"}
              </span>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          {!isOwner && (
            <button onClick={handleLeave} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-secondary)", fontSize: 14 }}>방 나가기</button>
          )}
          {isOwner && (
            <button onClick={handleDeleteRoom} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--accent-danger)", background: "transparent", color: "var(--accent-danger)", fontSize: 14 }}>학급 삭제</button>
          )}
        </div>
      </div>
      <TabBar active="settings" onSelect={onTabChange} />
    </div>
  );
}
