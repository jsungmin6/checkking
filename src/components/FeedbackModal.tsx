import { useState, useRef } from "react";
import { api, ApiError } from "../utils/api";
import GiftBox from "./GiftBox";
import InlineEmoji from "./InlineEmoji";

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
  // 선물을 여는 순간 alreadyRewarded prop이 true로 바뀌어버리므로(보상 지급과 동시에 플래그가 세워짐),
  // "이 모달을 열었을 때 이미 받은 상태였는지"는 최초 값으로 고정해서 써야 한다.
  const wasAlreadyRewarded = useRef(alreadyRewarded).current;
  const [message, setMessage] = useState("");
  const [featureRequest, setFeatureRequest] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [giftOpened, setGiftOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = featureRequest.trim().length > 0;

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
        }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "전송에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setSending(false);
    }
  };

  const handleGiftOpened = () => {
    onRewarded(FEEDBACK_REWARD);
    setGiftOpened(true);
  };

  if (sent && !wasAlreadyRewarded) {
    // 출석 선물(AttendanceGiftModal)과 동일한 연출 — 선물상자 탭해서 열면 포인트 결과 화면으로 전환.
    return (
      <div className="attendance-gift-overlay">
        <section className="attendance-gift-dialog" role="dialog" aria-modal="true" aria-label="감사 선물">
          <button className="attendance-gift-close" onClick={onClose} aria-label="닫기">×</button>
          {!giftOpened ? (
            <>
              <h2 className="attendance-gift-title">의견 감사합니다</h2>
              <GiftBox onOpened={handleGiftOpened} label="감사 선물이 도착했어요" />
            </>
          ) : (
            <>
              <img className="attendance-gift-open-image" src="/rewards/gift-box-open.png" alt="포인트 동전이 나온 열린 선물 상자" />
              <h2 className="attendance-gift-title attendance-gift-result-title">와! 선물이 열렸어요!</h2>
              <div className="attendance-gift-points-list">
                <div className="attendance-gift-point-row">
                  <span>문의 선물</span>
                  <strong>+{FEEDBACK_REWARD.toLocaleString()}P</strong>
                </div>
              </div>
              <div className="attendance-gift-total-label">총 지급 포인트</div>
              <div className="attendance-gift-total">+{FEEDBACK_REWARD.toLocaleString()}P</div>
              <button className="attendance-gift-confirm" onClick={onClose}>확인</button>
            </>
          )}
        </section>
      </div>
    );
  }

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
            <button onClick={onClose} style={{
              width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
            }}>
              닫기
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>문의하기</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
              안녕하세요, 출석왕 개발자입니다 <InlineEmoji src="/emojis/redrawn/hello-tortoise.png" size={17} />
              {" "}사용해주셔서 진심으로 감사드려요. 기대를 충족시키기 위해 매일 열심히 개발하고 고민하고 있습니다.
              계속해서 열심히 할 테니 많은 이용 부탁드려요! 소중한 의견 하나하나가 저에게는 정말 큰 힘이 됩니다
              {" "}<InlineEmoji src="/emojis/redrawn/cheer-tortoise.png" size={17} />
            </div>

            {!wasAlreadyRewarded && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", marginBottom: 16,
                borderRadius: "var(--radius-card)", background: "rgba(49, 130, 246, 0.1)",
                color: "var(--accent-blue)", fontSize: 13, fontWeight: 700,
              }}>
                <img src="/rewards/gift-box-closed.png" alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
                문의 완료하면 +{FEEDBACK_REWARD.toLocaleString()}P 드려요!
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
