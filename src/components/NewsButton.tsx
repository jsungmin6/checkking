interface NewsButtonProps {
  /** 아직 열어보지 않은 소식이 있으면 빨간 점을 띄운다. */
  hasUnread: boolean;
  onClick: () => void;
}

export default function NewsButton({ hasUnread, onClick }: NewsButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={hasUnread ? "업데이트 소식 (새 소식 있음)" : "업데이트 소식"}
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "none",
        // 확성기가 컬러 일러스트라, 다크 모드에서도 바탕은 밝은 파랑으로 고정한다.
        background: "#E8F1FE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {/* 확성기 — 선으로만 그리면 스피커 아이콘처럼 읽혀서, 색을 채운 일러스트로 그렸다. */}
      <svg width="27" height="27" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <g transform="rotate(-20 24 24)">
          {/* 손잡이 */}
          <path
            d="M13.6 24.5h7.6v11a3.8 3.8 0 0 1-7.6 0z"
            fill="#3182F6" stroke="#1B64DA" strokeWidth="2.3" strokeLinejoin="round"
          />
          {/* 나팔 몸통 */}
          <path
            d="M10.6 16.8h6.2L28.9 7.9a2.8 2.8 0 0 1 4.5 2.2v27.8a2.8 2.8 0 0 1-4.5 2.2l-12.1-8.9h-6.2A3.9 3.9 0 0 1 6.7 27.3v-6.6a3.9 3.9 0 0 1 3.9-3.9Z"
            fill="#3182F6" stroke="#1B64DA" strokeWidth="2.3" strokeLinejoin="round"
          />
          {/* 나팔 안쪽 */}
          <path d="M17.9 19.6 28.8 11.8v24.4l-10.9-7.8z" fill="#fff" />
          {/* 몸통 하이라이트 */}
          <path d="M10.4 20.1h3.6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
        </g>
        {/* 퍼져나가는 소리 */}
        <g stroke="#FFC107" strokeWidth="3.8" strokeLinecap="round">
          <path d="M38.8 12.6 43.1 10.7" />
          <path d="M41.2 20.8h4.6" />
          <path d="M39.4 28.9 43.8 30.7" />
        </g>
      </svg>
      {hasUnread && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--accent-red, #E5484D)",
            boxShadow: "0 0 0 2px var(--bg-primary)",
          }}
        />
      )}
    </button>
  );
}
