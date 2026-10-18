import { useState } from "react";

interface UserActionSheetProps {
  userId: number;
  nickname: string;
  onClose: () => void;
}

const BLOCK_KEY = "blocked_users";

function getBlockedUsers(): number[] {
  try {
    return JSON.parse(localStorage.getItem(BLOCK_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isBlocked(userId: number): boolean {
  return getBlockedUsers().includes(userId);
}

export function blockUser(userId: number) {
  const blocked = getBlockedUsers();
  if (!blocked.includes(userId)) {
    blocked.push(userId);
    localStorage.setItem(BLOCK_KEY, JSON.stringify(blocked));
  }
}

export function unblockUser(userId: number) {
  const blocked = getBlockedUsers().filter((id) => id !== userId);
  localStorage.setItem(BLOCK_KEY, JSON.stringify(blocked));
}

export function getBlockedList(): number[] {
  return getBlockedUsers();
}

export default function UserActionSheet({ userId, nickname, onClose }: UserActionSheetProps) {
  const [showReportReasons, setShowReportReasons] = useState(false);
  const blocked = isBlocked(userId);

  const handleReport = (reason: string) => {
    const subject = encodeURIComponent(`[출석왕] 유저 신고 - ${nickname}`);
    const body = encodeURIComponent(
      `신고 대상: ${nickname} (ID: ${userId})\n신고 사유: ${reason}\n\n추가 설명:\n`
    );
    window.location.href = `mailto:chesscode.dev@gmail.com?subject=${subject}&body=${body}`;
    onClose();
  };

  const handleBlock = () => {
    if (blocked) {
      unblockUser(userId);
      alert(`${nickname}님의 차단을 해제했습니다.`);
    } else {
      if (confirm(`${nickname}님을 차단하시겠습니까?\n차단하면 이 유저의 정보가 순위에서 숨겨집니다.`)) {
        blockUser(userId);
        alert(`${nickname}님을 차단했습니다.`);
      }
    }
    onClose();
  };

  const REPORT_REASONS = [
    "부적절한 닉네임",
    "비매너 행위",
    "사칭/도용",
    "기타",
  ];

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 500, background: "var(--bg-card)", borderRadius: "16px 16px 0 0",
        padding: "20px 16px", paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
          {nickname}
        </div>

        {!showReportReasons ? (
          <>
            <button onClick={() => setShowReportReasons(true)} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              background: "var(--bg-secondary)", color: "var(--text-primary)",
              fontSize: 15, marginBottom: 8, cursor: "pointer",
            }}>
              신고하기
            </button>
            <button onClick={handleBlock} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              background: "var(--bg-secondary)", color: blocked ? "var(--accent-blue)" : "var(--accent-red)",
              fontSize: 15, marginBottom: 8, cursor: "pointer",
            }}>
              {blocked ? "차단 해제" : "차단하기"}
            </button>
            <button onClick={onClose} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              background: "var(--bg-secondary)", color: "var(--text-secondary)",
              fontSize: 15, cursor: "pointer",
            }}>
              취소
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>신고 사유를 선택해주세요</div>
            {REPORT_REASONS.map((reason) => (
              <button key={reason} onClick={() => handleReport(reason)} style={{
                width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                fontSize: 15, marginBottom: 8, cursor: "pointer",
              }}>
                {reason}
              </button>
            ))}
            <button onClick={() => setShowReportReasons(false)} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              background: "var(--bg-secondary)", color: "var(--text-secondary)",
              fontSize: 15, cursor: "pointer",
            }}>
              뒤로
            </button>
          </>
        )}
      </div>
    </div>
  );
}
