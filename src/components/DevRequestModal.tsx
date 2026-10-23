import { useState } from "react";
import { api, ApiError } from "../utils/api";

interface DevRequestModalProps {
  onClose: () => void;
}

export default function DevRequestModal({ onClose }: DevRequestModalProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api("/notifications/feedback", {
        method: "POST",
        body: JSON.stringify({ content: content.trim() }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "전송에 실패했어요. 잠시 후 다시 시도해주세요");
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
        {sent ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>잘 전달됐어요</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
              검토해서 반영할 수 있도록 노력할게요. 감사합니다 🙏
            </div>
            <button onClick={onClose} style={{
              width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
            }}>
              확인
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>개발 요구하기</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
              만들어줬으면 하는 기능이나 바꿨으면 하는 점을 적어주세요.
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여기에 적어주세요"
              maxLength={1000}
              rows={5}
              style={{
                width: "100%", padding: 12, borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)",
                background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, resize: "none",
                boxSizing: "border-box", marginBottom: 8,
              }}
            />
            {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
                {sending ? "보내는 중..." : "보내기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
