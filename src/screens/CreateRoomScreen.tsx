import { useState } from "react";
import BackHeader from "../components/BackHeader";
import { api } from "../utils/api";
import type { Classroom, ValidationType, ClassroomSettingsRequest } from "../types";

interface CreateRoomScreenProps {
  onBack: () => void;
  onCreated: (classroomId: number) => void;
}

type Step = 1 | 2 | 3;

const VALIDATION_OPTIONS: { type: ValidationType; icon: string; label: string; desc: string }[] = [
  { type: "NONE", icon: "🆓", label: "검증 없음", desc: "누구나 어디서든 출석" },
  { type: "GPS", icon: "📍", label: "GPS 위치 확인", desc: "지정 위치 반경 내에서만" },
  { type: "WIFI", icon: "📶", label: "Wi-Fi 확인", desc: "지정 Wi-Fi에 연결되어야" },
  { type: "GPS_AND_WIFI", icon: "📍+📶", label: "GPS + Wi-Fi", desc: "둘 다 만족해야 출석" },
];

export default function CreateRoomScreen({ onBack, onCreated }: CreateRoomScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [validationType, setValidationType] = useState<ValidationType>("NONE");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const classroom = await api<Classroom>("/classrooms", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (validationType !== "NONE" || startTime) {
        const settings: ClassroomSettingsRequest = {
          validationType,
          gpsConfig: null,
          wifiConfig: null,
          checkInStartTime: startTime || null,
          checkInEndTime: endTime || null,
        };
        await api(`/classrooms/${classroom.classroomId}/settings`, {
          method: "PUT",
          body: JSON.stringify(settings),
        });
      }
      onCreated(classroom.classroomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-fade-in">
      <BackHeader title="방 만들기" onBack={onBack} />
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 16 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ width: s === step ? 24 : 8, height: 8, borderRadius: 4, background: s === step ? "var(--accent-blue)" : "var(--border-light)", transition: "width 0.2s" }} />
        ))}
      </div>
      {error && <div style={{ padding: "0 16px", color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}

      {step === 1 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 1. 기본 정보</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>방 이름을 입력하세요</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 1학년 3반, 코딩 동아리" style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border-light)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 15, textAlign: "center" }} />
          <button onClick={() => name.trim() && setStep(2)} disabled={!name.trim()} style={{ width: "100%", padding: 14, borderRadius: 10, background: name.trim() ? "var(--accent-blue)" : "var(--border-light)", color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 24 }}>다음</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ textAlign: "center", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 2. 출석 검증 방식</div>
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>어떻게 출석을 확인할까요?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {VALIDATION_OPTIONS.map((opt) => (
              <div key={opt.type} onClick={() => setValidationType(opt.type)} style={{
                background: "var(--bg-card)", borderRadius: 12, padding: 16, textAlign: "center", cursor: "pointer",
                border: validationType === opt.type ? "2px solid var(--accent-blue)" : "1px solid var(--border-light)",
              }}>
                <div style={{ fontSize: 24 }}>{opt.icon}</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{opt.label}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>{opt.desc}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setStep(3)} style={{ width: "100%", padding: 14, borderRadius: 10, background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 16 }}>다음</button>
        </div>
      )}

      {step === 3 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 3. 출석 시간 (선택)</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>비워두면 24시간 출석 가능</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>시작</div>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: 100, padding: 10, textAlign: "center", fontSize: 16, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
            </div>
            <div style={{ fontSize: 20, color: "var(--text-secondary)", marginTop: 16 }}>~</div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>종료</div>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: 100, padding: 10, textAlign: "center", fontSize: 16, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 10, background: "var(--accent-green)", color: "#fff", fontSize: 15, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            {loading ? "생성 중..." : "방 생성 완료!"}
          </button>
          <div onClick={handleCreate} style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12, cursor: "pointer" }}>건너뛰기 (나중에 설정)</div>
        </div>
      )}
    </div>
  );
}
