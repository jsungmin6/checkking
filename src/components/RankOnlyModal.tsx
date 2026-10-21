interface RankOnlyModalProps {
  rank: number;
  onClose: () => void;
}

/** 선물 상자 보상 한도를 채운 뒤 출석 완료를 확인하는 모달 */
export default function RankOnlyModal({ rank, onClose }: RankOnlyModalProps) {
  return (
    <div className="rank-only-overlay">
      <section className="rank-only-dialog" role="dialog" aria-modal="true" aria-label="출석 완료">
        <button className="rank-only-close" onClick={onClose} aria-label="닫기">×</button>
        <h2>출석 체크 완료!</h2>
        <div className="rank-only-seal" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="m11 24 8.5 8.5L37 15" />
          </svg>
        </div>
        <p>오늘은 {rank}번째로 도착했어요</p>
        <button className="rank-only-confirm" onClick={onClose}>확인</button>
      </section>
    </div>
  );
}
