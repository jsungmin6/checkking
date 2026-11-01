import { useEffect, useRef, useState } from "react";
import { showTossRewardedAd, reportAdLoadFailed } from "../utils/tossRewardedAd";
import TossBannerAd, { BANNER_AD_GROUPS } from "./TossBannerAd";
import { newLotteryDrawId, scratchAttendanceLottery } from "../utils/tossPromotion";

const TICKET_PRICE = 5_000;
const ATTENDANCE_LOTTERY_AD_GROUP_ID = "ait.v2.live.320548a2f8304a56";


interface ScratchSurfaceProps {
  onComplete: () => void;
}

function ScratchSurface({ onComplete }: ScratchSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratchingRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.scale(ratio, ratio);
    context.fillStyle = "#aab6cb";
    context.fillRect(0, 0, bounds.width, bounds.height);
    context.strokeStyle = "rgba(255,255,255,.23)";
    context.lineWidth = 8;
    for (let x = -bounds.height; x < bounds.width + bounds.height; x += 22) {
      context.beginPath();
      context.moveTo(x, bounds.height);
      context.lineTo(x + bounds.height, 0);
      context.stroke();
    }
    context.fillStyle = "#fff";
    context.font = "800 68px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("?", bounds.width / 2, bounds.height / 2 - 5);
    context.fillStyle = "rgba(255,255,255,.9)";
    context.font = "700 12px sans-serif";
    context.fillText("긁어서 확인", bounds.width / 2, bounds.height - 18);
    context.globalCompositeOperation = "destination-out";

    const erase = (event: PointerEvent) => {
      if (!scratchingRef.current || completedRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      context.beginPath();
      context.arc(x, y, 19, 0, Math.PI * 2);
      context.fill();

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      let sampled = 0;
      const step = 24 * 4;
      for (let index = 3; index < pixels.length; index += step) {
        sampled += 1;
        if ((pixels[index] ?? 255) < 40) transparent += 1;
      }
      if (sampled > 0 && transparent / sampled >= 0.48) {
        completedRef.current = true;
        onComplete();
      }
    };
    const start = (event: PointerEvent) => {
      scratchingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
      erase(event);
    };
    const stop = () => { scratchingRef.current = false; };

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", erase);
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    return () => {
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", erase);
      canvas.removeEventListener("pointerup", stop);
      canvas.removeEventListener("pointercancel", stop);
    };
  }, [onComplete]);

  return <canvas ref={canvasRef} className="attendance-lottery-scratch-surface" aria-label="복권을 손가락으로 긁어 확인하세요" />;
}

interface AttendanceLotteryModalProps {
  totalPoints: number;
  /** 서버가 잔액을 바꿨을 때 화면을 다시 읽게 한다. */
  onPointsChanged: () => void;
  onClose: () => void;
}

type Step = "ready" | "watchingAd" | "scratch" | "granting" | "result";

