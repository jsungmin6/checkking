import { useState } from "react";
import GiftBox from "./GiftBox";

interface AttendanceGiftModalProps {
  rank: number;
  rankBonus: number | null;
  onClaimGift: () => number | null;
  onClose: (total: number) => void;
}

export default function AttendanceGiftModal({ rank, rankBonus, onClaimGift, onClose }: AttendanceGiftModalProps) {
  const [result, setResult] = useState<{ gift: number | null; total: number } | null>(null);

  const handleOpened = () => {
    const gift = onClaimGift();
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
            <GiftBox onOpened={handleOpened} />
          </>
        ) : (
          <>
            <img className="attendance-gift-open-image" src="/rewards/gift-box-open.png" alt="포인트 동전이 나온 열린 선물 상자" />
            <h2 className="attendance-gift-title attendance-gift-result-title">와! 선물이 열렸어요!</h2>
            <div className="attendance-gift-points-list">
              <div className="attendance-gift-point-row">
                <span>출석 선물</span>
                {result.gift !== null ? <strong>+{result.gift.toLocaleString()}P</strong> : <small>오늘 받을 수 있는 선물을 모두 받았어요</small>}
              </div>
              {rankBonus !== null && (
                <div className="attendance-gift-point-row">
                  <span>{rank}등 보너스</span>
                  <strong>+{rankBonus.toLocaleString()}P</strong>
                </div>
              )}
            </div>
            <div className="attendance-gift-total-label">총 지급 포인트</div>
            <div className="attendance-gift-total">+{result.total.toLocaleString()}P</div>
            <button className="attendance-gift-confirm" onClick={() => onClose(result.total)}>확인</button>
          </>
        )}
      </section>
    </div>
  );
}
