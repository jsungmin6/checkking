export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" style={{
      position: "fixed", zIndex: 10000, left: "50%", bottom: "calc(88px + env(safe-area-inset-bottom))",
      transform: "translateX(-50%)", maxWidth: "calc(100vw - 32px)", padding: "11px 16px",
      borderRadius: 10, background: "rgba(35, 38, 42, 0.94)", color: "#fff",
      fontSize: 14, lineHeight: 1.4, textAlign: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
      pointerEvents: "none", whiteSpace: "nowrap",
    }}>{message}</div>
  );
}
