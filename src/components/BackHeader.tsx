interface BackHeaderProps {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export default function BackHeader({ title, onBack, right }: BackHeaderProps) {
  return (
    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)" }}>
      <span onClick={onBack} style={{ color: "var(--text-secondary)", cursor: "pointer", fontSize: 18 }}>←</span>
      <span style={{ fontWeight: 600, fontSize: 17 }}>{title}</span>
      {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
    </div>
  );
}