export default function AttendanceLotteryModal({ totalPoints, onPointsChanged, onClose }: AttendanceLotteryModalProps) {
  const [step, setStep] = useState<Step>("ready");
  const [prize, setPrize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // 이 시도의 멱등 키. 긁기 호출이 재시도돼도 차감·지급이 한 번만 일어난다.
  const drawIdRef = useRef<string | null>(null);

  // 긁기 전에 닫으면 아무 일도 없다 — 차감도 추첨도 긁는 순간에 일어난다.
  const close = () => onClose();

  /** 광고를 보면 긁기 화면으로 넘어간다. 아직 차감도 추첨도 하지 않는다. */
  const handlePurchase = async () => {
    setError(null);
    if (totalPoints < TICKET_PRICE) {
      setError("출석점수가 부족해요.");
      return;
    }

    setStep("watchingAd");
    let watched: boolean;
    try {
      watched = await showTossRewardedAd(ATTENDANCE_LOTTERY_AD_GROUP_ID, "ATTENDANCE_LOTTERY");
    } catch (adError) {
      reportAdLoadFailed(
        ATTENDANCE_LOTTERY_AD_GROUP_ID,
        adError instanceof Error ? adError.message : "unknown_error",
      );
      setStep("ready");
      setError("광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!watched) {
      setStep("ready");
      setError("광고를 끝까지 봐야 복권을 긁을 수 있어요.");
      return;
    }
    drawIdRef.current = newLotteryDrawId();
    setStep("scratch");
  };

  /**
   * 다 긁은 순간 서버 한 번 호출로 차감·추첨·지급이 끝난다.
   * 금액은 이때 처음 내려오므로, 긁는 동안에는 보여줄 숫자가 없다(물음표를 보여준다).
   */
  const handleScratchComplete = async () => {
    const drawId = drawIdRef.current;
    if (!drawId) return;

    setStep("granting");
    try {
      const result = await scratchAttendanceLottery(drawId);
      setPrize(result.amountWon);
      setStep("result");
    } catch (scratchError) {
      // 지급이 실패하면 차감한 점수를 되돌려준다 — 돈도 점수도 잃으면 안 된다.
      setStep("ready");
      setError(scratchError instanceof Error
        ? scratchError.message
        : "복권을 긁지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      onPointsChanged();
    }
  };

  return (
    <div className="attendance-gift-overlay" onClick={() => { if (step !== "watchingAd" && step !== "granting") close(); }}>
      <section
        className="attendance-gift-dialog attendance-lottery-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="출석복권"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="attendance-gift-close" onClick={close} aria-label="닫기" disabled={step === "watchingAd" || step === "granting"}>×</button>
        {step === "ready" || step === "watchingAd" ? (
          <>
            <h2 className="attendance-gift-title">출석복권</h2>
            <div className="attendance-gift-rank attendance-lottery-description">
              출석점수 {TICKET_PRICE.toLocaleString()}점으로 복권 1장을 구매할 수 있어요.<br />
              당첨된 토스포인트는 <strong>1P가 현금 1원</strong>의 가치예요.
            </div>
            <div className="attendance-lottery-ticket attendance-lottery-prize-range">
              <span>최대 당첨 금액</span>
              <strong>1,000원</strong>
              <span>1,000 토스포인트</span>
            </div>
            <div className="attendance-lottery-balance">보유 출석점수 {totalPoints.toLocaleString()}점</div>
            {error && <div className="attendance-lottery-error">{error}</div>}
            <button
              className="attendance-gift-confirm"
              disabled={totalPoints < TICKET_PRICE || step === "watchingAd"}
              onClick={() => { void handlePurchase(); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {step === "watchingAd" && <span className="ad-loading-spinner" aria-hidden="true" />}
              {step === "watchingAd"
                ? "광고 불러오는 중"
                : `광고 보고 ${TICKET_PRICE.toLocaleString()}점으로 복권 긁기`}
            </button>
            {totalPoints < TICKET_PRICE && <p className="attendance-lottery-hint">{TICKET_PRICE.toLocaleString()}점부터 구매할 수 있어요.</p>}
            {/* 프로모션 고지 — 지급 시점·조건·제한·중단 가능성. 빠지면 심사에서 반려된다. */}
            <p className="promotion-notice">
              당첨된 토스포인트는 긁는 즉시 들어와요. 부정한 방법으로 참여하면 지급되지 않고,
              이 이벤트는 사전 안내 없이 중단될 수 있어요.
            </p>
            {/* 구매 버튼 아래. 긁는 중에는 띄우지 않는다 — 결과에서 시선을 뺏으면 안 된다. */}
            <TossBannerAd
              adGroupId={BANNER_AD_GROUPS.text}
              variant="card"
              className="attendance-lottery-ad"
            />
          </>
        ) : (
          <>
            <h2 className="attendance-gift-title">복권을 긁어보세요</h2>
            <div className="attendance-gift-rank">출석점수 {TICKET_PRICE.toLocaleString()}점을 사용했어요.</div>
            <div className={`attendance-lottery-ticket attendance-lottery-scratch-ticket${step === "result" ? " is-revealed" : ""}`}>
              <div className="attendance-lottery-ticket-side" aria-hidden="true">
                <span>✦</span><span>★</span><span>✦</span>
              </div>
              <div className="attendance-lottery-ticket-body">
                <div className="attendance-lottery-ticket-heading">
                  <span>출석왕 행운 복권</span>
                  <strong>LUCKY TICKET</strong>
                </div>
                <div className="attendance-lottery-scratch-area">
                  <div className="attendance-lottery-prize-underlay">
                    {step === "result" ? (
                      <>
                        <span>당첨!</span>
                        <strong>{prize.toLocaleString()}P</strong>
                        <small>현금 가치 {prize.toLocaleString()}원</small>
                      </>
                    ) : step === "granting" ? (
                      <>
                        <span>토스포인트 지급 중</span>
                        <strong>...</strong>
                        <small>잠시만 기다려 주세요</small>
                      </>
                    ) : (
                      <>
                        <span>토스포인트 당첨 확인</span>
                        <strong>?</strong>
                        <small>긁어서 확인하세요</small>
                      </>
                    )}
                  </div>
                  {step === "scratch" && <ScratchSurface onComplete={() => { void handleScratchComplete(); }} />}
                </div>
              </div>
            </div>
            {step === "result" && error && <div className="attendance-lottery-error">{error}</div>}
            {step === "result" && <button className="attendance-gift-confirm" onClick={close}>확인</button>}
          </>
        )}
      </section>
    </div>
  );
}
