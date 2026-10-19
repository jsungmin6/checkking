interface PointsCelebrationModalProps {
  title: string;
  subtitle: string;
  amount: number;
  onClose: () => void;
}

export default function PointsCelebrationModal({ title, subtitle, amount, onClose }: PointsCelebrationModalProps) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 320, background: "var(--bg-card)", borderRadius: 20,
        padding: "28px 24px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 18 }}>{subtitle}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 20 }}>+{amount.toLocaleString()}P</div>
        <button onClick={onClose} style={{
          width: "100%", padding: 13, borderRadius: "var(--radius-button)", border: "none",
          background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          확인
        </button>
      </div>
    </div>
  );
}
