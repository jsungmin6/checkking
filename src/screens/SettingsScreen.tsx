import { useState, useEffect } from "react";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import { api, ApiError } from "../utils/api";
import type { TabName } from "../components/TabBar";
import type { Classroom, ClassroomMember, User, ValidationType, ClassroomSettingsRequest } from "../types";

interface SettingsScreenProps {
  classroomId: number;
  user: User;
  onTabChange: (tab: TabName) => void;
  onBack: () => void;
  onLeave: () => void;
  onDelete: () => void;
}

const selectStyle: React.CSSProperties = {
  padding: "10px 4px",
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 8,
  border: "1px solid var(--border-light)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  textAlign: "center",
  textAlignLast: "center",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(":") : ["", ""];
  const update = (newH: string, newM: string) => {
    if (newH && newM) onChange(`${newH}:${newM}`);
    else if (newH) onChange(`${newH}:00`);
    else onChange("");
  };
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <select value={h} onChange={(e) => update(e.target.value, m || "00")} style={{ ...selectStyle, width: 55 }}>
        <option value="">시</option>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <span style={{ color: "var(--text-secondary)", fontSize: 16 }}>:</span>
      <select value={m} onChange={(e) => update(h || "00", e.target.value)} style={{ ...selectStyle, width: 55 }}>
        <option value="">분</option>
        {["00", "10", "20", "30", "40", "50"].map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsScreen({ classroomId, user, onTabChange, onBack, onLeave, onDelete }: SettingsScreenProps) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // 편집 상태
  const [editingSettings, setEditingSettings] = useState(false);
  const [editValidationType, setEditValidationType] = useState<ValidationType>("NONE");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editIncludeWeekends, setEditIncludeWeekends] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOwner = classroom?.ownerId === user.userId;

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    Promise.all([
      api<Classroom>(`/classrooms/${classroomId}`),
      api<{ members: ClassroomMember[] }>(`/classrooms/${classroomId}/members`),
    ])
      .then(([c, m]) => { setClassroom(c); setMembers(m.members); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [classroomId]);

  const startEditing = () => {
    if (!classroom) return;
    setEditValidationType(classroom.validationType);
    setEditStartTime(classroom.checkInStartTime ?? "");
    setEditEndTime(classroom.checkInEndTime ?? "");
    setEditIncludeWeekends(classroom.includeWeekends);
    setEditingSettings(true);
  };

  const handleSaveSettings = async () => {
    if (!classroom) return;
    const timeInvalid = editStartTime && editEndTime && editStartTime >= editEndTime;
    if (timeInvalid) { alert("종료 시간이 시작 시간보다 빠릅니다"); return; }

    setSaving(true);
    try {
      const settings: ClassroomSettingsRequest = {
        validationType: editValidationType,
        gpsConfig: classroom.gpsConfig,
        wifiConfig: classroom.wifiConfig,
        checkInStartTime: editStartTime || null,
        checkInEndTime: editEndTime || null,
        includeWeekends: editIncludeWeekends,
      };
      await api(`/classrooms/${classroomId}/settings`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setClassroom({
        ...classroom,
        validationType: editValidationType,
        checkInStartTime: editStartTime || null,
        checkInEndTime: editEndTime || null,
        includeWeekends: editIncludeWeekends,
      });
      setEditingSettings(false);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>불러오는 중...</span>
        </div>
        <TabBar active="settings" onSelect={onTabChange} />
      </div>
    );
  }

  if (fetchError || !classroom) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>설정을 불러올 수 없습니다</span>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 20px", borderRadius: "var(--radius-card)", background: "var(--accent-blue)", color: "#fff", fontSize: 13 }}>다시 시도</button>
        </div>
        <TabBar active="settings" onSelect={onTabChange} />
      </div>
    );
  }

  const rowStyle = (first?: boolean, last?: boolean): React.CSSProperties => ({
    background: "var(--bg-card)", padding: "14px 16px",
    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14,
    borderRadius: first && last ? "var(--radius-card)" : first ? "var(--radius-card) var(--radius-card) 0 0" : last ? "0 0 var(--radius-card) var(--radius-card)" : 0,
    borderBottom: last ? "none" : "1px solid var(--border-light)",
    boxShadow: "var(--shadow-card)",
  });

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BackHeader title="방 설정" onBack={onBack} />
      <div style={{ flex: 1, overflow: "auto", padding: "8px 16px 0" }}>
        <div style={rowStyle(true)}>
          <span>초대 코드</span>
          <span onClick={handleCopyCode} style={{ color: "var(--accent-blue)", fontWeight: 600, cursor: "pointer" }}>{classroom.inviteCode} 📋</span>
        </div>
        <div onClick={() => setShowMembers(!showMembers)} style={{ ...rowStyle(false, !showMembers), cursor: "pointer" }}>
          <span>멤버 관리</span>
          <span style={{ color: "var(--text-secondary)" }}>{members.length}명 {showMembers ? "▲" : "▼"}</span>
        </div>

        {showMembers && (
          <div style={{ background: "var(--bg-card)", borderRadius: "0 0 var(--radius-card) var(--radius-card)", overflow: "hidden", boxShadow: "var(--shadow-card)", marginBottom: 16 }}>
            {members.map((m, i) => (
              <div key={m.userId} style={{ padding: "12px 16px", display: "flex", alignItems: "center", fontSize: 14, borderBottom: i < members.length - 1 ? "1px solid var(--border-light)" : "none" }}>
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
            <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "16px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>방장 설정</span>
              {!editingSettings && (
                <span onClick={startEditing} style={{ color: "var(--accent-blue)", cursor: "pointer", fontSize: 12 }}>수정</span>
              )}
            </div>

            {!editingSettings ? (
              <>
                <div style={rowStyle(true)}>
                  <span>출석 검증 방식</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {classroom.validationType === "NONE" ? "검증 없음" : classroom.validationType === "GPS" ? "GPS" : classroom.validationType}
                  </span>
                </div>
                <div style={rowStyle()}>
                  <span>출석 가능 시간</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {classroom.checkInStartTime && classroom.checkInEndTime ? `${classroom.checkInStartTime}~${classroom.checkInEndTime}` : "24시간"}
                  </span>
                </div>
                <div style={rowStyle(false, true)}>
                  <span>주말 출석 허용</span>
                  <span style={{ color: classroom.includeWeekends ? "var(--accent-blue)" : "var(--text-secondary)" }}>
                    {classroom.includeWeekends ? "허용" : "제외"}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card)", padding: 16, boxShadow: "var(--shadow-card)" }}>
                <div style={{ fontSize: 13, marginBottom: 12 }}>출석 검증 방식</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {(["NONE", "GPS"] as ValidationType[]).map((t) => (
                    <button key={t} onClick={() => setEditValidationType(t)} style={{
                      flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: editValidationType === t ? "var(--accent-blue)" : "transparent",
                      color: editValidationType === t ? "#fff" : "var(--text-secondary)",
                      border: editValidationType === t ? "none" : "1px solid var(--border-light)",
                    }}>
                      {t === "NONE" ? "검증 없음" : "GPS"}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 13, marginBottom: 8 }}>출석 가능 시간</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <TimeSelect value={editStartTime} onChange={setEditStartTime} />
                  <span style={{ color: "var(--text-secondary)" }}>~</span>
                  <TimeSelect value={editEndTime} onChange={setEditEndTime} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>비워두면 24시간 출석 가능</div>

                <div style={{ fontSize: 13, marginBottom: 8 }}>주말 출석 허용</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button onClick={() => setEditIncludeWeekends(true)} style={{
                    flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: editIncludeWeekends ? "var(--accent-blue)" : "transparent",
                    color: editIncludeWeekends ? "#fff" : "var(--text-secondary)",
                    border: editIncludeWeekends ? "none" : "1px solid var(--border-light)",
                  }}>
                    허용
                  </button>
                  <button onClick={() => setEditIncludeWeekends(false)} style={{
                    flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: !editIncludeWeekends ? "var(--accent-blue)" : "transparent",
                    color: !editIncludeWeekends ? "#fff" : "var(--text-secondary)",
                    border: !editIncludeWeekends ? "none" : "1px solid var(--border-light)",
                  }}>
                    제외
                  </button>
                </div>

                {editStartTime && editEndTime && editStartTime >= editEndTime && (
                  <div style={{ color: "var(--accent-red)", fontSize: 12, marginBottom: 12 }}>종료 시간이 시작 시간보다 빠릅니다</div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSaveSettings} disabled={saving} style={{
                    flex: 1, padding: 10, borderRadius: 8, background: "var(--accent-blue)", color: "#fff", fontSize: 13, fontWeight: 600,
                    opacity: saving ? 0.5 : 1,
                  }}>
                    {saving ? "저장 중..." : "저장"}
                  </button>
                  <button onClick={() => setEditingSettings(false)} style={{
                    flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-secondary)", fontSize: 13,
                  }}>
                    취소
                  </button>
                </div>
              </div>
            )}

          </>
        )}

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          {!isOwner && (
            <button onClick={handleLeave} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-secondary)", fontSize: 14 }}>방 나가기</button>
          )}
          {isOwner && (
            <button onClick={handleDeleteRoom} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--accent-danger)", background: "transparent", color: "var(--accent-danger)", fontSize: 14 }}>방 삭제</button>
          )}
        </div>
      </div>
      <TabBar active="settings" onSelect={onTabChange} />
    </div>
  );
}
