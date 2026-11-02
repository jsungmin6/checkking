import { useState } from "react";
import GiftBox from "./GiftBox";

interface AttendanceGiftModalProps {
  rank: number;
  rankBonus: number | null;
  /** 서버에 선물 수령을 요청한다. 하루 상한을 넘겼거나 이미 받았으면 null. */
  onClaimGift: () => Promise<number | null>;
  onClose: (total: number) => void;
}

export default function AttendanceGiftModal({ rank, rankBonus, onClaimGift, onClose }: AttendanceGiftModalProps) {
  const [result, setResult] = useState<{ gift: number | null; total: number } | null>(null);

  const handleOpened = async () => {
    const gift = await onClaimGift();
    const total = (gift ?? 0) + (rankBonus ?? 0);
    setResult({ gift, total });
  };

  return (
    <div className="attendance-gift-overlay">
      <section className={`attendance-gift-dialog${result ? " is-opened" : ""}`} role="dialog" aria-modal="true" aria-label="출석 선물">
        <button className="attendance-gift-close" onClick={() => onClose(result?.total ?? 0)} aria-label="닫기">×</button>
        {result === null ? (
          <>
            <h2 className="attendance-gift-title">출석 완료!</h2>
            {rank <= 3 && <div className="attendance-gift-rank">오늘 {rank}등으로 출석했어요</div>}
            <GiftBox onOpened={() => { void handleOpened(); }} />
          </>
        ) : result.gift === null && rankBonus === null ? (
          // 하루 상한(3번)을 다 쓴 날. "+0점"을 적으면 못 받은 것처럼 보여서,
          // 받을 게 없다는 사실만 알리고 금액 줄은 띄우지 않는다.
          <>
            <div className="attendance-gift-done-mark" aria-hidden="true">✓</div>
            <h2 className="attendance-gift-title attendance-gift-result-title">출석 완료!</h2>
            <p className="attendance-gift-done-copy">
              오늘 받을 수 있는 출석 선물을 모두 받았어요.<br />내일 다시 열어볼 수 있어요.
            </p>
            <button className="attendance-gift-confirm" onClick={() => onClose(0)}>확인</button>
          </>
        ) : (
          <>
            <img className="attendance-gift-open-image" src="/rewards/gift-box-open.png" alt="포인트 동전이 나온 열린 선물 상자" />
            <h2 className="attendance-gift-title attendance-gift-result-title">와! 선물이 열렸어요!</h2>
            <div className="attendance-gift-points-list">
              <div className="attendance-gift-point-row">
                <span>출석 선물</span>
                {result.gift !== null ? <strong>+{result.gift.toLocaleString()}점</strong> : <small>오늘 받을 수 있는 선물을 모두 받았어요</small>}
              </div>
              {rankBonus !== null && (
                <div className="attendance-gift-point-row">
                  <span>{rank}등 보너스</span>
                  <strong>+{rankBonus.toLocaleString()}점</strong>
                </div>
              )}
            </div>
            <div className="attendance-gift-total-label">총 지급 포인트</div>
            <div className="attendance-gift-total">+{result.total.toLocaleString()}점</div>
            <button className="attendance-gift-confirm" onClick={() => onClose(result.total)}>확인</button>
          </>
        )}
      </section>
    </div>
  );
}
