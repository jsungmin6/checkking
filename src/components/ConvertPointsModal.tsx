import { useState } from "react";
import { grantTossPromotionReward, POINTS_PROMOTION_CODE_REAL, PROMOTION_DAILY_CAP_WON } from "../utils/tossPromotion";
import { showTossRewardedAd, reportAdLoadFailed } from "../utils/tossRewardedAd";
import { POINTS_TO_WON_RATE } from "../hooks/useAttendancePoints";

// 기존 "출석왕_랭킹보기_리워드" 광고 그룹 재사용 — 이 광고를 끝까지 봐야 포인트교환 프로모션 지급을 요청한다.
const CONVERT_POINTS_AD_GROUP_ID = "ait.v2.live.320548a2f8304a56";
const AD_LOAD_TIMEOUT_MS = 30000;

interface ConvertPointsModalProps {
  totalPoints: number;
  onClose: () => void;
  onConverted: (convertedCoins: number) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_TOSS_APP: "토스 앱에서만 전환할 수 있어요",
  UNSUPPORTED_VERSION: "토스 앱을 최신 버전으로 업데이트해주세요",
};

type Step = "idle" | "watchingAd" | "granting";

export default function ConvertPointsModal({ totalPoints, onClose, onConverted }: ConvertPointsModalProps) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const maxWon = PROMOTION_DAILY_CAP_WON;
  const convertibleWon = Math.min(Math.floor(totalPoints / POINTS_TO_WON_RATE), maxWon);
  const convertibleCoins = convertibleWon * POINTS_TO_WON_RATE;
  const remainderCoins = totalPoints - convertibleCoins;

  const handleConvert = async () => {
    setError(null);

    // 1단계: 리워드 광고 시청
    setStep("watchingAd");
    let watched: boolean | "timeout";
    try {
      const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), AD_LOAD_TIMEOUT_MS));
      watched = await Promise.race([showTossRewardedAd(CONVERT_POINTS_AD_GROUP_ID), timeout]);
    } catch (adError) {
      setStep("idle");
      reportAdLoadFailed(CONVERT_POINTS_AD_GROUP_ID, adError instanceof Error ? adError.message : "unknown_error");
      setError("광고 불러오기가 실패했어요. 다음에 시도해주세요");
      return;
    }
    if (watched === "timeout") {
      setStep("idle");
      reportAdLoadFailed(CONVERT_POINTS_AD_GROUP_ID, "timeout_30s");
      setError("광고 불러오기가 실패했어요. 다음에 시도해주세요");
      return;
    }
    if (!watched) {
      setStep("idle");
      setError("광고를 끝까지 봐야 포인트를 받을 수 있어요");
      return;
    }

    // 2단계: 광고 시청 완료 — 실제 포인트교환 프로모션으로 지급 요청
    setStep("granting");
    const result = await grantTossPromotionReward(POINTS_PROMOTION_CODE_REAL, convertibleWon);
    setStep("idle");
    if (result.ok) {
      onConverted(convertibleCoins);
    } else {
      setError(ERROR_MESSAGES[result.code] ?? `전환에 실패했어요 (${result.code})`);
    }
  };

  const busy = step !== "idle";
  const buttonLabel = step === "watchingAd" ? "광고 불러오는 중" : step === "granting" ? "포인트 받는 중" : "광고 보고 바꾸기";

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

        <button onClick={handleConvert} disabled={busy || convertibleWon <= 0} style={{
          width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
          background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: busy ? "default" : "pointer", opacity: busy || convertibleWon <= 0 ? 0.6 : 1, marginBottom: 8,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {busy && (
            <span style={{
              display: "inline-block", width: 16, height: 16, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
              animation: "spin 0.8s linear infinite",
            }} />
          )}
          {buttonLabel}
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
