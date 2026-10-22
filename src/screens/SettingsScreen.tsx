import { useState, useEffect, useRef } from "react";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import UserActionSheet from "../components/UserActionSheet";
import { hideAdBanner } from "../utils/admob";
import { api, ApiError } from "../utils/api";
import { shareRoomInvite } from "../utils/invite";
import type { TabName } from "../components/TabBar";
import type { Classroom, ClassroomMember, User, ValidationType, ClassroomSettingsRequest, GpsConfig } from "../types";

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
  const [actionTarget, setActionTarget] = useState<{ userId: number; nickname: string } | null>(null);

  // 편집 상태
  const [editingSettings, setEditingSettings] = useState(false);
  const [editValidationType, setEditValidationType] = useState<ValidationType>("NONE");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editIncludeWeekends, setEditIncludeWeekends] = useState(true);
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // GPS 편집 상태
  const [editGpsConfig, setEditGpsConfig] = useState<GpsConfig | null>(null);
  const [editRadiusMeters, setEditRadiusMeters] = useState("100");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [addressText, setAddressText] = useState("");
  const [showPostcode, setShowPostcode] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);

  const isOwner = classroom?.ownerId === user.userId;

  useEffect(() => {
    hideAdBanner();
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
    setEditIsPublic(classroom.isPublic);
    setEditGpsConfig(classroom.gpsConfig ?? null);
    setEditRadiusMeters(String(classroom.gpsConfig?.radiusMeters ?? 100));
    setAddressText(classroom.gpsConfig ? `위도 ${classroom.gpsConfig.latitude.toFixed(4)}, 경도 ${classroom.gpsConfig.longitude.toFixed(4)}` : "");
    setGpsError(null);
    setEditingSettings(true);
  };

  const handleCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      setEditGpsConfig({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, radiusMeters: Number.parseInt(editRadiusMeters, 10) || 100 });
      setAddressText(`현재 위치 (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
    } catch {
      setGpsError("위치를 가져올 수 없습니다");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAddressSearch = () => {
    if (!(window as any).daum) { setGpsError("주소 검색을 로드할 수 없습니다"); return; }
    setShowPostcode(true);
    setTimeout(() => {
      if (!postcodeRef.current) return;
      new (window as any).daum.Postcode({
        oncomplete: async (data: any) => {
          const addr = data.roadAddress || data.jibunAddress || data.address;
          setShowPostcode(false);
          setAddressText(addr);
          setGpsLoading(true);
          // geocode는 CreateRoomScreen과 동일 로직
          try {
            const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addr)}`, {
              headers: { Authorization: `KakaoAK 7149559f898939399037a8ffc2b64d17` },
            });
            const json = await res.json();
            if (json.documents?.length > 0) {
              const { y, x } = json.documents[0];
              setEditGpsConfig({ latitude: parseFloat(y), longitude: parseFloat(x), radiusMeters: Number.parseInt(editRadiusMeters, 10) || 100 });
            } else {
              setGpsError("좌표를 찾을 수 없습니다");
            }
          } catch { setGpsError("주소 변환 실패"); }
          setGpsLoading(false);
        },
        width: "100%", height: "100%",
      }).embed(postcodeRef.current);
    }, 100);
  };

  const handleSaveSettings = async () => {
    if (!classroom) return;
    const timeInvalid = editStartTime && editEndTime && editStartTime >= editEndTime;
    if (timeInvalid) { alert("종료 시간이 시작 시간보다 빠릅니다"); return; }
    const parsedRadiusMeters = Number.parseInt(editRadiusMeters, 10);
    if ((editValidationType === "GPS" || editValidationType === "GPS_AND_WIFI") &&
      (!Number.isInteger(parsedRadiusMeters) || parsedRadiusMeters < 10 || parsedRadiusMeters > 1000)) {
      alert("허용 반경은 10~1000m로 입력해 주세요.");
      return;
    }
    const nextGpsConfig = editValidationType === "GPS" || editValidationType === "GPS_AND_WIFI"
      ? editGpsConfig ? { ...editGpsConfig, radiusMeters: parsedRadiusMeters } : null
      : null;

    setSaving(true);
    try {
      const settings: ClassroomSettingsRequest = {
        validationType: editValidationType,
        gpsConfig: nextGpsConfig,
        wifiConfig: classroom.wifiConfig,
        checkInStartTime: editStartTime || null,
        checkInEndTime: editEndTime || null,
        includeWeekends: editIncludeWeekends,
      };
      await api(`/classrooms/${classroomId}/settings`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (editIsPublic !== classroom.isPublic) {
        await api(`/classrooms/${classroomId}/visibility`, {
          method: "PUT",
          body: JSON.stringify({ isPublic: editIsPublic }),
        });
      }
      setClassroom({
        ...classroom,
        validationType: editValidationType,
        gpsConfig: nextGpsConfig,
        checkInStartTime: editStartTime || null,
        checkInEndTime: editEndTime || null,
        includeWeekends: editIncludeWeekends,
        isPublic: editIsPublic,
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

  const handleInvite = async () => {
    if (!classroom) return;
    const result = await shareRoomInvite(classroom.name, classroom.inviteCode);
    if (result === "copied") alert("초대 메시지가 클립보드에 복사되었습니다!");
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
        <div onClick={handleInvite} style={{ ...rowStyle(false, false), cursor: "pointer" }}>
          <span>친구 초대하기</span>
          <span style={{ color: "var(--text-secondary)" }}>공유 ›</span>
        </div>
        <div onClick={() => setShowMembers(!showMembers)} style={{ ...rowStyle(false, !showMembers), cursor: "pointer" }}>
          <span>멤버 관리</span>
          <span style={{ color: "var(--text-secondary)" }}>{members.length}명 {showMembers ? "▲" : "▼"}</span>
        </div>

        {showMembers && (
          <div style={{ background: "var(--bg-card)", borderRadius: "0 0 var(--radius-card) var(--radius-card)", overflow: "hidden", boxShadow: "var(--shadow-card)", marginBottom: 16 }}>
            {members.map((m, i) => (
              <div key={m.userId} style={{ padding: "12px 16px", display: "flex", alignItems: "center", fontSize: 14, borderBottom: i < members.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                <span onClick={() => m.userId !== user.userId && setActionTarget({ userId: m.userId, nickname: m.nickname })} style={{ cursor: m.userId !== user.userId ? "pointer" : "default" }}>
                  {m.nickname}{m.isOwner && <span style={{ color: "var(--text-secondary)", fontSize: 12, marginLeft: 6 }}>(방장)</span>}
                </span>
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

        <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "16px 0 8px" }}>
          <span>방 설정</span>
        </div>

        <div style={rowStyle(true)}>
          <span>방 공개 범위</span>
          <span style={{ color: "var(--text-secondary)" }}>{classroom.isPublic ? "공개방" : "비밀방"}</span>
        </div>
        <div style={rowStyle()}>
          <span>출석 검증 방식</span>
          <span style={{ color: "var(--text-secondary)" }}>
            {classroom.validationType === "NONE" ? "검증 없음" : classroom.validationType === "GPS" ? "GPS" : classroom.validationType}
          </span>
        </div>
        {classroom.gpsConfig && (
          <div style={rowStyle()}>
            <span>GPS 반경</span>
            <span style={{ color: "var(--text-secondary)" }}>{classroom.gpsConfig.radiusMeters}m</span>
          </div>
        )}
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

        {editingSettings && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
          <div style={{ width: "100%", maxWidth: 360, maxHeight: "85vh", overflowY: "auto", background: "var(--bg-card)", borderRadius: 20, padding: "22px 20px" }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>방 설정 수정</div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>방 공개 범위</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {([{ value: false, label: "비밀방" }, { value: true, label: "공개방" }] as const).map((option) => (
                <button key={option.label} onClick={() => setEditIsPublic(option.value)} style={{
                  flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: editIsPublic === option.value ? "var(--accent-blue)" : "transparent",
                  color: editIsPublic === option.value ? "#fff" : "var(--text-secondary)",
                  border: editIsPublic === option.value ? "none" : "1px solid var(--border-light)",
                }}>{option.label}</button>
              ))}
            </div>
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

            {(editValidationType === "GPS" || editValidationType === "GPS_AND_WIFI") && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>GPS 위치 설정</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button onClick={handleAddressSearch} disabled={gpsLoading} style={{
                    flex: 1, padding: 10, borderRadius: 8, background: "var(--accent-blue)", color: "#fff", fontSize: 13, fontWeight: 600,
                    opacity: gpsLoading ? 0.5 : 1,
                  }}>주소 검색</button>
                  <button onClick={handleCurrentLocation} disabled={gpsLoading} style={{
                    flex: 1, padding: 10, borderRadius: 8, background: "var(--accent-green)", color: "#fff", fontSize: 13, fontWeight: 600,
                    opacity: gpsLoading ? 0.5 : 1,
                  }}>{gpsLoading ? "확인 중..." : "현재 위치로 설정"}</button>
                </div>

                {showPostcode && (
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <div ref={postcodeRef} style={{ height: 400, border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden" }} />
                    <button onClick={() => setShowPostcode(false)} style={{
                      position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 16, border: "none", cursor: "pointer",
                    }}>X</button>
                  </div>
                )}

                {gpsError && <div style={{ color: "var(--accent-red)", fontSize: 12, marginBottom: 8 }}>{gpsError}</div>}
                {addressText && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{addressText}</div>}

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>허용 반경</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editRadiusMeters}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setEditRadiusMeters(value);
                      const parsed = Number.parseInt(value, 10);
                      if (editGpsConfig && Number.isInteger(parsed)) setEditGpsConfig({ ...editGpsConfig, radiusMeters: parsed });
                    }}
                    onBlur={() => {
                      const parsed = Number.parseInt(editRadiusMeters, 10);
                      if (Number.isInteger(parsed)) setEditRadiusMeters(String(parsed));
                    }}
                    min={10}
                    max={1000}
                    style={{ width: 70, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, textAlign: "center" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>m</span>
                </div>
              </div>
            )}

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

            <button onClick={handleSaveSettings} disabled={saving} style={{
              width: "100%", padding: 15, marginTop: 24, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
              boxShadow: "0 4px 12px rgba(49, 130, 246, 0.25)", opacity: saving ? 0.5 : 1,
            }}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <button onClick={() => setEditingSettings(false)} style={{
              width: "100%", padding: 12, marginTop: 6, borderRadius: "var(--radius-button)", border: "none",
              background: "transparent", color: "var(--text-secondary)", fontSize: 14,
            }}>
              취소
            </button>
          </div>
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          {!isOwner && (
            <button onClick={handleLeave} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-secondary)", fontSize: 14 }}>방 나가기</button>
          )}
          {isOwner && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={startEditing} style={{
                flex: 1, padding: 12, borderRadius: 8, border: "none",
                background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 600,
              }}>수정</button>
              <button onClick={handleDeleteRoom} style={{
                flex: 1, padding: 12, borderRadius: 8, border: "1px solid var(--accent-danger)",
                background: "transparent", color: "var(--accent-danger)", fontSize: 14,
              }}>방 삭제</button>
            </div>
          )}
        </div>
      </div>
      {actionTarget && (
        <UserActionSheet
          userId={actionTarget.userId}
          nickname={actionTarget.nickname}
          onClose={() => setActionTarget(null)}
        />
      )}
      <TabBar active="settings" onSelect={onTabChange} />
    </div>
  );
}
