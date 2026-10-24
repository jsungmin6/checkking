import { useState } from "react";
import { api, ApiError } from "../utils/api";
import type { RoomGreeting } from "../types";

interface PostGreetingModalProps {
  classroomId: number;
  onClose: () => void;
  onPosted: (greeting: RoomGreeting) => void;
}

const QUICK_EMOJIS = ["👋", "🔥", "😊", "💪", "☀️", "🙌", "✅", "😴"];

export default function PostGreetingModal({ classroomId, onClose, onPosted }: PostGreetingModalProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      const greeting = await api<RoomGreeting>(`/classrooms/${classroomId}/greetings`, {
        method: "POST",
        body: JSON.stringify({ content: content.trim() }),
      });
      onPosted(greeting);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "전송에 실패했어요");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 360, background: "var(--bg-card)", borderRadius: 20, padding: "22px 20px",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>오늘의 출석 인사</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          하루에 한 번, 짧게 한마디 남겨보세요.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setContent(emoji)}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                border: content === emoji ? "2px solid var(--accent-blue)" : "1px solid var(--border-light)",
                background: "var(--bg-secondary)", fontSize: 26, lineHeight: 1, display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, padding: 0,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="오늘도 화이팅!"
          maxLength={200}
          rows={4}
          autoFocus
          style={{
            width: "100%", padding: 12, borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)",
            background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, resize: "none",
            boxSizing: "border-box", marginBottom: 4,
          }}
        />
        <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{content.length}/200</div>
        {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 13, borderRadius: "var(--radius-button)", border: "1px solid var(--border-color)",
            background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
          }}>
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || sending}
            style={{
              flex: 2, padding: 13, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
              opacity: !content.trim() || sending ? 0.5 : 1,
            }}
          >
            {sending ? "남기는 중..." : "남기기"}
          </button>
        </div>
      </div>
    </div>
  );
}
