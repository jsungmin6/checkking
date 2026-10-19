import { useState } from "react";
import { grantTossPromotionReward, POINTS_PROMOTION_CODE_TEST, PROMOTION_DAILY_CAP_WON } from "../utils/tossPromotion";
import { POINTS_TO_WON_RATE } from "../hooks/useAttendancePoints";

interface ConvertPointsModalProps {
  totalPoints: number;
  onClose: () => void;
  onConverted: (convertedCoins: number) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_TOSS_APP: "토스 앱에서만 전환할 수 있어요",
  UNSUPPORTED_VERSION: "토스 앱을 최신 버전으로 업데이트해주세요",
};

export default function ConvertPointsModal({ totalPoints, onClose, onConverted }: ConvertPointsModalProps) {
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxWon = PROMOTION_DAILY_CAP_WON;
  const convertibleWon = Math.min(Math.floor(totalPoints / POINTS_TO_WON_RATE), maxWon);
  const convertibleCoins = convertibleWon * POINTS_TO_WON_RATE;
  const remainderCoins = totalPoints - convertibleCoins;

  const handleGrant = async () => {
    setGranting(true);
    setError(null);
    const result = await grantTossPromotionReward(POINTS_PROMOTION_CODE_TEST, convertibleWon);
    setGranting(false);
    if (result.ok) {
      onConverted(convertibleCoins);
    } else {
      setError(ERROR_MESSAGES[result.code] ?? `전환에 실패했어요 (${result.code})`);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 340, background: "var(--bg-card)", borderRadius: 20,
        padding: "24px 22px 22px", textAlign: "center",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>토스 포인트로 바꾸기</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
          출석 포인트 {POINTS_TO_WON_RATE.toLocaleString()}P는 토스 포인트 1P(1원)이 돼요<br />
          (하루 최대 {maxWon}P까지 전환 가능)
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "16px 12px", borderRadius: 14, background: "var(--bg-secondary)", marginBottom: 12,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>출석 포인트</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{convertibleCoins.toLocaleString()}P</div>
          </div>
          <div style={{ fontSize: 18, color: "var(--text-secondary)" }}>→</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>토스 포인트</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-blue)" }}>{convertibleWon.toLocaleString()}P</div>
          </div>
        </div>

        {remainderCoins > 0 && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
            남은 {remainderCoins.toLocaleString()}P는 출석 포인트로 계속 쌓여요
          </div>
        )}

        {error && <div style={{ color: "var(--accent-red)", fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <button onClick={handleGrant} disabled={granting || convertibleWon <= 0} style={{
          width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
          background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: granting ? "default" : "pointer", opacity: granting || convertibleWon <= 0 ? 0.6 : 1, marginBottom: 8,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {granting && (
            <span style={{
              display: "inline-block", width: 16, height: 16, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
              animation: "spin 0.8s linear infinite",
            }} />
          )}
          {granting ? "포인트 받는 중" : "토스 포인트 받기"}
        </button>
        <button onClick={onClose} style={{
          width: "100%", padding: 12, borderRadius: "var(--radius-button)", border: "none",
          background: "transparent", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer",
        }}>
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
