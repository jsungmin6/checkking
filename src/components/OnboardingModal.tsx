import { useState } from "react";

interface OnboardingModalProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: "📍",
    title: "방을 만들고 GPS로 출석해요",
    desc: "모임, 스터디, 반 등 원하는 방을 만들고, GPS 위치 인증으로 정확하게 출석을 확인할 수 있어요.",
  },
  {
    icon: "🏃",
    title: "먼저 온 순서로 순위가 매겨져요",
    desc: "출석하면 그날의 등수가 자동으로 기록돼요. 순위가 높을수록 더 많은 포인트를 받아가요.",
  },
  {
    icon: "🎁",
    title: "하루 3번까지 출석 선물을 받아요",
    desc: "출석할 때마다 선물상자를 열어 포인트를 모으고, 모은 포인트는 토스 포인트로 전환할 수 있어요.",
  },
];

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 360, background: "var(--bg-card)", borderRadius: 20,
        padding: "28px 22px 22px", display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ fontSize: 52, marginBottom: 18 }}>{current.icon}</div>
        <div style={{ fontSize: 19, fontWeight: 800, textAlign: "center", marginBottom: 10 }}>{current.title}</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.6, marginBottom: 26 }}>
          {current.desc}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 3,
              background: i === step ? "var(--accent-blue)" : "var(--border-light)",
              transition: "width 0.2s ease",
            }} />
          ))}
        </div>

        <button
          onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
          style={{
            width: "100%", padding: 15, borderRadius: "var(--radius-button)", border: "none",
            background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
          }}
        >
          {isLast ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}
