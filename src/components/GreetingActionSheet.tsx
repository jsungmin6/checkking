import type { RoomGreeting } from "../types";

interface GreetingActionSheetProps {
  greeting: RoomGreeting;
  isOwner: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleteOwn: () => void;
  onReport: () => void;
  onHideOthers: () => void;
}

export default function GreetingActionSheet({
  greeting, isOwner, onClose, onEdit, onDeleteOwn, onReport, onHideOthers,
}: GreetingActionSheetProps) {
  const buttonStyle = (color: string) => ({
    width: "100%", padding: 14, borderRadius: 12, border: "none",
    background: "var(--bg-secondary)", color, fontSize: 15, marginBottom: 8, cursor: "pointer",
  });

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 500, background: "var(--bg-card)", borderRadius: "16px 16px 0 0",
        padding: "20px 16px", paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
      }}>
        {greeting.mine ? (
          <>
            <button onClick={onEdit} style={buttonStyle("var(--text-primary)")}>수정</button>
            <button onClick={onDeleteOwn} style={buttonStyle("var(--accent-red)")}>삭제</button>
          </>
        ) : (
          <>
            <button onClick={onReport} style={buttonStyle("var(--text-primary)")}>신고</button>
            {isOwner && (
              <button onClick={onHideOthers} style={buttonStyle("var(--accent-red)")}>삭제</button>
            )}
          </>
        )}
        <button onClick={onClose} style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 15, cursor: "pointer",
        }}>
          취소
        </button>
      </div>
    </div>
  );
}
