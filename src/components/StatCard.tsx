interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

export default function StatCard({ value, label, color }: StatCardProps) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
    </div>
  );
}
