import { useState } from "react";

interface GiftBoxProps {
  disabled?: boolean;
  onOpened: () => void;
}

export default function GiftBox({ disabled, onOpened }: GiftBoxProps) {
  const [opening, setOpening] = useState(false);

  const handleClick = () => {
    if (opening || disabled) return;
    setOpening(true);
    window.setTimeout(() => {
      onOpened();
      setOpening(false);
    }, 650);
  };

  return (
    <>
      <style>{`
        @keyframes giftBoxIdle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-3px) rotate(3deg); }
        }
        @keyframes giftBoxOpen {
          0% { transform: scale(1) rotate(0deg); }
          20% { transform: scale(1.08) rotate(-6deg); }
          40% { transform: scale(1.12) rotate(6deg); }
          60% { transform: scale(1.2) rotate(-10deg); }
          80% { transform: scale(1.3) rotate(8deg); }
          100% { transform: scale(0.4) rotate(0deg); opacity: 0; }
        }
        .gift-box-icon { animation: giftBoxIdle 1.8s ease-in-out infinite; }
        .gift-box-icon.opening { animation: giftBoxOpen 0.65s cubic-bezier(.36,.07,.19,.97) forwards; }
      `}</style>
      <button
        onClick={handleClick}
        disabled={disabled}
        style={{
          width: 200, maxWidth: "100%", aspectRatio: "1 / 1", margin: "0 auto", padding: 16, borderRadius: 20,
          background: "var(--bg-card)", border: "2px solid var(--accent-blue)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
        }}
        aria-label="출석 선물 상자 열기"
      >
        <span className={`gift-box-icon${opening ? " opening" : ""}`} style={{ fontSize: 56, lineHeight: 1 }}>
          🎁
        </span>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>출석 선물이 도착했어요</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {opening ? "선물을 여는 중..." : "눌러서 열어보세요"}
        </div>
      </button>
    </>
  );
}
