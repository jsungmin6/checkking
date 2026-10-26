import { formatNewsDate } from "../news";
import type { NewsItem } from "../news";

interface NewsModalProps {
  news: NewsItem[];
  onClose: () => void;
}

export default function NewsModal({ news, onClose }: NewsModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="업데이트 소식"
        style={{
          width: "100%", maxWidth: 360, maxHeight: "85vh", display: "flex", flexDirection: "column",
          background: "var(--bg-card)", borderRadius: 20, overflow: "hidden",
        }}
      >
        <div style={{ padding: "22px 20px 12px", flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>업데이트 소식</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            출석왕에 새로 생긴 기능을 알려드려요
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 20px" }}>
          {news.length === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
              아직 전해드릴 소식이 없어요
            </div>
          ) : (
            news.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: "14px 0",
                  borderTop: index === 0 ? "none" : "1px solid var(--border-light)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--accent-blue)", fontWeight: 600, marginBottom: 4 }}>
                  {formatNewsDate(item.date)}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5 }}>
                  {item.body.map((line) => (
                    <li key={line} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "12px 20px 20px", flexShrink: 0 }}>
          <button onClick={onClose} style={{
            width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
            background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
          }}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
