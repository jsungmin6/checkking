import { reportAppEntryReferrer } from "./utils/reportAppEntryReferrer";
import { createRoot } from "react-dom/client";
import App from "./App";
import { hydrateNativeStore } from "./utils/nativeStore";
import "./styles/global.css";
import "./styles/animations.css";

// 복권 로컬 시연을 위해 개발 서버를 새로 열 때마다 구매 잔액을 초기화한다.
if (import.meta.env.DEV) {
  localStorage.setItem("att-points-total", "10000");
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
