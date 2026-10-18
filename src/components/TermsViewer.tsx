interface TermsViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function TermsViewer({ url, title, onClose }: TermsViewerProps) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "var(--bg-card)", display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        paddingTop: "calc(12px + env(safe-area-inset-top))",
      }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{title}</span>
        <button onClick={onClose} style={{
          background: "none", border: "none", fontSize: 16, color: "var(--accent-blue)",
          fontWeight: 600, cursor: "pointer", padding: "4px 8px",
        }}>닫기</button>
      </div>
      <iframe
        src={url}
        style={{ flex: 1, border: "none", width: "100%" }}
        title={title}
      />
    </div>
  );
}
