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
  const [fetchError, setFetchError] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setFetchError(false);
      const [c, t] = await Promise.all([
        api<Classroom>(`/classrooms/${classroomId}`),
        api<TodayAttendance>(`/classrooms/${classroomId}/attendance/today`),
      ]);
      setClassroom(c);
      setToday(t);
    } catch {
      setFetchError(true);
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
      if (e instanceof ApiError) {
        const messages: Record<string, string> = {
          GPS_VERIFICATION_FAILED: "현재 위치가 출석 허용 범위 밖입니다",
          WIFI_VERIFICATION_FAILED: "지정된 Wi-Fi에 연결되어 있지 않습니다",
          MISSING_GPS_DATA: "GPS 위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요",
          MISSING_WIFI_DATA: "Wi-Fi 정보를 가져올 수 없습니다",
          NOT_CHECK_IN_TIME: "출석 가능 시간이 아닙니다",
          ALREADY_CHECKED_IN: "오늘 이미 출석했습니다",
          NOT_MEMBER: "이 방의 멤버가 아닙니다",
          WEEKEND_NOT_ALLOWED: "주말에는 출석할 수 없습니다",
        };
        setCheckInError(messages[e.code] ?? e.message);
      } else {
        const msg = e instanceof Error ? e.message : "출석에 실패했습니다";
        if (msg.includes("위치")) setCheckInError("GPS 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요");
        else setCheckInError(msg);
      }
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>
      </div>
    );
  }

  if (fetchError || !classroom || !today) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <span style={{ color: "var(--text-secondary)" }}>정보를 불러올 수 없습니다</span>
        <button onClick={() => { setLoading(true); fetchData(); }} style={{ padding: "8px 20px", borderRadius: "var(--radius-card)", background: "var(--accent-blue)", color: "#fff", fontSize: 13 }}>다시 시도</button>
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
        {/* 상단: 출석 버튼 or 출석 완료 */}
        {!isCheckedIn ? (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            <button onClick={handleCheckIn} disabled={checkingIn} className="checkin-btn" style={{
              width: 100, height: 100, borderRadius: "50%", margin: "0 auto",
              background: checkingIn ? "var(--border-light)" : "linear-gradient(135deg, var(--accent-blue), #5B9CF6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: checkingIn ? "default" : "pointer",
              boxShadow: "0 4px 16px rgba(49, 130, 246, 0.25)",
              color: "#fff", fontSize: 14, fontWeight: 700,
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}>
              {checkingIn ? "확인 중..." : "출석하기"}
            </button>
            <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 10 }}>
              {today.totalCheckedIn}명 출석 · {timeRange}
            </div>
            {checkInError && <div style={{ color: "var(--accent-red)", fontSize: 13, marginTop: 8 }}>{checkInError}</div>}
          </div>
        ) : (
          <div style={{ padding: "16px 16px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>🎉 {today.myRank}등! <span style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 400 }}>{today.myCheckInTime ? formatTime(today.myCheckInTime) : ""}에 출석</span></div>
          </div>
        )}

        {/* 하단: 오늘의 순위 리스트 */}
        <div style={{ flex: 1, padding: "0 16px", overflow: "auto" }}>
          {today.rankings.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>오늘의 순위</div>
              {today.rankings.map((r) => (
                <RankRow key={r.userId} rank={r.rank} nickname={r.nickname} checkInTime={r.checkInTime} isMe={r.userId === user.userId} />
              ))}
              {today.absentMembers.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 16, marginBottom: 8 }}>미출석</div>
                  {[...today.absentMembers].sort((a, b) => a.nickname.localeCompare(b.nickname, "ko")).map((m) => (
                    <div key={m.userId} style={{
                      display: "flex", alignItems: "center", padding: 14,
                      background: "var(--bg-card)", borderRadius: "var(--radius-card)",
                      marginBottom: 8, fontSize: 14, color: "var(--text-muted)",
                      boxShadow: "var(--shadow-card)",
                    }}>
                      <span>{m.nickname}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "var(--radius-badge)" }}>미출석</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <TabBar active="today" onSelect={onTabChange} />
    </div>
  );
}
