import { useState } from "react";
import TossBannerAd, { BANNER_AD_GROUPS } from "./TossBannerAd";
import {
  OTHER_APPS,
  OTHER_APP_VISIT_POINTS,
  hasVisited,
  visitOtherApp,
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
 * 없어 **여는 순간** 점수를 준다. 앱마다 한 번뿐이다.
 */
export default function OtherAppsModal({ onClose, onEarned }: Props) {
  const [opening, setOpening] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // 열고 나서도 목록이 "받음"으로 바뀌어 보이도록 다시 그린다.
  const [, forceRender] = useState(0);

  const handleVisit = async (appName: string) => {
    if (opening) return;
    setOpening(appName);
    setMessage(null);
    try {
      const result = await visitOtherApp(appName);
      if (result.unsupported) {
        setMessage("토스 앱에서만 열 수 있어요.");
        return;
      }
      if (result.earned > 0) onEarned();
      forceRender((n) => n + 1);
    } finally {
      setOpening(null);
    }
  };

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
          처음 열어보는 앱마다 <strong>{OTHER_APP_VISIT_POINTS.toLocaleString()}점</strong>을 드려요.
        </div>

        <ul className="other-apps-list">
          {OTHER_APPS.map((app) => {
            const visited = hasVisited(app.appName);
            return (
              <li key={app.appName}>
                <button
                  type="button"
                  className={`other-apps-item${visited ? " is-visited" : ""}`}
                  onClick={() => { void handleVisit(app.appName); }}
                  disabled={opening !== null}
                  aria-label={`${app.title} 열기${visited ? " (이미 받음)" : ` — ${OTHER_APP_VISIT_POINTS.toLocaleString()}점 받기`}`}
                >
                  <span className="other-apps-emoji" aria-hidden="true">{app.emoji}</span>
                  <span className="other-apps-copy">
                    <strong>{app.title}</strong>
                    <span>{app.description}</span>
                  </span>
                  <span className="other-apps-reward">
                    {opening === app.appName
                      ? "여는 중"
                      : visited
                        ? <><span aria-hidden="true">✓</span> 받음</>
                        : `+${OTHER_APP_VISIT_POINTS.toLocaleString()}점`}
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
