import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { avatarEmojiSrc } from "../utils/emoji";
import { formatTime } from "../utils/time";
import type { PersonalStats } from "../types";

interface Props {
  classroomId: number;
  userId: number;
  nickname: string;
  isOwner: boolean;
  isMe: boolean;
  onClose: () => void;
  /** 내가 아닐 때만 "신고/차단" 링크를 보여준다. 없으면 링크 자체를 숨긴다. */
  onReportOrBlock?: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: "12px 8px", borderRadius: 12,
      background: "var(--bg-secondary)", textAlign: "center",
    }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function MemberProfileModal({ classroomId, userId, nickname, isOwner, isMe, onClose, onReportOrBlock }: Props) {
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<PersonalStats>(`/classrooms/${classroomId}/statistics/members/${userId}`)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [classroomId, userId]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(0, 0, 0, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${nickname} 프로필`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 320, background: "var(--bg-card)",
          borderRadius: 20, padding: "24px 20px 16px", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute", top: 12, right: 14, background: "none", border: "none",
            fontSize: 22, lineHeight: 1, color: "var(--text-muted)", cursor: "pointer",
          }}
        >
          ×
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 76, height: 76, borderRadius: "50%", background: "var(--bg-secondary)",
            overflow: "hidden", padding: 6, boxSizing: "border-box",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src={avatarEmojiSrc(userId, stats?.avatarIndex)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{nickname}</span>
            {isMe && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>(나)</span>}
            {isOwner && (
              <span style={{ background: "#FFF4E5", color: "#C76A00", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                방장
              </span>
            )}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {failed ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, padding: "16px 0" }}>
              기록을 불러오지 못했어요
            </div>
          ) : !stats ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, padding: "16px 0" }}>
              불러오는 중...
            </div>
          ) : stats.totalPresent === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, padding: "16px 0" }}>
              아직 이 방에서 출석한 기록이 없어요
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <Stat label="출석" value={`${stats.totalPresent}일`} />
                <Stat label="연속 출석" value={`${stats.currentStreak}일`} />
                <Stat label="1등" value={`${stats.firstPlaceCount}번`} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {/* 서버가 나눗셈 결과를 그대로 주면 3.19999... 처럼 찍힌다. */}
                <Stat label="평균 등수" value={`${stats.avgRank.toFixed(1)}등`} />
                <Stat label="보통 오는 시각" value={formatTime(stats.avgCheckInTime)} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
                가장 빨랐던 날 {formatTime(stats.earliestCheckIn)}
              </div>
            </>
          )}
        </div>

        {!isMe && onReportOrBlock && (
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <span onClick={onReportOrBlock} style={{ color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
              신고하기 · 차단하기
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
