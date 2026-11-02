import { DAILY_REWARD_LIMIT, getDailyRewardCount } from "../utils/attendancePoints";

interface Props {
  onClose: () => void;
}

/**
 * 오늘 출석 보상이 몇 번 남았는지와 규칙을 알려준다.
 *
 * 선물상자와 등수 보너스는 **상한을 함께 쓴다.** 방을 옮겨 다녀도 하루 세 번이다.
 * 그 사실이 어디에도 적혀 있지 않아 "왜 안 주지" 하는 상황이 생겼다.
 */
export default function DailyRewardModal({ onClose }: Props) {
  const used = getDailyRewardCount();
  const left = Math.max(0, DAILY_REWARD_LIMIT - used);

  return (
    <div className="attendance-gift-overlay" onClick={onClose}>
      <section
        className="attendance-gift-dialog daily-reward-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="오늘의 출석 보상"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="attendance-gift-close" onClick={onClose} aria-label="닫기">×</button>
        <h2 className="attendance-gift-title">오늘의 출석 보상</h2>

        <div className="daily-reward-dots" aria-label={`${DAILY_REWARD_LIMIT}번 중 ${used}번 받음`}>
          {Array.from({ length: DAILY_REWARD_LIMIT }, (_, i) => (
            <span key={i} className={`daily-reward-dot${i < used ? " is-done" : ""}`} aria-hidden="true">
              {i < used ? "✓" : i + 1}
            </span>
          ))}
        </div>
        <p className="daily-reward-left">
          {left > 0
            ? <>오늘 <strong>{left}번</strong> 더 받을 수 있어요</>
            : "오늘 받을 수 있는 보상을 모두 받았어요"}
        </p>

        <ul className="daily-reward-notes">
          <li>출석하면 <strong>선물상자</strong>를 열 수 있어요. 하루 <strong>{DAILY_REWARD_LIMIT}번</strong>까지예요.</li>
          <li><strong>1·2·3등</strong>으로 출석하면 등수 보너스를 더 받아요.</li>
          <li>방을 옮겨 다녀도 횟수는 <strong>함께</strong> 세요.</li>
        </ul>

        <button className="attendance-gift-confirm" onClick={onClose}>확인</button>
      </section>
    </div>
  );
}
