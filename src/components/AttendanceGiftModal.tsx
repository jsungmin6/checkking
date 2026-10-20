import { useState } from "react";
import GiftBox from "./GiftBox";

interface AttendanceGiftModalProps {
  rank: number;
  rankBonus: number | null;
  onClaimGift: () => number | null;
  onClose: (total: number) => void;
}

export default function AttendanceGiftModal({ rank, rankBonus, onClaimGift, onClose }: AttendanceGiftModalProps) {
  const [result, setResult] = useState<{ gift: number | null; total: number } | null>(null);

  const handleOpened = () => {
    const gift = onClaimGift();
    const total = (gift ?? 0) + (rankBonus ?? 0);
    setResult({ gift, total });
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 340, background: "var(--bg-card)", borderRadius: 20,
        padding: "24px 22px 22px", textAlign: "center",
      }}>
        {result === null ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
              {rank <= 3 ? `오늘 ${rank}등이에요!` : "출석 완료!"}
            </div>
            <GiftBox onOpened={handleOpened} />
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>출석 선물이 도착했어요!</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "var(--bg-secondary)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>출석 선물</span>
                {result.gift !== null ? (
                  <span style={{ fontSize: 14, fontWeight: 700 }}>+{result.gift.toLocaleString()}P</span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>오늘 받을 수 있는 선물을 모두 받았어요</span>
                )}
              </div>
              {rankBonus !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "var(--bg-secondary)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{rank}등 보너스</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>+{rankBonus.toLocaleString()}P</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>총 지급 포인트</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 20 }}>
              +{result.total.toLocaleString()}P
            </div>

            <button onClick={() => onClose(result.total)} style={{
              width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>
              확인
            </button>
          </>
        )}
      </div>
    </div>
  );
}
