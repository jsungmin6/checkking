import { useState, useEffect } from "react";
import { api } from "../utils/api";
import RoomCard from "../components/RoomCard";
import type { ClassroomListItem, User } from "../types";

interface HomeScreenProps {
  user: User;
  onNavigateProfile: () => void;
  onNavigateCreateRoom: () => void;
  onNavigateJoinRoom: () => void;
  onNavigateRoom: (classroomId: number) => void;
}

export default function HomeScreen({
  user, onNavigateProfile, onNavigateCreateRoom, onNavigateJoinRoom, onNavigateRoom,
}: HomeScreenProps) {
  const [rooms, setRooms] = useState<ClassroomListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/my")
      .then((data) => setRooms(data.classrooms))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page animate-fade-in">
      <div style={{ padding: "20px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>내 방</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span onClick={onNavigateCreateRoom} style={{ padding: "6px 12px", background: "var(--accent-blue)", borderRadius: 8, fontSize: 12, color: "#fff", cursor: "pointer" }}>+ 만들기</span>
          <span onClick={onNavigateJoinRoom} style={{ padding: "6px 12px", background: "var(--accent-orange)", borderRadius: 8, fontSize: 12, color: "#fff", cursor: "pointer" }}>참여</span>
          <span onClick={onNavigateProfile} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-blue)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer" }}>{user.nickname.charAt(0)}</span>
        </div>
      </div>
      <div style={{ padding: "0 16px", flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>불러오는 중...</div>
        ) : rooms.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>아직 참여한 방이 없어요</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 32 }}>방을 만들거나 초대코드로 참여해보세요</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }} className="room-grid">
            {rooms.map((room) => (
              <RoomCard key={room.classroomId} room={room} onClick={() => onNavigateRoom(room.classroomId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
