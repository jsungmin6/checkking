import { useEffect, useRef, useState } from "react";

interface GiftBoxProps {
  disabled?: boolean;
  onOpened: () => void;
}

export default function GiftBox({ disabled, onOpened }: GiftBoxProps) {
  const [opening, setOpening] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const handleClick = () => {
    if (opening || disabled) return;
    setOpening(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onOpened();
    }, 650);
  };

  return (
    <button
      className={`attendance-gift-open${opening ? " is-opening" : ""}`}
      onClick={handleClick}
      disabled={disabled || opening}
      aria-label="출석 선물 상자 열기"
    >
      <span className="attendance-gift-image-frame">
        <img className="attendance-gift-image attendance-gift-image-closed" src="/rewards/gift-box-closed.png" alt="파란 리본이 달린 선물 상자" />
      </span>
      <strong>출석 선물이 도착했어요</strong>
      <span className="attendance-gift-hint">{opening ? "선물을 여는 중..." : "탭해서 열어보세요"}</span>
    </button>
  );
}
