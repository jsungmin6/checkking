import { useState } from "react";
import { api, ApiError } from "../utils/api";

interface AnnouncementModalProps {
  classroomId: number;
  isOwner: boolean;
  initialText: string;
  onClose: () => void;
  onSaved: (text: string) => void;
}

export default function AnnouncementModal({ classroomId, isOwner, initialText, onClose, onSaved }: AnnouncementModalProps) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/classrooms/${classroomId}/announcement`, {
        method: "PUT",
        body: JSON.stringify({ announcement: text.trim() }),
      });
      onSaved(text.trim());
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  };

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
        style={{
          width: "100%", maxWidth: 360, background: "var(--bg-card)", borderRadius: 20, padding: "22px 20px",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>📣 방 공지</div>

        {isOwner ? (
          <>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
              방 인사 탭 상단에 고정으로 보여줄 공지를 적어주세요.
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예) 오늘은 다 같이 아침 7시에 출석해요!"
              maxLength={300}
              rows={4}
              style={{
                width: "100%", padding: 12, borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)",
                background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, resize: "none",
                boxSizing: "border-box", marginBottom: 8,
              }}
            />
            {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: 13, borderRadius: "var(--radius-button)", border: "1px solid var(--border-color)",
                background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
              }}>
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, padding: 13, borderRadius: "var(--radius-button)", border: "none",
                  background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 20, whiteSpace: "pre-wrap" }}>
              {initialText || "아직 공지가 없어요."}
            </div>
            <button onClick={onClose} style={{
              width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
            }}>
              확인
            </button>
          </>
        )}
      </div>
    </div>
  );
}
