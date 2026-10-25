/**
 * 이벤트성 미션 설정.
 *
 * 켜고 끄기는 아래 ACTIVE 값을 바꿔 재배포하면 된다. 사용자별로 보상을 한 번 받으면
 * 버튼이 영구히 사라지므로, 이벤트를 내릴 때 굳이 급하게 배포하지 않아도 된다.
 */

/** 이 미션을 홈에 노출할지 여부 — 이벤트가 끝나면 false로 바꾸고 재배포한다. */
export const GREETING_MISSION_ACTIVE = true;

/** 미션 완료 시 지급할 출석 포인트 */
export const GREETING_MISSION_REWARD = 2000;

export const GREETING_MISSION = {
  title: "출석인사 미션",
  description: "방에 들어가 '인사' 탭에서 오늘의 출석 인사를 한 번 남겨보세요.",
  todo: "인사 탭에서 인사 남기기",
  reward: GREETING_MISSION_REWARD,
} as const;
