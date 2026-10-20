interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

export default function StatCard({ value, label, color }: StatCardProps) {
  return (
    <div style={{ minWidth: 0, background: "var(--bg-card)", borderRadius: "var(--radius-card)", padding: "16px 6px", textAlign: "center", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: "clamp(15px, 5.5vw, 24px)", fontWeight: 700, color: color ?? "var(--text-primary)", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
    </div>
  );
}
