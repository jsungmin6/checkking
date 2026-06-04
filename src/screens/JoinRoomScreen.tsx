import { useState, useRef } from "react";
import BackHeader from "../components/BackHeader";
import { api } from "../utils/api";

interface JoinRoomScreenProps {
  onBack: () => void;
  onJoined: (classroomId: number) => void;
}

export default function JoinRoomScreen({ onBack, onJoined }: JoinRoomScreenProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInput = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    if (char && !/[A-Z0-9]/.test(char)) return;
    const next = [...code];
    next[index] = char;
    setCode(next);
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const inviteCode = code.join("");
  const isComplete = inviteCode.length === 6;

  const handleJoin = async () => {
    if (!isComplete) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ classroomId: number }>("/classrooms/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      });
      onJoined(data.classroomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "참여 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-fade-in" style={{ alignItems: "center", justifyContent: "center" }}>
      <BackHeader title="" onBack={onBack} />
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>방 참여하기</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>초대 코드를 입력하세요</div>
        {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {code.map((c, i) => (
            <input key={i} ref={(el) => { inputRefs.current[i] = el; }} value={c} onChange={(e) => handleInput(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} maxLength={1} style={{ width: 40, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700, borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)" }} />
          ))}
        </div>
        <button onClick={handleJoin} disabled={!isComplete || loading} style={{ width: "80%", padding: 14, borderRadius: 10, background: isComplete ? "var(--accent-blue)" : "var(--border-light)", color: "#fff", fontSize: 15, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          {loading ? "참여 중..." : "참여하기"}
        </button>
      </div>
    </div>
  );
}
