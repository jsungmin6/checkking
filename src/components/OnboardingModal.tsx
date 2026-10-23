import { useState } from "react";

interface OnboardingModalProps {
  onClose: () => void;
}

const STEPS = [
  {
    image: "/guide/guide-challenge.png",
    alt: "토끼와 거북이가 함께 챌린지 출석 달력을 만들어요",
    title: "방을 만들고 함께 출석해 보세요",
    desc: "모임이나 챌린지 방을 만들고, 함께 출석을 기록할 수 있어요.",
  },
  {
    image: "/guide/guide-gps-private.png",
    alt: "지도에 GPS 출석 반경이 표시되고 거북이가 비밀방 초대 코드를 들고 있어요",
    title: "이런 기능도 있어요!",
    desc: "GPS 인증을 선택한 방은 정해진 반경 안에서만 출석할 수 있어요. 비밀방은 초대 코드로 입장할 수 있어요.",
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
        <img className="onboarding-character" src={current.image} alt={current.alt} key={current.image} />
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
