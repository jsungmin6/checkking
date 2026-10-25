interface FeedbackButtonProps {
  onClick: () => void;
}

export default function FeedbackButton({ onClick }: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="문의하기"
      style={{
        // 위치는 홈의 플로팅 버튼 스택(FloatingButtonStack)이 잡는다. 여기선 배지 기준점만 만든다.
        position: "relative",
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
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <rect x="14" y="26" width="72" height="50" rx="9" fill="#fff" />
        <path d="M18 30 L50 58 L82 30" stroke="var(--accent-blue)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span style={{
        position: "absolute",
        top: -3,
        right: -3,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "var(--accent-red, #E5484D)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 0 2px var(--bg-primary)",
      }}>
        !
      </span>
    </button>
  );
}
