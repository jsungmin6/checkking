import { isAndroid, isTossApp } from "./platform";

const IS_TEST = false; // 프로덕션 광고
const AD_ENABLED = true;
const AD_UNIT_ID = IS_TEST
  ? "ca-app-pub-3940256099942544/2435281174"
  : "ca-app-pub-2229465145229904/6771351117";

let initDone = false;
let bannerCreated = false;

export async function showAdBanner() {
  if (!AD_ENABLED || !isAndroid() || isTossApp()) return;

  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");

    if (!initDone) {
      await AdMob.initialize({ initializeForTesting: IS_TEST });
      initDone = true;
    }

    if (!bannerCreated) {
      await AdMob.showBanner({
        adId: AD_UNIT_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        npa: true,
      });
      bannerCreated = true;
    } else {
      await AdMob.resumeBanner();
    }
  } catch (e) {
    console.warn("[출석왕] AdMob:", e);
  }
}

export async function hideAdBanner() {
  if (!AD_ENABLED || !isAndroid() || isTossApp() || !bannerCreated) return;

  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.hideBanner();
  } catch {}
}
