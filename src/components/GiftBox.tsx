import { useCallback, useEffect, useRef, useState } from "react";

interface GiftBoxProps {
  disabled?: boolean;
  onOpened: () => void;
  label?: string;
  hint?: string;
  autoOpenRequest?: number;
}

export default function GiftBox({ disabled, onOpened, label = "출석 선물이 도착했어요", hint = "탭해서 열어보세요", autoOpenRequest = 0 }: GiftBoxProps) {
  const [opening, setOpening] = useState(false);
  const timer = useRef<number | null>(null);
  const lastAutoOpenRequest = useRef(0);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const handleClick = useCallback(() => {
    if (opening || disabled) return;
    setOpening(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onOpened();
    }, 650);
  }, [disabled, onOpened, opening]);

  useEffect(() => {
    if (disabled || autoOpenRequest <= lastAutoOpenRequest.current) return;
    const request = autoOpenRequest;
    // 다음 틱에 열어 StrictMode의 첫 effect 정리 단계에서 요청이 유실되지 않게 한다.
    const scheduledOpen = window.setTimeout(() => {
      if (request <= lastAutoOpenRequest.current) return;
      lastAutoOpenRequest.current = request;
      handleClick();
    }, 0);
    return () => window.clearTimeout(scheduledOpen);
  }, [autoOpenRequest, disabled, handleClick]);

  return (
    <button
      className={`attendance-gift-open${opening ? " is-opening" : ""}`}
      onClick={handleClick}
      disabled={disabled || opening}
      aria-label={`${label} 상자 열기`}
    >
      <span className="attendance-gift-image-frame">
        <img className="attendance-gift-image attendance-gift-image-closed" src="/rewards/gift-box-closed.png" alt="파란 리본이 달린 선물 상자" />
      </span>
      <strong>{label}</strong>
      <span className="attendance-gift-hint">{opening ? "선물을 여는 중..." : hint}</span>
    </button>
  );
}
