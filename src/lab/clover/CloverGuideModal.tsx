import { useState } from "react";
import { Meadow } from "./Meadow";
import type { ActiveField } from "./domain";

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    title: "1분 안에 네잎클로버를 찾아요",
    description: "풀숲에서 네잎클로버를 찾아서 클릭하세요! 세잎클로버를 클릭하면 1초가 줄어요.",
    scene: "find" as const,
  },
  {
    title: "풀숲을 밀어 살펴보세요",
    description: "손가락으로 풀잎을 밀어가며 숨은 곳을 찾아보세요.",
    scene: "drag" as const,
  },
  {
    title: "출석박스를 받아보세요",
    description: "네잎클로버를 모으면 랜덤 출석 포인트 박스가 도착해요.",
    scene: "reward" as const,
  },
];

const guideField: ActiveField = {
  id: "clover-guide",
  seed: 20261031,
  openedAt: "2026-10-31T00:00:00.000Z",
  theme: 1,
  foundIndexes: [],
  hintUsed: false,
  bonus: false,
};

export default function CloverGuideModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboarding-overlay clover-guide-overlay">
      <section className="onboarding-dialog clover-guide-dialog" role="dialog" aria-modal="true" aria-label="네잎 클로버 빨리 찾기 안내">
        <button className="clover-guide-close" onClick={onClose} aria-label="안내 닫기">×</button>
        <div className={`clover-guide-scene${current.scene === "reward" ? " clover-guide-scene-reward" : ""}`} key={step}>
          {current.scene === "reward" ? (
            <div className="clover-guide-reward-scene">
              <img src="/rewards/gift-box-closed.png" alt="파란 리본이 달린 출석박스" />
            </div>
          ) : (
            <>
              <Meadow
                field={guideField}
                onFound={() => {}}
                onInspect={() => {}}
                hintSignal={0}
                readOnly
                demoMode={current.scene}
              />
            </>
          )}
        </div>

        <div className="onboarding-speech clover-guide-speech">
          <span className="onboarding-speaker">네잎 클로버 빨리 찾기</span>
          <h2>{current.title}</h2>
          <p>{current.description}</p>
        </div>

        <div className="onboarding-progress" aria-label={`${step + 1} / ${STEPS.length}`}>
          {STEPS.map((_, index) => <span key={index} className={index === step ? "active" : ""} />)}
        </div>

        <div className="clover-guide-nav">
          {step > 0 && <button className="clover-guide-prev" onClick={() => setStep((value) => Math.max(0, value - 1))}>이전</button>}
          <button className="onboarding-next" onClick={() => (isLast ? onClose() : setStep((value) => value + 1))}>
            {isLast ? "시작하기" : "다음"}
          </button>
        </div>
      </section>
    </div>
  );
}
