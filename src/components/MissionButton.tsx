interface MissionButtonProps {
  /** 아직 확인하지 않은 변화(최초 노출·미션 완료)가 있으면 배지를 띄운다. */
  hasUpdate: boolean;
  onClick: () => void;
}

export default function MissionButton({ hasUpdate, onClick }: MissionButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="미션"
      style={{
        position: "relative",
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "none",
        background: "var(--accent-orange, #FF9500)",
        boxShadow: "0 4px 14px rgba(255, 149, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {/* 체크리스트 — 미션 목록을 하나씩 해치우는 느낌 */}
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <rect x="20" y="14" width="60" height="72" rx="10" fill="#fff" />
        <path d="M32 36 L39 43 L52 29" stroke="var(--accent-orange, #FF9500)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="58" y="32" width="14" height="6" rx="3" fill="var(--accent-orange, #FF9500)" />
        <path d="M32 60 L39 67 L52 53" stroke="var(--accent-orange, #FF9500)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="58" y="56" width="14" height="6" rx="3" fill="var(--accent-orange, #FF9500)" />
      </svg>
      {hasUpdate && (
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
      )}
    </button>
  );
}
