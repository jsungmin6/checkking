import { useState, useRef, useEffect } from "react";
import BackHeader from "../components/BackHeader";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { api, ApiError } from "../utils/api";

interface JoinRoomScreenProps {
  onBack: () => void;
  onJoined: (classroomId: number) => void;
  initialCode?: string;
}

export default function JoinRoomScreen({ onBack, onJoined, initialCode }: JoinRoomScreenProps) {
  const prefilled = (initialCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).split("");
  const [code, setCode] = useState(Array.from({ length: 6 }, (_, i) => prefilled[i] ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toastMessage, showToast } = useToast();
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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      next[i] = pasted[i] ?? "";
    }
    setCode(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const inviteCode = code.join("");
  const isComplete = inviteCode.length === 6;
  const autoJoinedRef = useRef(false);

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
      if (e instanceof ApiError && e.code === "MAX_ROOMS_EXCEEDED") {
        showToast("방은 최대 3개까지 관리할 수 있어요.");
        return;
      }
      setError(e instanceof Error ? e.message : "참여 실패");
    } finally {
      setLoading(false);
    }
  };

  // 초대 딥링크로 들어왔고 코드가 6자리 전부 채워졌으면, 코드 입력을 기다리지 않고 바로 참여를 시도한다.
  useEffect(() => {
    if (autoJoinedRef.current) return;
    if (!initialCode || !isComplete) return;
    autoJoinedRef.current = true;
    void handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page animate-fade-in" style={{ alignItems: "center", justifyContent: "center" }}>
      <BackHeader title="" onBack={onBack} />
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>방 참여하기</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>초대 코드를 입력하세요</div>
        {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {code.map((c, i) => (
            <input key={i} ref={(el) => { inputRefs.current[i] = el; }} value={c} onChange={(e) => handleInput(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste} maxLength={1} style={{ width: 40, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700, borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)" }} />
          ))}
        </div>
        <button onClick={handleJoin} disabled={!isComplete || loading} style={{ width: "80%", padding: 16, borderRadius: "var(--radius-button)", background: isComplete ? "var(--accent-blue)" : "#ccc", color: isComplete ? "#fff" : "#888", fontSize: 16, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
          {loading ? "참여 중..." : "참여하기"}
        </button>
      </div>
      <Toast message={toastMessage} />
    </div>
  );
}
