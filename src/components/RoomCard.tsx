import ValidationTag from "./ValidationTag";
import { hasUnreadGreeting } from "../utils/unreadGreetings";
import type { ClassroomListItem } from "../types";

interface RoomCardProps {
  room: ClassroomListItem;
  onClick: () => void;
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  const unread = hasUnreadGreeting(room.classroomId, room.latestGreetingId);
  const checkInTime = room.checkInStartTime && room.checkInEndTime
    ? `${room.checkInStartTime} ~ ${room.checkInEndTime}`
    : "24시간";

  return (
    <div onClick={onClick} style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card)", padding: 14, cursor: "pointer", boxShadow: "var(--shadow-card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {/* 새 인사가 올라왔다는 표시 */}
          {unread && (
            <span
              aria-label="안 읽은 인사"
              style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: "var(--accent-red)" }}
            />
          )}
          <div style={{ fontWeight: 600, fontSize: 15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8 }}>
          <ValidationTag validationType={room.validationType} />
          {room.isOwner && (
            <span style={{
              background: "#FFF4E5", color: "#C76A00",
              padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
            }}>
              방장
            </span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, color: "var(--text-secondary)", fontSize: 11 }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 4.5V8l2.2 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        출석 가능 시간 · {checkInTime}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, overflow: "hidden" }}>
          <span style={{
            flexShrink: 0,
            padding: "3px 9px", borderRadius: 12, fontSize: 11,
            background: room.todayCheckedIn ? "#E8F8EE" : "#FFEEEE",
            color: room.todayCheckedIn ? "#1B873F" : "#F04452",
          }}>
            {room.todayCheckedIn ? "출석완료" : "미출석"}
          </span>
          {!!room.currentStreak && (
            <span style={{
              flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3,
              padding: "3px 8px", borderRadius: 12, background: "#FFF4E5", color: "#C76A00",
              fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              연속 {room.currentStreak}일
            </span>
          )}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "right", flexShrink: 0 }}>{room.memberCount}명 참여중</div>
      </div>
    </div>
  );
}
