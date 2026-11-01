import TossBannerAd, { BANNER_AD_GROUPS } from "./TossBannerAd";
interface Props {
  amount: number;
  onClose: () => void;
}

export default function TossPointsReceivedModal({ amount, onClose }: Props) {
  return (
    <div className="toss-points-detail-overlay" onClick={onClose}>
      <section
        className="toss-points-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="toss-points-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="toss-points-detail-close" onClick={onClose} aria-label="닫기">×</button>
        <span className="toss-points-detail-icon" aria-hidden="true">P</span>
        <h2 id="toss-points-detail-title">지금까지 출석왕에서 받은 토스포인트</h2>
        <p className="toss-points-detail-empty">
          {amount > 0
            ? `지금까지 총 ${amount.toLocaleString()}원을 받았어요. 사용한 포인트도 포함한 누적 금액이에요.`
            : "아직 출석왕에서 받은 토스포인트가 없어요."}
        </p>
        <ul className="toss-points-detail-notes">
          <li>토스 앱 <strong>혜택</strong> 메뉴에서 받은 포인트를 확인할 수 있어요</li>
          <li>모아서 <strong>현금처럼</strong> 쓸 수 있어요</li>
        </ul>
        {/* 확인 버튼 위. 금액과 안내를 읽은 뒤에 보이게 둔다. */}
        <TossBannerAd
          adGroupId={BANNER_AD_GROUPS.text}
          variant="card"
          className="toss-points-detail-ad"
        />
        <button className="toss-points-detail-confirm" onClick={onClose}>확인</button>
      </section>
    </div>
  );
}
