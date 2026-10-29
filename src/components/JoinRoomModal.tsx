import InviteCodeForm from "./InviteCodeForm";

interface JoinRoomModalProps {
  /** 어떤 방에 들어가려는지 — 암호방 카드에서 열었을 때만 있다. */
  roomName?: string;
  onClose: () => void;
  onJoined: (classroomId: number) => void;
  onNotice?: (message: string) => void;
}

/** 방 찾기에서 코드로 참여할 때 뜨는 모달. 초대 딥링크는 전체 화면(JoinRoomScreen)을 쓴다. */
export default function JoinRoomModal({ roomName, onClose, onJoined, onNotice }: JoinRoomModalProps) {
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
        aria-label="방 참여하기"
        style={{
          position: "relative", width: "100%", maxWidth: 340,
          background: "var(--bg-card)", borderRadius: 20, padding: "26px 20px 20px", textAlign: "center",
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute", top: 10, right: 10,
            width: 32, height: 32, borderRadius: "50%", border: "none",
            background: "transparent", color: "var(--text-muted)",
            fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 0,
          }}
        >
          ×
        </button>

        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {roomName ? `${roomName}` : "방 참여하기"}
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 22 }}>
          {roomName ? "방장에게 받은 초대 코드를 입력하세요" : "초대 코드를 입력하세요"}
        </div>

        <InviteCodeForm onJoined={onJoined} onNotice={onNotice} />

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: 13, marginTop: 8, borderRadius: "var(--radius-button)",
            border: "none", background: "transparent",
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
