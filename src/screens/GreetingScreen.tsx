import { useState, useEffect, useCallback, useRef } from "react";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import AnnouncementModal from "../components/AnnouncementModal";
import PostGreetingModal from "../components/PostGreetingModal";
import GreetingActionSheet from "../components/GreetingActionSheet";
import { hideAdBanner } from "../utils/admob";
import { api, ApiError } from "../utils/api";
import { parseGreetingContent } from "../utils/emoji";
import type { TabName } from "../components/TabBar";
import type { Classroom, RoomGreeting, User } from "../types";

interface GreetingScreenProps {
  classroomId: number;
  user: User;
  onBack: () => void;
  onTabChange: (tab: TabName) => void;
}

const AVATAR_COLORS = ["#F2994A", "#56CCF2", "#BB6BD9", "#6FCF97", "#F2C94C", "#EB5757", "#2D9CDB", "#9B51E0"];

function avatarColor(userId: number): string {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length]!;
}

function formatGreetingTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function GreetingScreen({ classroomId, user, onBack, onTabChange }: GreetingScreenProps) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [greetings, setGreetings] = useState<RoomGreeting[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingGreeting, setEditingGreeting] = useState<RoomGreeting | null>(null);
  const [actionSheetGreeting, setActionSheetGreeting] = useState<RoomGreeting | null>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = classroom?.ownerId === user.userId;
  const alreadyPostedToday = greetings?.some((g) => g.mine) ?? false;

  const fetchData = useCallback(async () => {
    try {
      setFetchError(false);
      const [c, g] = await Promise.all([
        api<Classroom>(`/classrooms/${classroomId}`),
        api<{ greetings: RoomGreeting[] }>(`/classrooms/${classroomId}/greetings`),
      ]);
      setClassroom(c);
      setGreetings(g.greetings);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => { hideAdBanner(); fetchData(); }, [fetchData]);

  const handleReport = async (greetingId: number) => {
    if (reportingId !== null) return;
    if (!confirm("이 코멘트를 신고하시겠어요?")) return;
    setReportingId(greetingId);
    try {
      const result = await api<{ reportCount: number }>(`/classrooms/${classroomId}/greetings/${greetingId}/report`, { method: "POST" });
      setGreetings((prev) => prev?.map((g) => (g.greetingId === greetingId ? { ...g, reportCount: result.reportCount } : g)) ?? null);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "신고에 실패했어요");
    } finally {
      setReportingId(null);
    }
  };

  const handleHide = async (greetingId: number) => {
    if (!confirm("이 코멘트를 삭제 처리하시겠어요?")) return;
    try {
      await api(`/classrooms/${classroomId}/greetings/${greetingId}/hide`, { method: "PUT" });
      setGreetings((prev) => prev?.map((g) => (g.greetingId === greetingId ? { ...g, hidden: true, content: "삭제된 코멘트입니다" } : g)) ?? null);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "처리에 실패했어요");
    }
  };

  const handleDeleteOwn = async (greetingId: number) => {
    if (!confirm("이 인사를 삭제할까요?")) return;
    try {
      await api(`/classrooms/${classroomId}/greetings/${greetingId}`, { method: "DELETE" });
      setGreetings((prev) => prev?.filter((g) => g.greetingId !== greetingId) ?? null);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "삭제에 실패했어요");
    }
  };

  const startLongPress = (g: RoomGreeting) => {
    if (g.hidden) return;
    longPressTimer.current = setTimeout(() => setActionSheetGreeting(g), 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>불러오는 중...</span>
        </div>
        <TabBar active="greeting" onSelect={onTabChange} />
      </div>
    );
  }

  if (fetchError || !classroom || !greetings) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>불러올 수 없습니다</span>
          <button onClick={fetchData} style={{ padding: "8px 20px", borderRadius: "var(--radius-card)", background: "var(--accent-blue)", color: "#fff", fontSize: 13 }}>다시 시도</button>
        </div>
        <TabBar active="greeting" onSelect={onTabChange} />
      </div>
    );
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <BackHeader title="출석인사" onBack={onBack} />

      <div style={{ flexShrink: 0, padding: "12px 16px 4px" }}>
        <div
          onClick={() => setShowAnnouncementModal(true)}
          style={{
            display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer",
            padding: "12px 14px", borderRadius: "var(--radius-card)", border: "1px solid var(--border-color)",
            background: "var(--bg-card)",
          }}
        >
          <span style={{ fontSize: 15, lineHeight: "20px", flexShrink: 0 }}>📣</span>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.5,
            color: classroom.announcement ? "var(--text-primary)" : "var(--text-muted)",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {classroom.announcement || (isOwner ? "공지를 남겨보세요" : "등록된 공지가 없어요")}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "4px 16px" }}>
        {greetings.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", fontSize: 14 }}>
            아직 오늘 남긴 인사가 없어요
          </div>
        ) : (
          greetings.map((g) => (
            <div
              key={g.greetingId}
              onPointerDown={() => startLongPress(g)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                display: "flex", gap: 10, padding: "14px 0", borderBottom: "1px solid var(--border-light)",
                userSelect: "none", WebkitUserSelect: "none",
              }}
            >
              <div style={{
                flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
                background: avatarColor(g.userId), color: "#fff", fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {g.nickname.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{g.mine ? `${g.nickname} (나)` : g.nickname}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatGreetingTime(g.createdAt)}</span>
                </div>
                {g.hidden ? (
                  <div style={{ fontSize: 14, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {g.content}
                  </div>
                ) : (() => {
                  const { emoji, text } = parseGreetingContent(g.content);
                  return (
                    <>
                      {emoji && (
                        <div style={{ fontSize: 102, lineHeight: 1.1, marginBottom: text ? 4 : 0 }}>{emoji}</div>
                      )}
                      {text && (
                        <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, wordBreak: "break-word" }}>
                          {text}
                        </div>
                      )}
                    </>
                  );
                })()}
                {!g.hidden && g.mine && g.reportCount > 0 && (
                  <div style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 6 }}>신고 {g.reportCount}건</div>
                )}
              </div>
            </div>
          ))
        )}
        <div style={{ height: 80 }} />
      </div>

      <div style={{ flexShrink: 0, padding: "10px 16px" }}>
        {alreadyPostedToday ? (
          <div style={{ textAlign: "center", padding: 12, color: "var(--text-secondary)", fontSize: 13 }}>
            오늘 인사를 남겼어요 ✅
          </div>
        ) : (
          <button onClick={() => setShowPostModal(true)} style={{
            width: "100%", padding: 13, borderRadius: "var(--radius-button)", border: "none",
            background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
          }}>
            오늘 인사 남기기
          </button>
        )}
      </div>

      <TabBar active="greeting" onSelect={onTabChange} />

      {showAnnouncementModal && (
        <AnnouncementModal
          classroomId={classroomId}
          isOwner={isOwner}
          initialText={classroom.announcement ?? ""}
          onClose={() => setShowAnnouncementModal(false)}
          onSaved={(text) => setClassroom((prev) => prev ? { ...prev, announcement: text } : prev)}
        />
      )}
      {showPostModal && (
        <PostGreetingModal
          classroomId={classroomId}
          onClose={() => setShowPostModal(false)}
          onPosted={(g) => setGreetings((prev) => [g, ...(prev ?? [])])}
        />
      )}
      {editingGreeting && (
        <PostGreetingModal
          classroomId={classroomId}
          editGreeting={editingGreeting}
          onClose={() => setEditingGreeting(null)}
          onPosted={(g) => setGreetings((prev) => prev?.map((x) => (x.greetingId === g.greetingId ? g : x)) ?? null)}
        />
      )}
      {actionSheetGreeting && (
        <GreetingActionSheet
          greeting={actionSheetGreeting}
          isOwner={isOwner}
          onClose={() => setActionSheetGreeting(null)}
          onEdit={() => { setEditingGreeting(actionSheetGreeting); setActionSheetGreeting(null); }}
          onDeleteOwn={() => { handleDeleteOwn(actionSheetGreeting.greetingId); setActionSheetGreeting(null); }}
          onReport={() => { handleReport(actionSheetGreeting.greetingId); setActionSheetGreeting(null); }}
          onHideOthers={() => { handleHide(actionSheetGreeting.greetingId); setActionSheetGreeting(null); }}
        />
      )}
    </div>
  );
}
