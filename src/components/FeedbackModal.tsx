import { useState } from "react";
import { api, ApiError } from "../utils/api";

const FEEDBACK_REWARD = 5000;

interface FeedbackModalProps {
  onClose: () => void;
  onRewarded: (amount: number) => void;
  alreadyRewarded: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: 12, borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)",
  background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, resize: "none",
  boxSizing: "border-box",
};

export default function FeedbackModal({ onClose, onRewarded, alreadyRewarded }: FeedbackModalProps) {
  const [message, setMessage] = useState("");
  const [featureRequest, setFeatureRequest] = useState("");
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api("/notifications/feedback", {
        method: "POST",
        body: JSON.stringify({
          content: message.trim(),
          featureRequest: featureRequest.trim() || undefined,
          rating: rating || undefined,
        }),
      });
      if (!alreadyRewarded) onRewarded(FEEDBACK_REWARD);
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
          width: "100%", maxWidth: 360, maxHeight: "85vh", overflowY: "auto",
          background: "var(--bg-card)", borderRadius: 20, padding: "22px 20px",
        }}
      >
        {sent ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>소중한 의견 감사해요 🙏</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
              출석왕을 사용해주셔서 진심으로 감사드려요. 보내주신 의견 하나하나 꼼꼼히 읽고 더 좋은 서비스로 보답할게요!
            </div>
            {!alreadyRewarded && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "12px 0", marginBottom: 20, borderRadius: "var(--radius-card)",
                background: "linear-gradient(135deg, var(--accent-blue), #5B9CF6)", color: "#fff",
                fontSize: 16, fontWeight: 800,
              }}>
                +{FEEDBACK_REWARD.toLocaleString()}P 적립 완료!
              </div>
            )}
            <button onClick={onClose} style={{
              width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
            }}>
              확인
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>문의하기</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
              출석왕을 사용해주셔서 진심으로 감사드려요. 열심히 하겠으니 앞으로도 많은 사용 부탁드립니다 🙏
            </div>

            {!alreadyRewarded && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", marginBottom: 16,
                borderRadius: "var(--radius-card)", background: "rgba(49, 130, 246, 0.1)",
                color: "var(--accent-blue)", fontSize: 13, fontWeight: 700,
              }}>
                🎁 문의 완료하면 +{FEEDBACK_REWARD.toLocaleString()}P 드려요!
              </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>개발자에게 하고 싶은 말</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="편하게 적어주세요"
              maxLength={1000}
              rows={3}
              style={{ ...inputStyle, marginBottom: 14 }}
            />

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>기대했던 기능 / 있었으면 하는 기능</div>
            <textarea
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              placeholder="선택 입력"
              maxLength={1000}
              rows={2}
              style={{ ...inputStyle, marginBottom: 14 }}
            />

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>만족도</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  onClick={() => setRating(n)}
                  style={{ fontSize: 28, cursor: "pointer", color: n <= rating ? "#FFC107" : "var(--border-light)" }}
                  aria-label={`${n}점`}
                >
                  ★
                </span>
              ))}
            </div>

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
                disabled={!message.trim() || sending}
                style={{
                  flex: 2, padding: 13, borderRadius: "var(--radius-button)", border: "none",
                  background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
                  opacity: !message.trim() || sending ? 0.5 : 1,
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
