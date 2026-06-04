import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import type { MonthlyAttendanceRecord } from "../types";

interface AttendanceCalendarProps {
  classroomId: number;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AttendanceCalendar({ classroomId }: AttendanceCalendarProps) {
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

  const attendanceMap = useMemo(() => {
    const map = new Map<string, MonthlyAttendanceRecord>();
    for (const r of records) {
      map.set(r.checkInDate, r);
    }
    return map;
  }, [records]);

  const goPrev = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goNext = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === todayStr;
  };

  const isPast = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr < todayStr;
  };

  const getRecord = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return attendanceMap.get(dateStr);
  };

  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        margin: "8px 16px",
        padding: "16px",
      }}
    >
      {/* Month header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button
          onClick={goPrev}
          style={{
            background: "none",
            fontSize: 18,
            color: "var(--text-secondary)",
            padding: "4px 8px",
          }}
        >
          &lsaquo;
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
          {year === today.getFullYear() ? `${month}월` : `${year}년 ${month}월`}
        </span>
        <button
          onClick={goNext}
          style={{
            background: "none",
            fontSize: 18,
            color: "var(--text-secondary)",
            padding: "4px 8px",
          }}
        >
          &rsaquo;
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, marginBottom: 8 }}>
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 600,
              color:
                i === 0
                  ? "var(--accent-red)"
                  : i === 6
                    ? "var(--accent-blue)"
                    : "var(--text-secondary)",
              paddingBottom: 4,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ minHeight: 52 }} />;
          }

          const record = getRecord(day);
          const todayFlag = isToday(day);
          const pastFlag = isPast(day);
          const dow = idx % 7; // 0=Sun, 6=Sat
          const attended = !!record;

          // Day number color
          let dayColor = "var(--text-primary)";
          if (dow === 0) dayColor = "var(--accent-red)";
          else if (dow === 6) dayColor = "var(--accent-blue)";
          if (!pastFlag && !todayFlag) dayColor = "var(--text-muted)";

          // Circle background
          let circleBg = "transparent";
          if (attended) circleBg = "var(--accent-green)";
          else if (pastFlag) circleBg = "#E5E8EB";

          return (
            <div
              key={day}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "4px 0",
                minHeight: 52,
                position: "relative",
              }}
            >
              {attended && record!.dailyRank === 1 && (
                <div style={{
                  position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
                  fontSize: 10, lineHeight: 1, color: "var(--accent-gold)",
                }}>👑</div>
              )}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: circleBg,
                  color: attended ? "#fff" : dayColor,
                  fontSize: 13,
                  fontWeight: todayFlag ? 700 : 500,
                  boxShadow: todayFlag
                    ? "inset 0 0 0 2px var(--accent-blue)"
                    : "none",
                }}
              >
                {day}
              </div>
              {attended && (
                <span style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1 }}>
                  {record!.checkInTime}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "8px 0 0",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          불러오는 중...
        </div>
      )}
    </div>
  );
}
