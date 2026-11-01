import { reportAppEntryReferrer } from "./utils/reportAppEntryReferrer";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/animations.css";

// 복권 로컬 시연을 위해 개발 서버를 새로 열 때마다 구매 잔액을 초기화한다.
if (import.meta.env.DEV) {
  localStorage.setItem("att-points-total", "10000");
}

reportAppEntryReferrer("checkking");

createRoot(document.getElementById("root")!).render(<App />);
