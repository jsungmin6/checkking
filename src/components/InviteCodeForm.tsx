import { useState, useRef, useEffect } from "react";
import { api, ApiError } from "../utils/api";

interface InviteCodeFormProps {
  onJoined: (classroomId: number) => void;
  /** 초대 딥링크로 받은 코드 — 6자리가 다 차 있으면 입력을 기다리지 않고 바로 참여한다. */
  initialCode?: string;
  /** 방 개수 한도를 넘겼을 때 등 토스트로 알릴 내용 */
  onNotice?: (message: string) => void;
}

/**
 * 초대 코드 6자리 입력 + 참여.
 * 딥링크로 들어오는 전체 화면(JoinRoomScreen)과 방 찾기의 모달이 같이 쓴다.
 */
export default function InviteCodeForm({ onJoined, initialCode, onNotice }: InviteCodeFormProps) {
  const prefilled = (initialCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).split("");
  const [code, setCode] = useState(Array.from({ length: 6 }, (_, i) => prefilled[i] ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoJoinedRef = useRef(false);

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
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
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
      if (e instanceof ApiError && e.code === "MAX_ROOMS_EXCEEDED") {
        onNotice?.("방은 최대 10개까지 관리할 수 있어요.");
        return;
      }
      setError(e instanceof Error ? e.message : "참여 실패");
    } finally {
      setLoading(false);
    }
  };

  // 초대 딥링크로 들어왔고 코드가 6자리 전부 채워졌으면, 입력을 기다리지 않고 바로 참여를 시도한다.
  useEffect(() => {
    if (autoJoinedRef.current) return;
    if (!initialCode || !isComplete) return;
    autoJoinedRef.current = true;
    void handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
        {code.map((c, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            value={c}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            maxLength={1}
            aria-label={`초대 코드 ${i + 1}번째 자리`}
            style={{
              width: 40, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700,
              borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)",
              background: "var(--bg-secondary)", color: "var(--text-primary)",
            }}
          />
        ))}
      </div>
      <button
        onClick={handleJoin}
        disabled={!isComplete || loading}
        style={{
          width: "100%", padding: 16, borderRadius: "var(--radius-button)",
          background: isComplete ? "var(--accent-blue)" : "#ccc",
          color: isComplete ? "#fff" : "#888",
          fontSize: 16, fontWeight: 700, opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "참여 중..." : "참여하기"}
      </button>
    </>
  );
}
