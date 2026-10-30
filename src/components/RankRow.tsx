import { formatTime } from "../utils/time";

interface RankRowProps {
  rank: number;
  nickname: string;
  checkInTime: string;
  isMe: boolean;
  isOwner?: boolean;
}

function getRankColor(rank: number): string {
  if (rank === 1) return "var(--accent-gold)";
  if (rank === 2) return "var(--accent-silver)";
  if (rank === 3) return "var(--accent-bronze)";
  return "var(--text-secondary)";
}

export default function RankRow({ rank, nickname, checkInTime, isMe, isOwner = false }: RankRowProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: 14,
      background: isMe ? "var(--bg-card-highlight)" : "var(--bg-card)",
      borderRadius: "var(--radius-card)", marginBottom: 8, fontSize: 14,
      border: isMe ? "1px solid var(--accent-blue)" : "none",
      boxShadow: "var(--shadow-card)",
    }}>
      <span style={{ width: 28, fontWeight: 700, color: getRankColor(rank) }}>{rank}</span>
      <span style={{ fontWeight: isMe ? 600 : 400, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isMe ? `나 (${nickname})` : nickname}
      </span>
      {isOwner && (
        <span style={{ flexShrink: 0, marginLeft: 5, color: "var(--text-muted)", fontSize: 12 }}>(방장)</span>
      )}
      <span style={{ marginLeft: "auto", color: isMe ? "var(--accent-blue)" : "var(--text-secondary)", fontSize: 13 }}>
        {formatTime(checkInTime)}
      </span>
    </div>
  );
}
