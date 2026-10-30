/**
 * 이벤트성 미션 설정.
 *
 * 이벤트를 내릴 때는 MISSIONS 배열에서 빼고 재배포한다. 사용자별로 보상을 한 번 받으면
 * 그 미션은 목록에서 사라지므로, 급하게 배포하지 않아도 된다.
 */

export interface MissionDef {
  /** 서버가 아는 미션 id — 알림 문구는 서버가 이 값으로 결정한다. */
  id: string;
  title: string;
  description: string;
  todo: string;
  /** 완료 시 지급할 출석 포인트 */
  reward: number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: "greeting",
    title: "출석인사 미션",
    description: "방에 들어가 '인사' 탭에서 출석 인사를 남겨보세요.",
    todo: "인사 탭에서 인사 남기기",
    reward: 2000,
  },
  {
    id: "invite",
    title: "친구 초대 미션",
    description: "방에 자리가 남아 있으면 '순위' 탭에서 친구를 초대할 수 있어요.",
    todo: "순위 탭에서 친구 초대하기",
    reward: 5000,
  },
];

export function findMission(id: string): MissionDef | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}
