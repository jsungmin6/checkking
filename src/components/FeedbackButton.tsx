interface FeedbackButtonProps {
  onClick: () => void;
  bottomOffset: number;
}

export default function FeedbackButton({ onClick, bottomOffset }: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="문의하기"
      style={{
        position: "fixed",
        right: 16,
        bottom: bottomOffset,
        zIndex: 30,
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "none",
        background: "var(--accent-blue)",
        boxShadow: "0 4px 14px rgba(49, 130, 246, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path
          d="M18 24 C18 18 23 14 29 14 L71 14 C77 14 82 18 82 24 L82 56 C82 62 77 66 71 66 L40 66 L22 84 L24 66 L29 66 C23 66 18 62 18 56 Z"
          fill="#fff"
        />
        <circle cx="35" cy="40" r="5" fill="var(--accent-blue)" />
        <circle cx="50" cy="40" r="5" fill="var(--accent-blue)" />
        <circle cx="65" cy="40" r="5" fill="var(--accent-blue)" />
      </svg>
    </button>
  );
}
