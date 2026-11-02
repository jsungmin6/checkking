import { isTossApp } from "./platform";
import { addPoints, readList, appendToList, todayKey } from "./attendancePoints";

/**
 * 같은 워크스페이스의 다른 미니앱으로 보내고 출석점수를 준다.
 *
 * 앱마다 **하루에 한 번** 준다. 다녀왔는지는 확인할 방법이 없으므로 "열었다"를
 * 기준으로 한다 — 토스가 다른 앱을 띄우면 우리 웹뷰는 그대로 남아 돌아왔는지 알 수 없다.
 *
 * `appName`은 각 앱 설정의 값과 글자까지 같아야 한다. 틀리면 토스가 아무 반응 없이
 * 무시한다.
 */
export interface OtherApp {
  appName: string;
  title: string;
  description: string;
  /** 앱 로고. 없으면 이모지로 대신한다. */
  logo?: string;
  emoji: string;
}

export const OTHER_APPS: OtherApp[] = [
  {
    // 설정 파일에는 animal-keeper로 적혀 있지만 콘솔에 등록된 식별자는 pet-raising이다.
    // 스킴은 **콘솔 값**을 따라야 한다 — 틀리면 아무 반응 없이 무시된다.
    appName: "pet-raising",
    title: "동물 키우기",
    description: "알을 부화시켜 동물을 키워요",
    logo: "/apps/pet-raising.png",
    emoji: "🐾",
  },
  {
    appName: "lucky-clover-find",
    title: "행운의 클로바 찾기",
    description: "네잎클로버를 찾아 행운을 모아요",
    logo: "/apps/lucky-clover-find.png",
    emoji: "🍀",
  },
  {
    appName: "fishsudang",
    title: "낚시했수당",
    description: "물고기를 낚아 도감을 채워요",
    logo: "/apps/fishsudang.png",
    emoji: "🎣",
  },
];

/**
 * 앱 하나를 둘러볼 때 주는 출석점수 범위. 선물상자를 열어 받는다.
 *
 * 고정 금액이면 상자를 열 이유가 없다. 다른 출석 보상과 같은 연출을 쓰려고 폭을 둔다.
 */
export const OTHER_APP_VISIT_MIN = 1_000;
export const OTHER_APP_VISIT_MAX = 2_000;

const VISITED_KEY = "att-other-app-visited";
const OPENED_KEY = "att-other-app-opened";

/**
 * 날짜를 키에 박아 하루가 지나면 저절로 풀리게 한다.
 *
 * 출석 선물·등수 보너스와 같은 방식이다(`gift:방:날짜`). 목록은 최근 50개만
 * 남으므로 따로 비우지 않아도 늘어나지 않는다.
 */
const dayKey = (appName: string) => `${appName}:${todayKey()}`;

/** 오늘 이미 점수를 받은 앱인지. */
export function hasVisited(appName: string): boolean {
  return readList(VISITED_KEY).includes(dayKey(appName));
}

/** 오늘 열어는 봤지만 아직 보상을 받지 않은 앱인지. */
export function isRewardReady(appName: string): boolean {
  return !hasVisited(appName) && readList(OPENED_KEY).includes(dayKey(appName));
}

/** 오늘 아직 점수를 받지 않은 앱 수. 카드에 배지를 띄울지 판단한다. */
export function unvisitedCount(): number {
  return OTHER_APPS.filter((app) => !hasVisited(app.appName)).length;
}

export interface OpenResult {
  /** 토스 앱이 아니어서 열지 못했는지. */
  unsupported: boolean;
}

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * 다른 앱을 연다. **여기서는 점수를 주지 않는다.**
 *
 * 열렸는지 확인할 방법이 없다 — `Device.openURL`은 잘못된 식별자에도 실패를
 * 알려주지 않는다. 열자마자 적립하면 앱이 안 떠도 한 번뿐인 기회가 사라진다.
 * 실제로 식별자가 틀렸을 때 그런 일이 있었다.
 *
 * 그래서 "열었다"만 남기고, 돌아와서 직접 **받기**를 눌러야 지급한다.
 */
export async function openOtherApp(appName: string): Promise<OpenResult> {
  if (!isTossApp()) {
    // 개발 서버에서는 연 것처럼 흉내 낸다. 그러지 않으면 "받기" 단계를 볼 수 없다.
    // **실제로 앱을 열지는 않는다** — 토스 SDK를 부르지 않는다.
    if (import.meta.env.DEV) {
      console.info("[출석왕] 개발 모드 가짜 앱 열기", { appName });
      if (!hasVisited(appName)) appendToList(OPENED_KEY, dayKey(appName));
      return { unsupported: false };
    }
    return { unsupported: true };
  }

  try {
    const { Device } = await import("@apps-in-toss/web-framework");
    await Device.openURL(`intoss://${appName}`);
  } catch {
    return { unsupported: true };
  }
  if (!hasVisited(appName)) appendToList(OPENED_KEY, dayKey(appName));
  return { unsupported: false };
}

/**
 * 열어본 앱의 보상을 받는다. 아직 안 열었거나 오늘 이미 받았으면 0.
 *
 * @returns 적립한 점수(원이 아니라 출석점수).
 */
export function claimVisitReward(appName: string): number {
  if (!isRewardReady(appName)) return 0;
  appendToList(VISITED_KEY, dayKey(appName));
  const earned = randomInt(OTHER_APP_VISIT_MIN, OTHER_APP_VISIT_MAX);
  addPoints(earned);
  return earned;
}
