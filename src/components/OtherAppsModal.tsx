import { useState } from "react";
import GiftBox from "./GiftBox";
import TossBannerAd, { BANNER_AD_GROUPS } from "./TossBannerAd";
import {
  OTHER_APPS,
  OTHER_APP_VISIT_MIN,
  OTHER_APP_VISIT_MAX,
  claimVisitReward,
  hasVisited,
  isRewardReady,
  openOtherApp,
} from "../utils/otherApps";

interface Props {
  onClose: () => void;
  /** 점수를 받았을 때 바깥 화면을 다시 읽게 한다. */
  onEarned: () => void;
}

/**
 * 다른 미니앱을 둘러보고 출석점수를 받는 목록.
 *
 * 앱을 열면 토스가 그 앱으로 넘어가고 우리 웹뷰는 뒤에 남는다. 돌아왔는지 알 방법이
 * 없어 열어본 뒤 직접 받기를 누르게 한다. 앱마다 하루 한 번이다.
 *
 * 받은 점수는 출석 선물과 같은 상자 연출로 보여준다 — 금액이 1,000~2,000점으로
 * 매번 다르므로 열어보는 재미가 있다.
 */
export default function OtherAppsModal({ onClose, onEarned }: Props) {
  const [opening, setOpening] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  /** 받은 점수. 값이 있으면 선물상자 화면으로 바뀐다. */
  const [reward, setReward] = useState<number | null>(null);
  const [boxOpened, setBoxOpened] = useState(false);
  // 열고 나서도 목록이 "받음"으로 바뀌어 보이도록 다시 그린다.
  const [, forceRender] = useState(0);

  /** 앱을 연다. 보상은 여기서 주지 않고, 돌아와서 "받기"를 눌러야 준다. */
  const handleOpen = async (appName: string) => {
    if (opening) return;
    setOpening(appName);
    setMessage(null);
    try {
      const result = await openOtherApp(appName);
      if (result.unsupported) {
        setMessage("토스 앱에서만 열 수 있어요.");
        return;
      }
      forceRender((n) => n + 1);
    } finally {
      setOpening(null);
    }
  };

  /** 열어본 앱의 선물상자를 받는다. */
  const handleClaim = (appName: string) => {
    const earned = claimVisitReward(appName);
    if (earned <= 0) return;
    setBoxOpened(false);
    setReward(earned);
    onEarned();
  };

  // 보상 화면 — 출석 선물과 같은 연출을 재사용한다.
  if (reward !== null) {
    return (
      <div className="attendance-gift-overlay">
        <section className={`attendance-gift-dialog${boxOpened ? " is-opened" : ""}`} role="dialog" aria-modal="true" aria-label="둘러보기 보상">
          <button className="attendance-gift-close" onClick={() => setReward(null)} aria-label="닫기">×</button>
          {!boxOpened ? (
            <>
              <h2 className="attendance-gift-title">둘러보기 완료!</h2>
              <div className="attendance-gift-rank">새 앱을 열어봤어요</div>
              <GiftBox onOpened={() => setBoxOpened(true)} label="출석점수 선물이 도착했어요" />
            </>
          ) : (
            <>
              <img className="attendance-gift-open-image" src="/rewards/gift-box-open.png" alt="포인트 동전이 나온 열린 선물 상자" />
              <h2 className="attendance-gift-title attendance-gift-result-title">와! 선물이 열렸어요!</h2>
              <div className="attendance-gift-points-list">
                <div className="attendance-gift-point-row">
                  <span>둘러보기 보상</span>
                  <strong>+{reward.toLocaleString()}점</strong>
                </div>
              </div>
              <div className="attendance-gift-total-label">총 지급 포인트</div>
              <div className="attendance-gift-total">+{reward.toLocaleString()}점</div>
              <button className="attendance-gift-confirm" onClick={() => setReward(null)}>확인</button>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="attendance-gift-overlay" onClick={onClose}>
      <section
        className="attendance-gift-dialog other-apps-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="다른 앱 둘러보기"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="attendance-gift-close" onClick={onClose} aria-label="닫기">×</button>
        <h2 className="attendance-gift-title">다른 앱 둘러보기</h2>
        <div className="attendance-gift-rank">
          하루에 한 번, 앱마다{" "}
          <strong>{OTHER_APP_VISIT_MIN.toLocaleString()}~{OTHER_APP_VISIT_MAX.toLocaleString()}점</strong>을 드려요.
        </div>

        <ul className="other-apps-list">
          {OTHER_APPS.map((app) => {
            const visited = hasVisited(app.appName);
            const ready = isRewardReady(app.appName);
            return (
              <li key={app.appName}>
                <button
                  type="button"
                  className={`other-apps-item${visited ? " is-visited" : ""}${ready ? " is-ready" : ""}`}
                  onClick={() => { ready ? handleClaim(app.appName) : void handleOpen(app.appName); }}
                  disabled={opening !== null || visited}
                  aria-label={visited
                    ? `${app.title} (오늘 받음)`
                    : ready
                      ? `${app.title} 선물상자 받기`
                      : `${app.title} 열기 — 둘러보면 선물상자 1개`}
                >
                  <span className="other-apps-emoji" aria-hidden="true">
                    {app.logo
                      ? <img src={app.logo} alt="" className="other-apps-logo" />
                      : app.emoji}
                  </span>
                  <span className="other-apps-copy">
                    <strong>{app.title}</strong>
                    <span>{ready ? "둘러봤어요! 선물상자를 받으세요" : app.description}</span>
                  </span>
                  <span className="other-apps-reward">
                    {opening === app.appName
                      ? "여는 중"
                      : visited
                        ? <><span aria-hidden="true">✓</span> 받음</>
                        : ready
                          ? <span className="other-apps-claim">받기</span>
                          : <>
                              <img className="other-apps-box" src="/rewards/gift-box-closed.png" alt="" aria-hidden="true" />
                              ×1
                            </>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {message && <p className="other-apps-message" role="alert">{message}</p>}

        <TossBannerAd
          adGroupId={BANNER_AD_GROUPS.text}
          variant="card"
          className="other-apps-ad"
        />
        <button className="attendance-gift-confirm" onClick={onClose}>닫기</button>
      </section>
    </div>
  );
}
