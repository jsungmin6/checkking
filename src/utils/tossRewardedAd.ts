import { isTossApp } from "./platform";
import { api } from "./api";

/** 광고 로딩/재생 실패를 서버에 보고한다(텔레그램 알림용). 실패해도 UI에 영향 없는 best-effort 호출. */
export function reportAdLoadFailed(adGroupId: string, reason: string) {
  void api("/notifications/ad-load-failed", {
    method: "POST",
    body: JSON.stringify({ adGroupId, reason }),
  }).catch(() => {});
}

/** Returns true only after the SDK reports that the user earned the reward. */
export async function showTossRewardedAd(adGroupId: string): Promise<boolean> {
  if (!isTossApp()) return true;

  const { loadFullScreenAd, showFullScreenAd } = await import("@apps-in-toss/web-framework");
  if (!loadFullScreenAd.isSupported() || !showFullScreenAd.isSupported()) {
    throw new Error("현재 토스 앱 버전에서는 리워드 광고를 사용할 수 없습니다.");
  }

  await new Promise<void>((resolve, reject) => {
    let cleanup: (() => void) | undefined;
    const timeout = window.setTimeout(() => {
      cleanup?.();
      reject(new Error("광고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."));
    }, 30_000);

    cleanup = loadFullScreenAd({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type !== "loaded") return;
        window.clearTimeout(timeout);
        cleanup?.();
        resolve();
      },
      onError: (error) => {
        window.clearTimeout(timeout);
        cleanup?.();
        reject(error);
      },
    });
  });

  return new Promise<boolean>((resolve, reject) => {
    let earnedReward = false;
    let cleanup: (() => void) | undefined;
    let settled = false;
    const finish = (result?: boolean, error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup?.();
      if (error) reject(error);
      else resolve(result ?? false);
    };

    const timeout = window.setTimeout(() => {
      finish(false, new Error("광고가 정상적으로 종료되지 않았습니다. 다시 시도해 주세요."));
    }, 180_000);

    cleanup = showFullScreenAd({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type === "userEarnedReward") earnedReward = true;
        if (event.type === "dismissed") {
          window.clearTimeout(timeout);
          if (earnedReward) {
            void api("/notifications/ad-rewarded", {
              method: "POST",
              body: JSON.stringify({ adGroupId }),
            }).catch(() => {});
          }
          finish(earnedReward);
        } else if (event.type === "failedToShow") {
          window.clearTimeout(timeout);
          finish(false, new Error("광고를 재생하지 못했습니다. 잠시 후 다시 시도해 주세요."));
        }
      },
      onError: (error) => {
        window.clearTimeout(timeout);
        finish(false, error);
      },
    });
  });
}
