import { reportAppEntryReferrer } from "./utils/reportAppEntryReferrer";
import { createRoot } from "react-dom/client";
import App from "./App";
import { hydrateNativeStore } from "./utils/nativeStore";
import "./styles/global.css";
import "./styles/animations.css";

// 복권 로컬 시연을 위해 개발 서버를 새로 열 때마다 구매 잔액을 초기화한다.
if (import.meta.env.DEV) {
  localStorage.setItem("att-points-total", "10000");
  forceStreakFromQuery();
}

/**
 * `?streak=18`로 연속일을 강제한다. **개발 서버 전용.**
 *
 * 출석을 실제로 쌓지 않고도 7·12·17일차 화면을 확인하려는 용도다. 수령 내역은
 * 비우므로, 서버에서 그 일수를 막 당겨온 사용자와 같은 상태가 된다 — 지난
 * 지급일이 한꺼번에 열린다.
 *
 * `?streak=0`이면 기록을 지워 처음 상태로 되돌린다.
 */
function forceStreakFromQuery() {
  const raw = new URLSearchParams(window.location.search).get("streak");
  if (raw === null) return;
  const streak = Number(raw);
  if (!Number.isInteger(streak) || streak < 0 || streak > 100) return;

  if (streak === 0) {
    localStorage.removeItem("att-streak-progress");
    localStorage.removeItem("att-streak-toss-paid");
    return;
  }
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const start = new Date(`${today}T00:00:00+09:00`);
  start.setDate(start.getDate() - (streak - 1));
  localStorage.setItem("att-streak-progress", JSON.stringify({
    streak,
    cycleStart: start.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
    lastAttended: today,
    claimedDays: [],
    synced: true,
  }));
  localStorage.removeItem("att-streak-toss-paid");
}

reportAppEntryReferrer("checkking");

/**
 * 네이티브 Storage의 점수·누적액을 localStorage로 당겨온 뒤 렌더한다.
 *
 * 먼저 렌더하면 첫 프레임이 0점으로 보이고, 그 상태에서 보상을 받으면 작은 값으로
 * 덮어쓸 수 있다. 저장소를 못 읽어도 렌더는 해야 하므로 실패는 삼킨다.
 */
void hydrateNativeStore()
  .catch(() => {})
  .finally(() => createRoot(document.getElementById("root")!).render(<App />));
