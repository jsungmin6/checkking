import { useLocalStorage } from "./useLocalStorage";
import { NEWS } from "../news";

/**
 * 업데이트 소식의 "안 읽음" 판정 — 마지막으로 열어본 시점의 최신 소식 id를 기기에 저장한다.
 * 처음 쓰는 사용자는 저장된 값이 없어 배지가 보이고, 새 소식을 배포하면 최신 id가 바뀌어 다시 보인다.
 */
export function useNews() {
  const [seenId, setSeenId] = useLocalStorage<string>("att-news-seen-id", "");
  const latestId = NEWS[0]?.id ?? "";

  return {
    news: NEWS,
    hasUnread: latestId !== "" && seenId !== latestId,
    markSeen: () => setSeenId(latestId),
  };
}
