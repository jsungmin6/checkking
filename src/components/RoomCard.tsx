import type { ClassroomListItem } from "../types";

interface RoomCardProps {
  room: ClassroomListItem;
  onClick: () => void;
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <div onClick={onClick} style={{ background: "var(--bg-card)", borderRadius: 12, padding: 16, marginBottom: 10, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>{room.name}</div>
        <span style={{
          background: room.todayCheckedIn ? "var(--accent-green)" : "var(--accent-red)",
          padding: "3px 10px", borderRadius: 12, fontSize: 11,
        }}>
          {room.todayCheckedIn ? "출석완료" : "미출석"}
        </span>
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 6 }}>
        {room.todayCheckedIn && room.todayRank ? `오늘 ${room.todayRank}등` : "아직 출석하지 않았어요"}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{room.memberCount}명 참여중</div>
    </div>
  );
}
