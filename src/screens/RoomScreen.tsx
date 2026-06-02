import { useState, useEffect, useCallback } from "react";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import RankRow from "../components/RankRow";
import { api, ApiError } from "../utils/api";
import { collectCheckInData } from "../utils/location";
import { formatTime } from "../utils/time";
import type { TabName } from "../components/TabBar";
import type { Classroom, TodayAttendance, CheckInResponse, CheckInRequest, User } from "../types";

interface RoomScreenProps {
  classroomId: number;
  user: User;
  onBack: () => void;
  onTabChange: (tab: TabName) => void;
}

export default function RoomScreen({ classroomId, user, onBack, onTabChange }: RoomScreenProps) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([
        api<Classroom>(`/classrooms/${classroomId}`),
        api<TodayAttendance>(`/classrooms/${classroomId}/attendance/today`),
      ]);
      setClassroom(c);
      setToday(t);
    } catch {
      // error handling
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckIn = async () => {
    if (!classroom) return;
    setCheckingIn(true);
    setCheckInError(null);
    try {
      const locationData: CheckInRequest = await collectCheckInData(classroom.validationType);
      await api<CheckInResponse>(`/classrooms/${classroomId}/attendance/check-in`, {
        method: "POST",
        body: JSON.stringify(locationData),
      });
      await fetchData();
    } catch (e) {
      if (e instanceof ApiError) setCheckInError(e.message);
      else setCheckInError("출석에 실패했습니다");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading || !classroom || !today) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>
      </div>
    );
  }

  const isCheckedIn = today.myRank !== null;
  const timeRange = classroom.checkInStartTime && classroom.checkInEndTime
    ? `${classroom.checkInStartTime} ~ ${classroom.checkInEndTime}`
    : "24시간";

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BackHeader title={classroom.name} onBack={onBack} right={<span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{classroom.memberCount}명</span>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!isCheckedIn ? (
          <>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={handleCheckIn} style={{
                width: 140, height: 140, borderRadius: "50%",
                background: checkingIn ? "var(--border-light)" : "linear-gradient(135deg, var(--accent-blue), var(--accent-green))",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: checkingIn ? "default" : "pointer",
                boxShadow: "0 0 40px rgba(26,95,180,0.3)",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28 }}>{checkingIn ? "⏳" : "👆"}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{checkingIn ? "확인 중..." : "출석하기"}</div>
                </div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 16 }}>현재 {today.totalCheckedIn}명 출석 완료</div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{timeRange}</div>
              {checkInError && <div style={{ color: "var(--accent-red)", fontSize: 13, marginTop: 8 }}>{checkInError}</div>}
            </div>
            {today.rankings.length > 0 && (
              <div style={{ padding: "12px 16px", background: "#111", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>오늘 TOP 3</div>
                {today.rankings.slice(0, 3).map((r) => (
                  <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ width: 20 }}>{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"}</span>
                    <span>{r.nickname}</span>
                    <span style={{ marginLeft: "auto", color: "var(--text-secondary)" }}>{formatTime(r.checkInTime)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🎉</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{today.myRank}등!</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>{today.myCheckInTime ? formatTime(today.myCheckInTime) : ""}에 출석했어요</div>
            </div>
            <div style={{ flex: 1, padding: "0 16px", overflow: "auto" }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>오늘의 순위</div>
              {today.rankings.map((r) => (
                <RankRow key={r.userId} rank={r.rank} nickname={r.nickname} checkInTime={r.checkInTime} isMe={r.userId === user.userId} />
              ))}
              {today.absentMembers.length > 0 && (
                <div style={{ textAlign: "center", padding: 8, color: "var(--text-muted)", fontSize: 12 }}>미출석 {today.absentMembers.length}명</div>
              )}
            </div>
          </>
        )}
      </div>

      <TabBar active="today" onSelect={onTabChange} />
    </div>
  );
}
