import { useEffect, useMemo, useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import Toast from "../components/Toast";
import TossBannerAd from "../components/TossBannerAd";
import AdMobBanner from "../components/AdMobBanner";
import { useToast } from "../hooks/useToast";
import type { HomeTab } from "../components/HomeTabBar";
import { api, ApiError } from "../utils/api";
import type { AccountType, ClassroomListItem } from "../types";

interface Props {
  accountType?: AccountType;
  onNavigateHome: () => void;
  onNavigateProfile: () => void;
  onJoined: (id: number) => void;
}
type Sort = "popular" | "name" | "newest";

// 오픈방 화면의 마감 예시. 실제 계정이나 출석 기록은 만들지 않는다.
const demoFullRooms: ClassroomListItem[] = [
  { classroomId: -1, name: "신송고 3-12 출석방", ownerId: -1, ownerNickname: "3학년 12반", isOwner: false, memberCount: 20, maxMembers: 20, todayCheckedIn: false, todayRank: null, isPublic: true, inviteCode: "", joined: false, isDemo: true },
  { classroomId: -2, name: "늘봄독서실 출석 챌린지", ownerId: -2, ownerNickname: "독서실 이용자", isOwner: false, memberCount: 30, maxMembers: 30, todayCheckedIn: false, todayRank: null, isPublic: true, inviteCode: "", joined: false, isDemo: true },
  { classroomId: -3, name: "빠른기상 챌린지", ownerId: -3, ownerNickname: "빠른기상 챌린지", isOwner: false, memberCount: 30, maxMembers: 30, todayCheckedIn: false, todayRank: null, isPublic: true, inviteCode: "", joined: false, isDemo: true },
  { classroomId: -5, name: "네카라쿠배 스터디", ownerId: -5, ownerNickname: "스터디 멤버", isOwner: false, memberCount: 3, maxMembers: 3, todayCheckedIn: false, todayRank: null, isPublic: true, inviteCode: "", joined: false, isDemo: true },
];

export default function PublicRoomsScreen({ accountType, onNavigateHome, onNavigateProfile, onJoined }: Props) {
  const [rooms, setRooms] = useState<ClassroomListItem[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState<number | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const { toastMessage, showToast } = useToast();
  const roomLimit = accountType === "PREMIUM" ? 50 : 3;
  useEffect(() => {
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/public")
      .then((r) => setRooms([...(r.classrooms ?? []), ...demoFullRooms]))
      .catch((e) => setError(e instanceof Error ? e.message : "공개방을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/my")
      .then((r) => setRoomCount(r.classrooms.length))
      .catch(() => setRoomCount(null));
  }, []);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return rooms.filter((r) => !r.joined && r.name.toLocaleLowerCase().includes(normalized)).sort((a, b) => {
      const aFull = a.memberCount >= a.maxMembers;
      const bFull = b.memberCount >= b.maxMembers;
      if (aFull !== bFull) return aFull ? 1 : -1;
      return sort === "name" ? a.name.localeCompare(b.name, "ko") :
        sort === "newest" ? b.classroomId - a.classroomId : b.memberCount - a.memberCount || a.name.localeCompare(b.name, "ko");
    });
  }, [rooms, query, sort]);
  const join = async (room: ClassroomListItem) => {
    if (room.joined || room.isDemo || room.memberCount >= room.maxMembers) return;
    if (roomCount !== null && roomCount >= roomLimit) {
      showToast(`방은 ${roomLimit}개까지만 이용할 수 있어요.`);
      return;
    }
    setJoining(room.classroomId); setError("");
    try {
      await api(`/classrooms/join`, { method: "POST", body: JSON.stringify({ inviteCode: room.inviteCode }) });
      onJoined(room.classroomId);
    } catch (e) {
      if (e instanceof ApiError && e.code === "MAX_ROOMS_EXCEEDED") {
        showToast(`방은 최대 ${roomLimit}개까지 관리할 수 있어요.`);
        return;
      }
      setError(e instanceof Error ? e.message : "방 참여에 실패했습니다.");
    }
    finally { setJoining(null); }
  };
  const handleTabChange = (tab: HomeTab) => {
    if (tab === "home") onNavigateHome();
    else if (tab === "profile") onNavigateProfile();
  };
  return <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
    <div style={{ padding: "20px 20px 12px", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>오픈방</div>
    <div style={{ padding: 16, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="방 제목 검색" aria-label="공개방 제목 검색" style={{ flex: 1, minWidth: 0, padding: 13, borderRadius: 10, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 15 }} />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬" style={{ flexShrink: 0, width: 122, padding: "12px 8px", borderRadius: 10, background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-light)", fontSize: 13 }}>
        <option value="popular">참여 인원순</option><option value="name">제목순</option><option value="newest">최신순</option>
        </select>
      </div>
    </div>
    {error && <div style={{ padding: "0 16px 8px", color: "var(--accent-red)", fontSize: 13, flexShrink: 0 }}>{error}</div>}
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "0 16px 20px" }}>
      {loading ? <div style={{ textAlign: "center", padding: 32 }}>불러오는 중...</div> : visible.length === 0 ? <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>검색 결과가 없습니다.</div> : visible.map((room) => {
        const full = room.memberCount >= room.maxMembers;
        return <div key={room.classroomId} style={{ padding: 16, marginBottom: 10, background: "var(--bg-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><strong>{room.name}</strong><button disabled={joining !== null || room.joined || full || room.isDemo} onClick={() => void join(room)} style={{ padding: "9px 14px", borderRadius: 8, background: full ? "var(--bg-secondary)" : "var(--accent-blue)", color: full ? "var(--text-secondary)" : "white", fontWeight: 600 }}>{joining === room.classroomId ? "참여 중..." : full ? "마감" : "참여"}</button></div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>{room.ownerNickname} · {room.memberCount}/{room.maxMembers}</div>
      </div>})}
    </div>
    <div style={{ flexShrink: 0 }}>
      <TossBannerAd />
      <HomeTabBar active="publicRooms" onSelect={handleTabChange} />
      <AdMobBanner />
    </div>
    <Toast message={toastMessage} />
  </div>;
}
