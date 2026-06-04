import { useState, useEffect } from "react";
import TabBar from "../components/TabBar";
import StatCard from "../components/StatCard";
import { api } from "../utils/api";
import { formatTime } from "../utils/time";
import type { TabName } from "../components/TabBar";
import type { PersonalStats } from "../types";

interface StatsScreenProps {
  classroomId: number;
  onTabChange: (tab: TabName) => void;
}

export default function StatsScreen({ classroomId, onTabChange }: StatsScreenProps) {
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PersonalStats>(`/classrooms/${classroomId}/statistics/me`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [classroomId]);

  if (loading || !stats) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>불러오는 중...</span>
        </div>
        <TabBar active="stats" onSelect={onTabChange} />
      </div>
    );
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>내 통계</div>
      </div>
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "8px 16px" }}>
        <StatCard value={stats.avgRank} label="평균 순위" color="var(--accent-blue)" />
        <StatCard value={stats.avgCheckInTime} label="평균 등교 시간" color="var(--accent-green)" />
        <StatCard value={stats.totalPresent} label="총 출석일" />
        <StatCard value={stats.firstPlaceCount} label="1등 횟수" color="var(--accent-gold)" />
        <StatCard value={stats.topThreeCount} label="TOP3 횟수" />
        <StatCard value={`${stats.currentStreak}일`} label="연속 출석" color="var(--accent-orange)" />
      </div>
      <div style={{ padding: "8px 16px" }}>
        <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-card) var(--radius-card) 0 0", padding: "12px 16px", display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border-light)", boxShadow: "var(--shadow-card)" }}>
          <span style={{ color: "var(--text-secondary)" }}>가장 빠른 등교</span>
          <span style={{ color: "var(--accent-green)" }}>{formatTime(stats.earliestCheckIn)}</span>
        </div>
        <div style={{ background: "var(--bg-card)", borderRadius: "0 0 var(--radius-card) var(--radius-card)", padding: "12px 16px", display: "flex", justifyContent: "space-between", fontSize: 13, boxShadow: "var(--shadow-card)" }}>
          <span style={{ color: "var(--text-secondary)" }}>가장 늦은 등교</span>
          <span style={{ color: "var(--accent-red)" }}>{formatTime(stats.latestCheckIn)}</span>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <TabBar active="stats" onSelect={onTabChange} />
    </div>
  );
}
