import { useEffect, useRef } from "react";
import { isTossApp } from "../utils/platform";

/** 콘솔에 등록된 광고 그룹. 글자까지 같아야 하고, 틀리면 에러 없이 조용히 안 뜬다. */
export const BANNER_AD_GROUPS = {
  /** 출석왕_배너 — 텍스트형 */
  text: "ait.v2.live.85bb3cced6f54533",
  /** 출석왕_배너_이미지강조 */
  imageEmphasis: "ait.v2.live.1fca1bcd61194142",
} as const;

interface TossBannerAdProps {
  /** 콘솔 광고 그룹 ID. 기본은 텍스트형. */
  adGroupId?: string;
  variant?: "card" | "expanded";
  /**
   * 컨테이너 높이(px). 생략하면 인라인으로 붙어 광고가 높이를 정한다.
   *
   * 너비는 **항상 화면 너비(100%)** 여야 한다 — 고정값은 정책 위반이다.
   */
  height?: number;
  className?: string;
}

/**
 * 토스 배너 광고.
 *
 * 토스 앱이 아니면 아무것도 그리지 않는다. SDK 초기화·렌더 실패는 모두 삼킨다 —
 * 광고가 안 뜬다고 화면이 깨지면 안 된다.
 */
export default function TossBannerAd({
  adGroupId = BANNER_AD_GROUPS.text,
  variant = "expanded",
  height = 96,
  className,
}: TossBannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTossApp()) return;

    let destroyed = false;
    let attached: { destroy: () => void } | null = null;

    (async () => {
      try {
        const { TossAds } = await import("@apps-in-toss/web-framework");

        if (!TossAds.initialize.isSupported()) return;

        TossAds.initialize({
          callbacks: {
            onInitialized: () => {
              if (destroyed || !containerRef.current) return;

              attached = TossAds.attachBanner(
                adGroupId,
                containerRef.current,
                {
                  theme: "auto",
                  tone: "blackAndWhite",
                  variant,
                  callbacks: {
                    onAdRendered: () => console.log("[출석왕] 배너 광고 렌더링", adGroupId),
                    onNoFill: () => console.log("[출석왕] 배너 광고 없음", adGroupId),
                    onAdFailedToRender: (e) => console.warn("[출석왕] 배너 광고 실패:", adGroupId, e),
                  },
                }
              );
            },
            onInitializationFailed: (e) => console.warn("[출석왕] 광고 SDK 초기화 실패:", e),
          },
        });
      } catch (e) {
        console.warn("[출석왕] 광고 로드 실패:", e);
      }
    })();

    return () => {
      destroyed = true;
      attached?.destroy();
    };
  }, [adGroupId, variant]);

  if (!isTossApp()) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", flexShrink: 0, margin: 0, ...(height ? { height } : {}) }}
    />
  );
}
