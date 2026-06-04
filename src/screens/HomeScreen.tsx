import { useState, useEffect } from "react";
import { api } from "../utils/api";
import RoomCard from "../components/RoomCard";
import HomeTabBar from "../components/HomeTabBar";
import type { HomeTab } from "../components/HomeTabBar";
import type { ClassroomListItem } from "../types";

interface HomeScreenProps {
  onNavigateCreateRoom: () => void;
  onNavigateJoinRoom: () => void;
  onNavigateRoom: (classroomId: number) => void;
  onNavigateProfile: () => void;
}

export default function HomeScreen({
  onNavigateCreateRoom, onNavigateJoinRoom, onNavigateRoom, onNavigateProfile,
}: HomeScreenProps) {
  const [rooms, setRooms] = useState<ClassroomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HomeTab>("home");

  useEffect(() => {
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/my")
      .then((data) => setRooms(data.classrooms))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (tab: HomeTab) => {
    if (tab === "profile") {
      onNavigateProfile();
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>내 방</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span onClick={onNavigateCreateRoom} style={{ padding: "8px 14px", background: "var(--accent-blue)", borderRadius: "var(--radius-button)", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>+ 만들기</span>
          <span onClick={onNavigateJoinRoom} style={{ padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-button)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>참여</span>
        </div>
      </div>

      <div style={{ padding: "16px 16px", flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>불러오는 중...</div>
        ) : rooms.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>아직 참여한 방이 없어요</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>방을 만들거나 초대코드로 참여해보세요</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={onNavigateCreateRoom} style={{ padding: "12px 24px", borderRadius: "var(--radius-button)", background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 600 }}>방 만들기</button>
              <button onClick={onNavigateJoinRoom} style={{ padding: "12px 24px", borderRadius: "var(--radius-button)", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: 15, fontWeight: 600 }}>참여하기</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }} className="room-grid">
            {rooms.map((room) => (
              <RoomCard key={room.classroomId} room={room} onClick={() => onNavigateRoom(room.classroomId)} />
            ))}
          </div>
        )}
      </div>

      <HomeTabBar active={activeTab} onSelect={handleTabChange} />
    </div>
  );
}
