import type { ClassroomListItem } from "../types";

interface RoomCardProps {
  room: ClassroomListItem;
  onClick: () => void;
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <div onClick={onClick} style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card)", padding: 14, cursor: "pointer", boxShadow: "var(--shadow-card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8 }}>
          <span style={{
            background: room.todayCheckedIn ? "#E8F8EE" : "#FFEEEE",
            color: room.todayCheckedIn ? "#1B873F" : "#F04452",
            padding: "3px 9px", borderRadius: 12, fontSize: 11,
          }}>
            {room.todayCheckedIn ? "출석완료" : "미출석"}
          </span>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 7 }}>
        <div style={{ color: "var(--text-secondary)", fontSize: 12, minWidth: 0 }}>
          {room.todayCheckedIn && room.todayRank ? `오늘 ${room.todayRank}등` : "아직 출석하지 않았어요"}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0, textAlign: "right" }}>{room.memberCount}명 참여중</div>
      </div>
    </div>
  );
}
