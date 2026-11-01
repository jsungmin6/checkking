import { isTossApp } from "./platform";
import { api } from "./api";

/** 광고 로딩/재생 실패를 서버에 보고한다(로그 집계용). 실패해도 UI에 영향 없는 best-effort 호출. */
export async function reportAdLoadFailed(adGroupId: string, reason: string) {
  const errorCodeMatch = reason.match(/code=(-?\d+)/);
  let platform: string | undefined;
  try {
    if (isTossApp()) {
      const { getPlatformOS } = await import("@apps-in-toss/web-framework");
      platform = getPlatformOS();
    }
  } catch {
    // SDK 미지원 환경 — platform 없이 보고
  }

  void api("/notifications/ad-load-failed", {
    method: "POST",
    body: JSON.stringify({
      adGroupId,
      reason,
      errorCode: errorCodeMatch ? errorCodeMatch[1] : undefined,
      platform,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {});
}

async function loadAdOnce(
  loadFullScreenAd: typeof import("@apps-in-toss/web-framework")["loadFullScreenAd"],
  adGroupId: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
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
}

/**
 * 전면 광고를 한 번 보여준다. 닫히면 끝이다.
 *
 * 리워드 광고와 달리 `userEarnedReward`를 기다리지 않는다 — 전면 광고는 보상의
 * **조건이 아니라** 보상 직전에 끼워 넣는 노출이다.
 *
 * **실패해도 던지지 않는다.** 광고가 안 떴다고 받을 보상을 막으면 사용자만 손해다.
 * 실패 사유는 집계로만 남긴다.
 */
export async function showTossInterstitialAd(adGroupId: string): Promise<void> {
  if (!isTossApp()) return;

  try {
    const { loadFullScreenAd, showFullScreenAd } = await import("@apps-in-toss/web-framework");
    if (!loadFullScreenAd.isSupported() || !showFullScreenAd.isSupported()) return;

    try {
      await loadAdOnce(loadFullScreenAd, adGroupId);
    } catch {
      // 한 번 더. "No fill"처럼 재시도하면 종종 성공하는 실패가 많다.
      await new Promise((r) => setTimeout(r, 1500));
      await loadAdOnce(loadFullScreenAd, adGroupId);
    }

    await new Promise<void>((resolve) => {
      let cleanup: (() => void) | undefined;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        cleanup?.();
        resolve();
      };
      // 닫힘 이벤트가 오지 않아도 보상 화면으로 넘어가야 한다.
      const timeout = window.setTimeout(finish, 180_000);

      cleanup = showFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === "dismissed" || event.type === "failedToShow") finish();
        },
        onError: () => finish(),
      });
    });
  } catch (error) {
    void reportAdLoadFailed(adGroupId, error instanceof Error ? error.message : "unknown_error");
  }
}

/** Returns true only after the SDK reports that the user earned the reward. */
export async function showTossRewardedAd(
  adGroupId: string,
  placement?: "AVATAR_CHANGE" | "CLOVER_CONTINUE" | "CLOVER_BOX_DOUBLE" | "POINTS_CONVERSION" | "ATTENDANCE_LOTTERY",
): Promise<boolean> {
  if (!isTossApp()) return true;

  const { loadFullScreenAd, showFullScreenAd } = await import("@apps-in-toss/web-framework");
  if (!loadFullScreenAd.isSupported() || !showFullScreenAd.isSupported()) {
    throw new Error("현재 토스 앱 버전에서는 리워드 광고를 사용할 수 없습니다.");
  }

  // "No fill"/일시적 JS엔진 오류처럼 재시도하면 종종 성공하는 실패가 많아서, 포기하기 전에 한 번 더 시도한다.
  try {
    await loadAdOnce(loadFullScreenAd, adGroupId);
  } catch {
    await new Promise((r) => setTimeout(r, 1500));
    await loadAdOnce(loadFullScreenAd, adGroupId);
  }

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
          if (earnedReward && placement !== "POINTS_CONVERSION") {
            void api("/notifications/ad-rewarded", {
              method: "POST",
              body: JSON.stringify({ adGroupId, placement }),
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
