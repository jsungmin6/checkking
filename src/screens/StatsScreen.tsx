import { useState, useEffect, useMemo } from "react";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import StatCard from "../components/StatCard";
import AttendanceCalendar from "../components/AttendanceCalendar";
import { api } from "../utils/api";
import type { TabName } from "../components/TabBar";
import type { MonthlyAttendanceRecord } from "../types";

interface StatsScreenProps {
  classroomId: number;
  onTabChange: (tab: TabName) => void;
  onBack: () => void;
}

export default function StatsScreen({ classroomId, onTabChange, onBack }: StatsScreenProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [records, setRecords] = useState<MonthlyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<MonthlyAttendanceRecord[]>(
      `/classrooms/${classroomId}/attendance/monthly?year=${year}&month=${month}`
    )
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [classroomId, year, month]);

  // 월별 통계 클라이언트 계산
  const monthStats = useMemo(() => {
    if (records.length === 0) return null;

    const totalPresent = records.length;
    const firstPlaceCount = records.filter((r) => r.dailyRank === 1).length;
    const topThreeCount = records.filter((r) => r.dailyRank <= 3).length;

    // 평균 순위
    const rankSum = records.reduce((sum, r) => sum + r.dailyRank, 0);
    const avgRank = Math.round(rankSum / totalPresent * 10) / 10;

    // 평균 출석 시간
    const totalMinutes = records.reduce((sum, r) => {
      const [h, m] = r.checkInTime.split(":").map(Number);
      return sum + (h ?? 0) * 60 + (m ?? 0);
    }, 0);
    const avgMinutes = Math.round(totalMinutes / totalPresent);
    const avgH = String(Math.floor(avgMinutes / 60)).padStart(2, "0");
    const avgM = String(avgMinutes % 60).padStart(2, "0");
    const avgCheckInTime = `${avgH}:${avgM}`;

    return { totalPresent, firstPlaceCount, topThreeCount, avgRank, avgCheckInTime };
  }, [records]);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BackHeader title="내 통계" onBack={onBack} />

      <div style={{ flex: 1, overflow: "auto" }}>
        <AttendanceCalendar
          classroomId={classroomId}
          year={year}
          month={month}
          records={records}
          loading={loading}
          onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
        />

        {monthStats && (
          <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 16px" }}>
            <StatCard value={monthStats.avgRank} label="평균 순위" color="var(--accent-blue)" />
            <StatCard value={monthStats.avgCheckInTime} label="평균 출석 시간" color="var(--accent-green)" />
            <StatCard value={monthStats.totalPresent} label="총 출석일" />
            <StatCard value={monthStats.firstPlaceCount} label="1등 횟수" color="var(--accent-gold)" />
            <StatCard value={monthStats.topThreeCount} label="TOP3 횟수" />
          </div>
        )}

        {!monthStats && !loading && (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 14 }}>
            이 달의 출석 기록이 없습니다
          </div>
        )}
      </div>

      <TabBar active="stats" onSelect={onTabChange} />
    </div>
  );
}
