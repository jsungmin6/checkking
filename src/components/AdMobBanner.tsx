import { useEffect, useState } from "react";
import { isAndroid, isTossApp } from "../utils/platform";
import { showAdBanner, hideAdBanner, addBannerSizeListener } from "../utils/admob";

// adaptive banner 높이는 기기 화면 너비에 따라 달라져서, 고정값 대신 실제 크기에 맞춰 플레이스홀더를 조정한다.
// (안 맞으면 네이티브 배너가 바로 아래 하단 탭바를 가릴 수 있음)
const FALLBACK_HEIGHT = 60;

export default function AdMobBanner() {
  const [height, setHeight] = useState(FALLBACK_HEIGHT);

  useEffect(() => {
    if (!isAndroid() || isTossApp()) return;
    showAdBanner();
    let cleanup: (() => void) | undefined;
    addBannerSizeListener((size) => {
      if (size.height > 0) setHeight(size.height);
    }).then((fn) => { cleanup = fn; });
    return () => {
      hideAdBanner();
      cleanup?.();
    };
  }, []);

  if (!isAndroid() || isTossApp()) return null;
  return <div style={{ height, flexShrink: 0 }} />;
}
