interface OnboardingModalProps {
  onClose: () => void;
}

const FEATURES = [
  {
    icon: "🚪",
    title: "방을 만들어 출석을 관리해요",
    desc: "모임, 스터디, 반 등 원하는 방을 만들고 멤버들의 출석을 한눈에 관리할 수 있어요.",
  },
  {
    icon: "🏃",
    title: "먼저 온 순서로 순위가 매겨져요",
    desc: "출석하면 그날의 등수가 자동으로 기록돼요. 빨리 올수록 높은 순위를 차지해요.",
  },
  {
    icon: "🎁",
    title: "출석할 때마다 포인트를 받아요",
    desc: "매일 출석 선물과 1~3등 보너스로 포인트를 모으고, 토스 포인트로 전환할 수 있어요.",
  },
];

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 360, maxHeight: "85vh", overflowY: "auto",
        background: "var(--bg-card)", borderRadius: 20, padding: "26px 22px 22px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👑</div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>출석왕에 오신 걸 환영해요!</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
            출석왕이 어떤 서비스인지 짧게 소개할게요
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          width: "100%", padding: 15, borderRadius: "var(--radius-button)", border: "none",
          background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
        }}>
          시작하기
        </button>
      </div>
    </div>
  );
}
