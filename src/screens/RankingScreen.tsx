import { useState, useEffect } from "react";
import { hideAdBanner } from "../utils/admob";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import { api } from "../utils/api";
import { getWeekOfMonth } from "../utils/time";
import type { TabName } from "../components/TabBar";
import type { MonthlyRanking, User } from "../types";

interface RankingScreenProps {
  classroomId: number;
  user: User;
  onTabChange: (tab: TabName) => void;
  onBack: () => void;
}

function PodiumPillar({ place }: { place: number }) {
  const palette = place === 1
    ? { front: ["#FFF2C8", "#FFE6A6", "#FFDB82"], side: "#F2C66B", top: "#FFF6D9", shine: "#FFFFFF" }
    : place === 2
      ? { front: ["#EAF1FA", "#D8E3F1", "#C7D5E8"], side: "#B5C6DC", top: "#F4F8FD", shine: "#FFFFFF" }
      : { front: ["#FFE7DB", "#F9D2C1", "#F2BEA5"], side: "#E6AA8E", top: "#FFF0E8", shine: "#FFFFFF" };
  const gradientId = `podium-front-${place}`;
  return (
    <svg className="ranking-podium-art" viewBox="0 38 120 162" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={palette.front[0]} />
          <stop offset=".55" stopColor={palette.front[1]} />
          <stop offset="1" stopColor={palette.front[2]} />
        </linearGradient>
        <linearGradient id={`podium-shine-${place}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={palette.shine} stopOpacity=".76" />
          <stop offset="1" stopColor={palette.shine} stopOpacity="0" />
        </linearGradient>
        <filter id={`podium-shadow-${place}`} x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <ellipse cx="60" cy="193" rx="48" ry="6" fill="#71839B" opacity=".15" filter={`url(#podium-shadow-${place})`} />
      <path d="M91 45 Q105 47 105 62 V193 H91 Z" fill={palette.side} opacity=".82" />
      <path d="M15 62 Q15 43 34 43 H87 Q101 43 101 61 V193 H15 Z" fill={`url(#${gradientId})`} />
      <path d="M15 61 Q15 43 34 43 H87 Q101 43 101 61 Q99 75 59 75 Q18 75 15 61Z" fill={palette.top} />
      <path d="M22 60 Q22 51 34 50 H82 Q91 50 94 58" stroke="#FFF" strokeOpacity=".78" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M21 80 V178" stroke={`url(#podium-shine-${place})`} strokeWidth="7" strokeLinecap="round" opacity=".58" />
      <path d="M28 188 H89" stroke="#FFF" strokeOpacity=".32" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function RankingScreen({ classroomId, user, onTabChange, onBack }: RankingScreenProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [week, setWeek] = useState(() => getWeekOfMonth(now.getFullYear(), now.getMonth() + 1, now.getDate()));
  const [data, setData] = useState<MonthlyRanking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { hideAdBanner();
    setLoading(true);
    const params = new URLSearchParams({
      period,
      year: String(year),
      month: String(month),
      criteria: "AVG_RANK",
    });
    if (period === "WEEKLY") params.set("week", String(week));

    api<MonthlyRanking>(`/classrooms/${classroomId}/statistics/ranking?${params}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [classroomId, year, month, period, week]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
    setWeek(1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
    setWeek(1);
  };

  const prevWeek = () => { if (week > 1) setWeek(week - 1); };
  const nextWeek = () => setWeek(week + 1);

  const hasPodium = (data?.rankings.length ?? 0) > 0;

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 0",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    background: active ? "var(--accent-blue)" : "transparent",
    color: active ? "#fff" : "var(--text-secondary)",
    border: active ? "none" : "1px solid var(--border-light)",
    transition: "all 0.15s",
  });

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BackHeader title="랭킹" onBack={onBack} />

      {/* Period toggle */}
      <div style={{ display: "flex", gap: 6, padding: "8px 16px 0" }}>
        <button onClick={() => setPeriod("WEEKLY")} style={toggleBtnStyle(period === "WEEKLY")}>주간</button>
        <button onClick={() => setPeriod("MONTHLY")} style={toggleBtnStyle(period === "MONTHLY")}>월간</button>
      </div>

      {/* Month navigation */}
      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span onClick={prevMonth} style={{ color: "var(--text-secondary)", cursor: "pointer" }}>◀</span>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{year}년 {month}월</span>
        <span onClick={nextMonth} style={{ color: "var(--text-secondary)", cursor: "pointer" }}>▶</span>
      </div>

      {/* Week navigation (only for WEEKLY) */}
      {period === "WEEKLY" && (
        <div style={{ padding: "8px 16px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span onClick={prevWeek} style={{ color: week > 1 ? "var(--text-secondary)" : "var(--border-light)", cursor: week > 1 ? "pointer" : "default" }}>◀</span>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{week}주차</span>
          <span onClick={nextWeek} style={{ color: "var(--text-secondary)", cursor: "pointer" }}>▶</span>
        </div>
      )}

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>불러오는 중...</span>
        </div>
      ) : (
        <>
          {hasPodium && (
            <section className="ranking-podium" aria-label="시상대">
              {[2, 1, 3].map((place) => (
                <div className={`ranking-podium-slot place-${place}`} key={place}>
                  <span className="ranking-podium-name">
                    {(data?.rankings.find((entry) => Number(entry.rank) === place) ?? data?.rankings[place - 1])?.nickname ?? ""}
                  </span>
                  <div className="ranking-podium-block">
                    <PodiumPillar place={place} />
                    <span>{place}</span>
                    {place === 1 && (
                      <span className="ranking-podium-crown-wrap" aria-hidden="true">
                        <img className="ranking-podium-crown" src="/ranking/crown.svg" alt="" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
          <div style={{ flex: 1, padding: "0 16px", overflow: "auto" }}>
            {data?.rankings.filter((r) => Number(r.rank) > 3).map((r) => {
              const isMe = r.userId === user.userId;
              return (
                <div key={r.userId} style={{
                  display: "flex", alignItems: "center", padding: 14,
                  background: isMe ? "var(--bg-card-highlight)" : "var(--bg-card)",
                  borderRadius: "var(--radius-card)", marginBottom: 8, fontSize: 14,
                  border: isMe ? "1px solid var(--accent-blue)" : "none",
                  boxShadow: "var(--shadow-card)",
                }}>
                  <span style={{ width: 28, color: "var(--text-secondary)" }}>{r.rank}</span>
                  <span style={{ fontWeight: isMe ? 600 : 400 }}>{isMe ? "나" : r.nickname}</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>평균 {Number(r.avgRank).toFixed(1)}위</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      <TabBar active="ranking" onSelect={onTabChange} />
    </div>
  );
}
