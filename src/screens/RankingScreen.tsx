import { useState, useEffect } from "react";
import { hideAdBanner } from "../utils/admob";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import { api } from "../utils/api";
import { isTossApp } from "../utils/platform";
import { showTossRewardedAd } from "../utils/tossRewardedAd";
import type { TabName } from "../components/TabBar";
import type { MonthlyRanking, User } from "../types";

const RANKING_AD_GROUP_ID = "ait.v2.live.320548a2f8304a56";

interface RankingScreenProps {
  classroomId: number;
  user: User;
  onTabChange: (tab: TabName) => void;
  onBack: () => void;
}

export default function RankingScreen({ classroomId, user, onTabChange, onBack }: RankingScreenProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [week, setWeek] = useState(1);
  const [data, setData] = useState<MonthlyRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => { hideAdBanner();
    setShowMore(false);
    setAdError(null);
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

  const top3 = data?.rankings.slice(0, 3) ?? [];
  const rest = data?.rankings.slice(3) ?? [];

  const handleShowMore = async () => {
    if (adLoading) return;
    setAdLoading(true);
    setAdError(null);
    try {
      const rewarded = await showTossRewardedAd(RANKING_AD_GROUP_ID);
      if (rewarded) setShowMore(true);
      else setAdError("광고를 끝까지 시청하면 나머지 순위를 볼 수 있어요.");
    } catch (e) {
      setAdError(e instanceof Error ? e.message : "광고를 재생하지 못했습니다.");
    } finally {
      setAdLoading(false);
    }
  };

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
          {top3.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginTop: 12, marginBottom: 16, padding: "0 16px" }}>
              {top3[1] && (
                <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "14px 18px", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
                  <div style={{ fontSize: 10, color: "var(--accent-silver)" }}>2nd</div>
                  <div style={{ fontSize: 20 }}>🥈</div>
                  <div style={{ fontSize: 12 }}>{top3[1].nickname}</div>
                </div>
              )}
              {top3[0] && (
                <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "18px 22px", borderRadius: "var(--radius-card)", border: "1px solid var(--accent-gold)", boxShadow: "var(--shadow-card)" }}>
                  <div style={{ fontSize: 10, color: "var(--accent-gold)" }}>1st</div>
                  <div style={{ fontSize: 24 }}>🏆</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{top3[0].nickname}</div>
                </div>
              )}
              {top3[2] && (
                <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "14px 18px", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
                  <div style={{ fontSize: 10, color: "var(--accent-bronze)" }}>3rd</div>
                  <div style={{ fontSize: 20 }}>🥉</div>
                  <div style={{ fontSize: 12 }}>{top3[2].nickname}</div>
                </div>
              )}
            </div>
          )}
          {isTossApp() && rest.length > 0 && !showMore && (
            <div style={{ padding: "0 16px 12px" }}>
              <button onClick={() => void handleShowMore()} disabled={adLoading} style={{
                width: "100%", padding: 13, borderRadius: "var(--radius-button)",
                background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 600,
                opacity: adLoading ? 0.6 : 1,
              }}>{adLoading ? "광고 준비 중..." : "광고 보고 4위 이후 보기"}</button>
              {adError && <div style={{ marginTop: 8, color: "var(--accent-red)", fontSize: 12, textAlign: "center" }}>{adError}</div>}
            </div>
          )}
          <div style={{ flex: 1, padding: "0 16px", overflow: "auto" }}>
            {(isTossApp() && !showMore ? [] : rest).map((r) => {
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
