import { useState, useEffect } from "react";
import TabBar from "../components/TabBar";
import { api } from "../utils/api";
import type { TabName } from "../components/TabBar";
import type { MonthlyRanking, User } from "../types";

interface RankingScreenProps {
  classroomId: number;
  user: User;
  onTabChange: (tab: TabName) => void;
}

export default function RankingScreen({ classroomId, user, onTabChange }: RankingScreenProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MonthlyRanking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<MonthlyRanking>(`/classrooms/${classroomId}/statistics/ranking?period=MONTHLY&year=${year}&month=${month}&criteria=AVG_RANK`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [classroomId, year, month]);

  const prevMonth = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); };

  const top3 = data?.rankings.slice(0, 3) ?? [];
  const rest = data?.rankings.slice(3) ?? [];

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span onClick={prevMonth} style={{ color: "var(--text-secondary)", cursor: "pointer" }}>◀</span>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{year}년 {month}월</span>
        <span onClick={nextMonth} style={{ color: "var(--text-secondary)", cursor: "pointer" }}>▶</span>
      </div>
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>불러오는 중...</span>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginBottom: 16, padding: "0 16px" }}>
              {top3[1] && (
                <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "12px 16px", borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--accent-silver)" }}>2nd</div>
                  <div style={{ fontSize: 20 }}>🥈</div>
                  <div style={{ fontSize: 12 }}>{top3[1].nickname}</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{top3[1].avgRank}위</div>
                </div>
              )}
              {top3[0] && (
                <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "16px 20px", borderRadius: 12, border: "1px solid var(--accent-gold)" }}>
                  <div style={{ fontSize: 10, color: "var(--accent-gold)" }}>1st</div>
                  <div style={{ fontSize: 24 }}>🏆</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{top3[0].nickname}</div>
                  <div style={{ fontSize: 10, color: "var(--accent-gold)" }}>{top3[0].avgRank}위</div>
                </div>
              )}
              {top3[2] && (
                <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "12px 16px", borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--accent-bronze)" }}>3rd</div>
                  <div style={{ fontSize: 20 }}>🥉</div>
                  <div style={{ fontSize: 12 }}>{top3[2].nickname}</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{top3[2].avgRank}위</div>
                </div>
              )}
            </div>
          )}
          <div style={{ flex: 1, padding: "0 16px", overflow: "auto" }}>
            {rest.map((r) => {
              const isMe = r.userId === user.userId;
              return (
                <div key={r.userId} style={{
                  display: "flex", alignItems: "center", padding: 10,
                  background: isMe ? "var(--bg-card-highlight)" : "var(--bg-card)",
                  borderRadius: 8, marginBottom: 4, fontSize: 14,
                  border: isMe ? "1px solid var(--accent-blue)" : "none",
                }}>
                  <span style={{ width: 28, color: "var(--text-secondary)" }}>{r.rank}</span>
                  <span style={{ fontWeight: isMe ? 600 : 400 }}>{isMe ? "나" : r.nickname}</span>
                  <span style={{ marginLeft: "auto", color: isMe ? "var(--accent-blue)" : "var(--text-secondary)", fontSize: 12 }}>
                    평균 {r.avgRank}위 · {r.totalPresent}/{r.totalDays}일
                  </span>
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
