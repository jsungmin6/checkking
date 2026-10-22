import { useState, useEffect, useCallback, useRef } from "react";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import RankRow from "../components/RankRow";
import UserActionSheet, { isBlocked } from "../components/UserActionSheet";
import AttendanceGiftModal from "../components/AttendanceGiftModal";
import RankOnlyModal from "../components/RankOnlyModal";
import { hideAdBanner } from "../utils/admob";
import { api, ApiError } from "../utils/api";
import { collectCheckInData } from "../utils/location";
import { formatTime } from "../utils/time";
import { launchConfetti } from "../utils/confetti";
import { shareRoomInvite } from "../utils/invite";
import { useAttendancePoints, useAttendanceGift, useDailyRewardLimit, rollDailyRankBonus } from "../hooks/useAttendancePoints";
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
  const [actionTarget, setActionTarget] = useState<{ userId: number; nickname: string } | null>(null);
  const [rewardModal, setRewardModal] = useState<{ rank: number; rankBonus: number | null } | null>(null);
  const [rankOnlyModal, setRankOnlyModal] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<number | null>(null);
  const { addPoints } = useAttendancePoints();
  const { claim: claimGift } = useAttendanceGift(classroomId);
  const { remaining: rewardRemaining, increment: incrementReward } = useDailyRewardLimit();

  const playCheckInCelebration = () => {
    if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
    setCelebrating(true);
    celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 1500);
  };

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

  useEffect(() => { hideAdBanner(); fetchData(); }, [fetchData]);
  useEffect(() => () => {
    if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
  }, []);

  const handleCheckIn = async () => {
    if (!classroom) return;
    setCheckingIn(true);
    setCheckInError(null);
    try {
      const locationData: CheckInRequest = await collectCheckInData(classroom.validationType);
      const checkInResult = await api<CheckInResponse>(`/classrooms/${classroomId}/attendance/check-in`, {
        method: "POST",
        body: JSON.stringify(locationData),
      });
      await fetchData();
      // 출석 성공 — 방을 넘나들어도 "보상을 받는 체크인"은 하루 최대 3번까지만.
      // 그 안에 들면 선물상자(+1~3등이면 보너스도 같이)를 보여주고, 넘으면 등수만 보여준다.
      if (rewardRemaining > 0) {
        incrementReward();
        const rankBonus = rollDailyRankBonus(checkInResult.dailyRank);
        setTimeout(() => launchConfetti(rankBonus !== null), 300);
        setRewardModal({ rank: checkInResult.dailyRank, rankBonus });
      } else {
        setRankOnlyModal(checkInResult.dailyRank);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setCheckInError(e.message);
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
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <BackHeader title={classroom.name} onBack={onBack} right={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            onClick={() => void shareRoomInvite(classroom.name, classroom.inviteCode)}
            style={{ color: "var(--accent-blue)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            초대하기
          </span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{classroom.memberCount}명</span>
        </div>
      } />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <section className="attendance-hero" aria-label="오늘 출석">
          <div className={`attendance-jelly-stage${celebrating ? " is-celebrating" : ""}${isCheckedIn ? " is-done" : ""}`}>
            <div className="attendance-jelly-particles" aria-hidden="true"><i /><i />{celebrating && <><i /><i /><i /><i /></>}</div>
            <button
              onClick={handleCheckIn}
              disabled={isCheckedIn || checkingIn}
              className={`attendance-jelly-button${checkingIn ? " is-loading" : ""}`}
              aria-label={isCheckedIn ? "출석 완료" : "출석하기"}
            >
              {checkingIn ? <span className="attendance-spinner" /> : (
                <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m6.5 16.5 6.2 6.2L25.5 9.8" /></svg>
              )}
            </button>
          </div>
          <div className="attendance-hero-summary">
            {isCheckedIn
              ? `${today.myRank}등으로 출석 완료 · ${today.myCheckInTime ? formatTime(today.myCheckInTime) : ""}`
              : `${today.totalCheckedIn}명 출석 · ${timeRange}`}
          </div>
          {checkInError && <div className="attendance-error" role="alert">{checkInError}</div>}
        </section>

        {/* 하단: 오늘의 순위 리스트 */}
        <div style={{ flex: 1, padding: "0 16px", overflow: "auto" }}>
          {today.rankings.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>오늘의 순위</div>
              {today.rankings.filter((r) => !isBlocked(r.userId)).map((r) => (
                <div key={r.userId} onClick={() => r.userId !== user.userId && setActionTarget({ userId: r.userId, nickname: r.nickname })}>
                  <RankRow rank={r.rank} nickname={r.nickname} checkInTime={r.checkInTime} isMe={r.userId === user.userId} />
                </div>
              ))}
              {today.absentMembers.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 16, marginBottom: 8 }}>미출석</div>
                  {[...today.absentMembers].filter((m) => !isBlocked(m.userId)).sort((a, b) => a.nickname.localeCompare(b.nickname, "ko")).map((m) => (
                    <div key={m.userId} onClick={() => m.userId !== user.userId && setActionTarget({ userId: m.userId, nickname: m.nickname })} style={{
                      display: "flex", alignItems: "center", padding: 14,
                      background: "var(--bg-card)", borderRadius: "var(--radius-card)",
                      marginBottom: 8, fontSize: 14, color: "var(--text-muted)",
                      boxShadow: "var(--shadow-card)", cursor: "pointer",
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

      {actionTarget && (
        <UserActionSheet
          userId={actionTarget.userId}
          nickname={actionTarget.nickname}
          onClose={() => setActionTarget(null)}
        />
      )}
      {rewardModal !== null && (
        <AttendanceGiftModal
          rank={rewardModal.rank}
          rankBonus={rewardModal.rankBonus}
          onClaimGift={claimGift}
          onClose={(total) => {
            addPoints(total);
            setRewardModal(null);
            playCheckInCelebration();
          }}
        />
      )}
      {rankOnlyModal !== null && (
        <RankOnlyModal rank={rankOnlyModal} onClose={() => { setRankOnlyModal(null); playCheckInCelebration(); }} />
      )}
      <TabBar active="today" onSelect={onTabChange} />
    </div>
  );
}
