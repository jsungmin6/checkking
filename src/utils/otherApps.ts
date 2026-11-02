import { isTossApp } from "./platform";
import { addPoints, readList, appendToList } from "./attendancePoints";

/**
 * 같은 워크스페이스의 다른 미니앱으로 보내고 출석점수를 준다.
 *
 * 앱마다 **한 번만** 준다. 다녀왔는지는 확인할 방법이 없으므로 "열었다"를 기준으로
 * 한다 — 토스가 다른 앱을 띄우면 우리 웹뷰는 그대로 남아 돌아왔는지 알 수 없다.
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
    appName: "animal-keeper",
    title: "숲속 사육사",
    description: "동물을 키우고 돌보는 느긋한 게임",
    emoji: "🐾",
  },
  {
    appName: "lucky-clover-find",
    title: "행복 클로바 찾기",
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

/** 이미 점수를 받은 앱인지. */
export function hasVisited(appName: string): boolean {
  return readList(VISITED_KEY).includes(appName);
}

/** 아직 점수를 받지 않은 앱 수. 카드에 배지를 띄울지 판단한다. */
export function unvisitedCount(): number {
  return OTHER_APPS.filter((app) => !hasVisited(app.appName)).length;
}

export interface VisitResult {
  /** 이번에 적립한 점수. 이미 받은 앱이면 0. */
  earned: number;
  /** 토스 앱이 아니어서 열지 못했는지. */
  unsupported: boolean;
}

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * 다른 앱을 열고, 처음이면 점수를 준다.
 *
 * **여는 데 실패하면 점수를 주지 않는다.** 열리지도 않았는데 적립하면 한 번뿐인
 * 기회를 잃는다.
 */
export async function visitOtherApp(appName: string): Promise<VisitResult> {
  if (!isTossApp()) return { earned: 0, unsupported: true };

  try {
    const { Device } = await import("@apps-in-toss/web-framework");
    await Device.openURL(`intoss://${appName}`);
  } catch {
    return { earned: 0, unsupported: true };
  }

  if (hasVisited(appName)) return { earned: 0, unsupported: false };
  appendToList(VISITED_KEY, appName);
  const earned = randomInt(OTHER_APP_VISIT_MIN, OTHER_APP_VISIT_MAX);
  addPoints(earned);
  return { earned, unsupported: false };
}
