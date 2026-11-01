import { useState, type ReactNode } from "react";
import { LOTTERY_MAX_PRIZE_WON, LOTTERY_TICKET_PRICE, STREAK_REWARD_WON } from "../utils/tossPromotion";
import { TossPointCoin } from "./StreakRewardModal";
import { FIRST_TOSS_REWARD_DAY, TOSS_REWARD_INTERVAL } from "../utils/localStreak";
import "../styles/lab.css";

interface OnboardingModalProps {
  onClose: () => void;
}

/**
 * 가이드에 보여줄 복권 당첨 그림.
 *
 * 실제 복권 모달과 **같은 클래스**를 쓴다. 그림을 따로 그리면 복권 디자인을 바꿀 때
 * 가이드만 옛 모습으로 남는다. 긁는 면은 없고 당첨된 상태로 고정한다.
 */
function LotteryTicketPreview() {
  return (
    <div className="attendance-lottery-ticket attendance-lottery-scratch-ticket is-revealed onboarding-ticket">
      <div className="attendance-lottery-ticket-side" aria-hidden="true">
        <span>✦</span><span>★</span><span>✦</span>
      </div>
      <div className="attendance-lottery-ticket-body">
        <div className="attendance-lottery-ticket-heading">
          <span>출석왕 행운 복권</span>
          <strong>LUCKY TICKET</strong>
        </div>
        <div className="attendance-lottery-scratch-area">
          <div className="attendance-lottery-prize-underlay">
            <span>당첨!</span>
            <strong>{LOTTERY_MAX_PRIZE_WON.toLocaleString()}P</strong>
            <small>현금 가치 {LOTTERY_MAX_PRIZE_WON.toLocaleString()}원</small>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 가이드에 보여줄 출석 도장 카드.
 *
 * 복권과 같은 이유로 실제 도장 화면의 클래스를 그대로 쓴다. 7일차는 토스포인트를
 * 함께 받는 날이라 강조 상태(`is-toss-reward`)로 둔다.
 */
function StreakStampPreview() {
  const days = [
    { day: 5, points: 2_000, tone: "is-bronze" },
    { day: 6, points: 5_000, tone: "is-bronze" },
    { day: 7, points: 0, tone: "is-silver" },   // 토스포인트를 받는 날 — 출석점수는 없다
  ];
  return (
    <div className="onboarding-stamps" aria-hidden="true">
      {days.map(({ day, points, tone }) => (
        <div
          key={day}
          className={`streak-reward-card${day === 7 ? " is-toss-reward" : ""}`}
        >
          <span className="streak-reward-day">{day}일차</span>
          <span className="streak-reward-stamp">
            {day === 7 ? <TossPointCoin /> : <><span>도장</span><strong>{day}</strong></>}
          </span>
          {day === 7 ? (
            <span className="streak-reward-toss">
              <TossPointCoin />
              {STREAK_REWARD_WON}원
            </span>
          ) : (
            <strong className={`streak-reward-points ${tone}`}>{points.toLocaleString()}점</strong>
          )}
        </div>
      ))}
    </div>
  );
}

interface Step {
  image?: string;
  alt?: string;
  /** 이미지 대신 그릴 내용. 있으면 image보다 우선한다. */
  visual?: ReactNode;
  title: string;
  desc: ReactNode;
}

const STEPS: Step[] = [
  {
    image: "/guide/guide-challenge.png",
    alt: "토끼와 거북이가 함께 챌린지 출석 달력을 만들어요",
    title: "다양한 챌린지를 함께하고 토스포인트를 받아가요",
    desc: "모임이나 챌린지 방을 만들어 함께 출석하고, 쌓인 기록으로 토스포인트까지 받아요.",
  },
  {
    visual: <StreakStampPreview />,
    title: "연속으로 출석할수록 많이 받아요",
    desc: (
      <>
        하루도 빠지지 않으면 도장마다 출석점수가 쌓여요. {FIRST_TOSS_REWARD_DAY}일차부터는{" "}
        <strong className="onboarding-accent">{TOSS_REWARD_INTERVAL}일마다 토스포인트 {STREAK_REWARD_WON}원</strong>도 함께 들어와요.
      </>
    ),
  },
  {
    visual: <LotteryTicketPreview />,
    title: "출석복권으로 토스포인트를 받아요",
    desc: (
      <>
        출석점수 {LOTTERY_TICKET_PRICE.toLocaleString()}점을 모으면 복권 한 장을 긁을 수 있어요.{" "}
        <strong className="onboarding-accent">최대 {LOTTERY_MAX_PRIZE_WON.toLocaleString()}원</strong>이 바로 들어와요.
      </>
    ),
  },
  {
    image: "/guide/guide-gps-private.png",
    alt: "지도에 GPS 출석 반경이 표시되고 거북이가 암호방 초대 코드를 들고 있어요",
    title: "이런 기능도 있어요!",
    desc: "GPS 인증을 선택한 방은 정해진 반경 안에서만 출석할 수 있어요. 암호방은 초대 코드로 입장할 수 있어요.",
  },
  {
    image: "/guide/guide-ranking.png",
    alt: "토끼와 거북이가 도착 순서대로 시상대에 올라 있어요",
    title: "출석 순위도 확인할 수 있어요",
    desc: "출석한 순서대로 오늘의 순위가 기록돼요. 먼저 출석할수록 높은 순위에 올라가요.",
  },
  {
    image: "/guide/guide-points.png",
    alt: "1위 토끼가 더 많은 포인트 동전을 받고 거북이도 선물을 받아요",
    title: "높은 순위일수록 포인트 보너스가 커져요",
    desc: "출석 선물을 열어 포인트를 모아 보세요. 1~3등은 순위가 높을수록 더 많은 보너스를 받아요.",
  },
];

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div className="onboarding-overlay">
      <section className="onboarding-dialog" role="dialog" aria-modal="true" aria-label="출석왕 사용 안내">
        {current.visual
          ? <div className="onboarding-character onboarding-visual">{current.visual}</div>
          : <img className="onboarding-character" src={current.image} alt={current.alt} key={current.image} />}
        <div className="onboarding-speech">
          <span className="onboarding-speaker">출석왕</span>
          <h2>{current.title}</h2>
          <p>{current.desc}</p>
        </div>

        <div className="onboarding-progress" aria-label={`${step + 1} / ${STEPS.length}`}>
          {STEPS.map((_, i) => <span key={i} className={i === step ? "active" : ""} />)}
        </div>

        <button className="onboarding-next" onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}>
          {isLast ? "시작하기" : "다음"}
        </button>
      </section>
    </div>
  );
}
