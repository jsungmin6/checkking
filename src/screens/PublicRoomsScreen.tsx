import { useEffect, useMemo, useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import JoinRoomModal from "../components/JoinRoomModal";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";
import type { HomeTab } from "../components/HomeTabBar";
import { api, ApiError } from "../utils/api";
import type { AccountType, ClassroomListItem } from "../types";
import ValidationTag from "../components/ValidationTag";

interface Props {
  accountType?: AccountType;
  onNavigateHome: () => void;
  onNavigateProfile: () => void;
  onNavigateCreateRoom: () => void;
  onJoined: (id: number) => void;
}
type Sort = "popular" | "name" | "newest";
type RoomFilter = "all" | "public" | "secret";

const SORTS: { key: Sort; label: string }[] = [
  { key: "popular", label: "인원순" },
  { key: "newest", label: "최신순" },
  { key: "name", label: "제목순" },
];

const ROOM_FILTERS: { key: RoomFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "public", label: "공개방" },
  { key: "secret", label: "암호방" },
];

export default function PublicRoomsScreen({ accountType, onNavigateHome, onNavigateProfile, onNavigateCreateRoom, onJoined }: Props) {
  const [rooms, setRooms] = useState<ClassroomListItem[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState<number | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  // null이면 닫힘. ""이면 상단 "참여코드" 버튼, 방 이름이 들어오면 그 암호방 카드에서 연 것.
  const [codeModalRoom, setCodeModalRoom] = useState<string | null>(null);
  const { toastMessage, showToast } = useToast();
  const roomLimit = accountType === "PREMIUM" ? 50 : 10;
  useEffect(() => {
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/public")
      .then((r) => setRooms(r.classrooms ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "공개방을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
    api<{ classrooms: ClassroomListItem[] }>("/classrooms/my")
      .then((r) => setRoomCount(r.classrooms.length))
      .catch(() => setRoomCount(null));
  }, []);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return rooms.filter((r) => !r.joined && r.name.toLocaleLowerCase().includes(normalized)
      && (filter === "all" || (filter === "public" ? r.isPublic : !r.isPublic))).sort((a, b) => {
      const aFull = a.memberCount >= a.maxMembers;
      const bFull = b.memberCount >= b.maxMembers;
      if (aFull !== bFull) return aFull ? 1 : -1;
      return sort === "name" ? a.name.localeCompare(b.name, "ko") :
        sort === "newest" ? b.classroomId - a.classroomId : b.memberCount - a.memberCount || a.name.localeCompare(b.name, "ko");
    });
  }, [rooms, query, sort, filter]);
  const join = async (room: ClassroomListItem) => {
    // 암호방은 초대코드를 모르면 들어갈 수 없다(서버가 코드를 내려주지도 않는다).
    if (room.joined || room.isDemo || !room.isPublic || room.memberCount >= room.maxMembers) return;
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
  const handleCreate = () => {
    if (roomCount !== null && roomCount >= roomLimit) {
      showToast(`방은 ${roomLimit}개까지만 이용할 수 있어요.`);
      return;
    }
    onNavigateCreateRoom();
  };
  const handleTabChange = (tab: HomeTab) => {
    if (tab === "home") onNavigateHome();
    else if (tab === "profile") onNavigateProfile();
  };
  return <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
    <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>방 찾기</div>
      {/* 방을 만들고 들어가는 동작은 모두 이 탭에 모아둔다 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span onClick={handleCreate} style={{ padding: "8px 14px", background: "var(--accent-blue)", borderRadius: "var(--radius-button)", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>+ 만들기</span>
        <span onClick={() => setCodeModalRoom("")} style={{ padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-button)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer", whiteSpace: "nowrap" }}>참여코드</span>
      </div>
    </div>
    <div style={{ padding: 16, flexShrink: 0 }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="방 제목 검색" aria-label="방 제목 검색" style={{ width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 10, border: "1px solid var(--border-light)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 15 }} />
      {/* 암호방은 목록에 보이되 들어가려면 코드가 필요해서, 섞여 있으면 헷갈린다 */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {ROOM_FILTERS.map((tab) => {
          const on = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              aria-pressed={on}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
                fontWeight: on ? 700 : 500,
                background: on ? "rgba(49, 130, 246, 0.12)" : "var(--bg-card)",
                color: on ? "var(--accent-blue)" : "var(--text-secondary)",
                border: on ? "1px solid transparent" : "1px solid var(--border-light)",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* 거르는 축(탭)과 정렬하는 축을 섞지 않도록, 정렬은 작은 알약으로 따로 둔다. */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {SORTS.map((option) => {
          const on = sort === option.key;
          return (
            <button
              key={option.key}
              onClick={() => setSort(option.key)}
              aria-pressed={on}
              style={{
                padding: "6px 12px", borderRadius: 999, fontSize: 12,
                fontWeight: on ? 700 : 500,
                background: on ? "var(--text-primary)" : "var(--bg-card)",
                color: on ? "var(--bg-card)" : "var(--text-secondary)",
                border: on ? "1px solid transparent" : "1px solid var(--border-light)",
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
    {error && <div style={{ padding: "0 16px 8px", color: "var(--accent-red)", fontSize: 13, flexShrink: 0 }}>{error}</div>}
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "0 16px 20px" }}>
      {loading ? <div style={{ textAlign: "center", padding: 32 }}>불러오는 중...</div> : visible.length === 0 ? <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>검색 결과가 없습니다.</div> : visible.map((room) => {
        const full = room.memberCount >= room.maxMembers;
        return <div key={room.classroomId} style={{ padding: "12px 14px", marginBottom: 8, background: "var(--bg-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <strong style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</strong>
            {/* 암호방은 초대코드를 아는 사람만 들어갈 수 있다 */}
            {!room.isPublic && (
              <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3, background: "var(--bg-secondary)", color: "var(--text-secondary)", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                <svg width="9" height="11" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
                  <path d="M6 0a3.6 3.6 0 0 0-3.6 3.6V5H2a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H9.6V3.6A3.6 3.6 0 0 0 6 0Zm0 1.8a1.8 1.8 0 0 1 1.8 1.8V5H4.2V3.6A1.8 1.8 0 0 1 6 1.8Z" />
                </svg>
                암호방
              </span>
            )}
          </div>
          {/* 암호방은 초대코드를 받아야 들어갈 수 있어서 코드 입력 화면으로 보낸다. */}
          {!room.isPublic && !full ? (
            <button onClick={() => setCodeModalRoom(room.name)} style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 8, background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontWeight: 600, fontSize: 13 }}>코드 입력</button>
          ) : (
            <button disabled={joining !== null || room.joined || full || room.isDemo} onClick={() => void join(room)} style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 8, background: full ? "var(--bg-secondary)" : "var(--accent-blue)", color: full ? "var(--text-secondary)" : "white", fontWeight: 600, fontSize: 13 }}>{joining === room.classroomId ? "참여 중..." : full ? "마감" : "참여"}</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.ownerNickname} · {room.memberCount}/{room.maxMembers}</div>
          {/* 들어가기 전에 사진·위치 인증을 쓰는 방인지 알려준다. */}
          <ValidationTag validationType={room.validationType} />
        </div>
      </div>})}
    </div>
    {/* 배너 광고는 홈에서만 띄운다 */}
    <div style={{ flexShrink: 0 }}>
      <HomeTabBar active="publicRooms" onSelect={handleTabChange} />
    </div>
    {codeModalRoom !== null && (
      <JoinRoomModal
        roomName={codeModalRoom || undefined}
        onClose={() => setCodeModalRoom(null)}
        onJoined={onJoined}
        onNotice={showToast}
      />
    )}
    <Toast message={toastMessage} />
  </div>;
}
