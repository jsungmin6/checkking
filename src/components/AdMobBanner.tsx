import { useEffect } from "react";
import { isAndroid, isTossApp } from "../utils/platform";
import { showAdBanner, hideAdBanner } from "../utils/admob";

export default function AdMobBanner() {
  useEffect(() => {
    if (!isAndroid() || isTossApp()) return;
    showAdBanner();
    return () => { hideAdBanner(); };
  }, []);

  if (!isAndroid() || isTossApp()) return null;
  return <div style={{ height: 60, flexShrink: 0 }} />;
}
