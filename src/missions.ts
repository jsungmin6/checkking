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
  /** 달성 횟수가 필요한 미션의 목표 횟수 */
  targetCount?: number;
  /** 제목 옆에 보여줄 캐릭터 이미지 */
  titleImage?: string;
  /** 어디를 눌러야 하는지 보여주는 화면 캡처. public/missions/ 에 둔다. */
  guideImage?: string;
  /** 순서가 있는 복수 화면 안내 */
  guideSteps?: Array<{ image: string; caption: string }>;
}

export const MISSIONS: MissionDef[] = [
  {
    id: "greeting",
    title: "출석인사 미션",
    description: "방에 들어가 '인사' 탭에서 출석 인사를 남겨보세요.",
    todo: "인사 탭에서 인사 남기기",
    reward: 2000,
    guideImage: "/missions/greeting.png",
  },
  {
    id: "invite",
    title: "친구 초대 미션",
    description: "방에 자리가 남아 있으면 '순위' 탭에서 친구를 초대할 수 있어요.",
    todo: "순위 탭에서 친구 초대하기",
    reward: 5000,
    guideImage: "/missions/invite.png",
  },
  {
    id: "nickname",
    title: "닉네임 바꾸기 미션",
    description: "처음 이름은 아무렇게나 지어드려요. '내 정보'에서 마음에 드는 이름으로 바꿔보세요.",
    todo: "내 정보에서 닉네임 바꾸기",
    reward: 5000,
    guideImage: "/missions/nickname.png",
  },
  {
    id: "clover-finder",
    title: "네잎 클로버 빨리 찾기 성공하기",
    description: "놀이터 → 네잎 클로버 빨리 찾기에서 네잎 클로버를 1분 안에 3회 찾아보세요.",
    todo: "네잎 클로버를 1분 안에 찾기",
    reward: 5000,
    targetCount: 3,
    titleImage: "/emojis/redrawn/wellwish-chick.png",
    guideImage: "/missions/clover-finder.png",
  },
  {
    id: "photo-attendance",
    title: "사진 인증방 출석하기",
    description: "사진 인증방을 직접 만들거나 사진 인증방에 참여하세요. 사진으로 2회 출석하면 완료돼요.",
    todo: "사진 인증방에서 사진으로 2회 출석하기",
    reward: 5000,
    targetCount: 2,
    guideSteps: [
      { image: "/missions/photo-attendance-create.png", caption: "방 만들기에서 사진 인증을 선택해요" },
      { image: "/missions/photo-attendance-join.png", caption: "사진 인증 표시가 있는 방에 참여해요" },
    ],
  },
];

export function findMission(id: string): MissionDef | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}
