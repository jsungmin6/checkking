import InlineEmoji from "./InlineEmoji";

interface SatisfactionModalProps {
  /** "좋아요" — 토스 리뷰 창으로 보낸다 */
  onGood: () => void;
  /** 닫기 버튼 또는 X */
  onClose: () => void;
}

/**
 * 토스 리뷰 창을 띄우기 전에 한 번 묻는 화면.
 * 토스 리뷰는 제출 여부를 알려주지 않아서, 여기서 받은 답이 우리가 아는 유일한 만족도다.
 */
export default function SatisfactionModal({ onGood, onClose }: SatisfactionModalProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="만족도 묻기"
        style={{
          position: "relative",
          width: "100%", maxWidth: 320, background: "var(--bg-card)",
          borderRadius: 20, padding: "26px 20px 20px", textAlign: "center",
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute", top: 10, right: 10,
            width: 32, height: 32, borderRadius: "50%", border: "none",
            background: "transparent", color: "var(--text-muted)",
            fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 0,
          }}
        >
          ×
        </button>

        <img
          src="/emojis/redrawn/cheer-rabbit.png"
          alt=""
          style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 10 }}
        />
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
          출석왕 쓰기 어떠세요?
        </div>
        <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 22, textAlign: "left" }}>
          안녕하세요, 출석왕 개발자입니다 <InlineEmoji src="/emojis/redrawn/hello-tortoise.png" />
          {" "}꾸준히 출석해주셔서 진심으로 감사드려요.
          혼자 만들고 운영하는 작은 앱이라, 남겨주시는 리뷰 한 줄이 저에게는 정말 큰 힘이 됩니다.
          괜찮으시다면 짧게라도 남겨주시면 감사하겠습니다 <InlineEmoji src="/emojis/redrawn/cheer-tortoise.png" />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 14, borderRadius: "var(--radius-button)",
              border: "1px solid var(--border-color)", background: "transparent",
              color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            닫기
          </button>
          <button
            onClick={onGood}
            style={{
              flex: 1, padding: 14, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            }}
          >
            좋아요
          </button>
        </div>
      </div>
    </div>
  );
}
