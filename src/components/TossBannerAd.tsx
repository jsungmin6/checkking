import { useEffect, useRef } from "react";
import { isTossApp } from "../utils/platform";

const AD_GROUP_ID = "ait.v2.live.85bb3cced6f54533";

export default function TossBannerAd() {
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
                AD_GROUP_ID,
                containerRef.current,
                {
                  theme: "auto",
                  tone: "blackAndWhite",
                  variant: "expanded",
                  callbacks: {
                    onAdRendered: () => console.log("[출석왕] 배너 광고 렌더링"),
                    onNoFill: () => console.log("[출석왕] 배너 광고 없음"),
                    onAdFailedToRender: (e) => console.warn("[출석왕] 배너 광고 실패:", e),
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
  }, []);

  if (!isTossApp()) return null;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 96, flexShrink: 0, margin: 0 }}
    />
  );
}
