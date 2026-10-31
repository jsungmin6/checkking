import { useState } from "react";
import { reportAdLoadFailed, showTossRewardedAd } from "../../utils/tossRewardedAd";

const CLOVER_CONTINUE_AD_GROUP_ID = "ait.v2.live.320548a2f8304a56";

interface Props {
  onClose: () => void;
  onRewarded: () => void;
}

export default function CloverContinueModal({ onClose, onRewarded }: Props) {
  const [watchingAd, setWatchingAd] = useState(false);
  const [error, setError] = useState("");

  const handleWatch = async () => {
    if (watchingAd) return;
    setError("");
    setWatchingAd(true);
    try {
      const watched = await showTossRewardedAd(CLOVER_CONTINUE_AD_GROUP_ID, "CLOVER_CONTINUE");
      if (!watched) {
        setError("광고를 끝까지 시청하면 5판 더 할 수 있어요.");
        return;
      }
      onRewarded();
    } catch (adError) {
      reportAdLoadFailed(CLOVER_CONTINUE_AD_GROUP_ID, adError instanceof Error ? adError.message : "unknown_error");
      setError("광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setWatchingAd(false);
    }
  };

  return (
    <div className="onboarding-overlay clover-continue-overlay">
      <section className="onboarding-dialog clover-continue-dialog" role="dialog" aria-modal="true" aria-label="계속 플레이하기">
        {!watchingAd && <button className="clover-guide-close" onClick={onClose} aria-label="닫기">×</button>}
        <img className="clover-continue-character" src="/emojis/redrawn/wellwish-chick.png" alt="클로버를 든 캐릭터" />
        <div className="onboarding-speech clover-guide-speech">
          <span className="onboarding-speaker">네잎 클로버 빨리 찾기</span>
          <h2>5판을 모두 플레이했어요!</h2>
          <p>리워드 광고를 끝까지 시청하면 5판 더 할 수 있어요.</p>
        </div>
        {error && <p className="clover-continue-error" role="alert">{error}</p>}
        <button className="onboarding-next" onClick={() => void handleWatch()} disabled={watchingAd}>
          {watchingAd ? "광고를 준비하고 있어요" : "광고 보고 5판 더 하기"}
        </button>
        {!watchingAd && <button className="clover-continue-later" onClick={onClose}>나중에</button>}
      </section>
    </div>
  );
}
