import { formatTime } from "../utils/time";

interface RankRowProps {
  rank: number;
  nickname: string;
  checkInTime: string;
  isMe: boolean;
}

function getRankColor(rank: number): string {
  if (rank === 1) return "var(--accent-gold)";
  if (rank === 2) return "var(--accent-silver)";
  if (rank === 3) return "var(--accent-bronze)";
  return "var(--text-secondary)";
}

export default function RankRow({ rank, nickname, checkInTime, isMe }: RankRowProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: 10,
      background: isMe ? "var(--bg-card-highlight)" : "var(--bg-card)",
      borderRadius: 8, marginBottom: 4, fontSize: 14,
      border: isMe ? "1px solid var(--accent-blue)" : "none",
      boxShadow: "var(--shadow-card)",
    }}>
      <span style={{ width: 28, fontWeight: 700, color: getRankColor(rank) }}>{rank}</span>
      <span style={{ fontWeight: isMe ? 600 : 400 }}>{isMe ? `나 (${nickname})` : nickname}</span>
      <span style={{ marginLeft: "auto", color: isMe ? "var(--accent-blue)" : "var(--text-secondary)", fontSize: 13 }}>
        {formatTime(checkInTime)}
      </span>
    </div>
  );
}
