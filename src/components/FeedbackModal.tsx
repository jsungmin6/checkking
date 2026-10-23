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

  const canSubmit = featureRequest.trim().length > 0 && rating > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      await api("/notifications/feedback", {
        method: "POST",
        body: JSON.stringify({
          content: message.trim() || undefined,
          featureRequest: featureRequest.trim(),
          rating,
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
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>의견 감사합니다</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
              보내주신 내용은 꼼꼼히 읽고 서비스에 반영하도록 하겠습니다.
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
              출석왕을 찾아주신 것만으로도 꿈만 같아요 😭 여러분 덕분에 매일매일이 설레요. 소중한 의견 하나하나가 저에게는 정말 큰 힘이 됩니다!
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

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>기대했던 기능 / 있었으면 하는 기능 <span style={{ color: "var(--accent-red)" }}>*</span></div>
            <textarea
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              placeholder="편하게 적어주세요"
              maxLength={1000}
              rows={3}
              style={{ ...inputStyle, marginBottom: 14 }}
            />

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>만족도 <span style={{ color: "var(--accent-red)" }}>*</span></div>
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

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>개발자에게 하고 싶은 말 <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(선택)</span></div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="편하게 적어주세요"
              maxLength={1000}
              rows={3}
              style={{ ...inputStyle, marginBottom: 14 }}
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
                disabled={!canSubmit || sending}
                style={{
                  flex: 2, padding: 13, borderRadius: "var(--radius-button)", border: "none",
                  background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
                  opacity: !canSubmit || sending ? 0.5 : 1,
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
