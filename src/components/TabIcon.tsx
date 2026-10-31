/**
 * 하단 탭바 아이콘 모음 — 토스처럼 "아이콘 + 글자" 조합으로 쓰려고 직접 그린 것들이다.
 * 작은 크기(22px)에서 뭉개지지 않도록 선이 아니라 면으로 채운다.
 */
export type TabIconName =
  | "home" | "search" | "lab" | "profile"
  | "today" | "greeting" | "ranking" | "stats" | "settings";

interface TabIconProps {
  name: TabIconName;
  size?: number;
}

export default function TabIcon({ name, size = 22 }: TabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

const PATHS: Record<TabIconName, React.ReactNode> = {
  // 집 — 가운데 문이 뚫린 모양
  home: (
    <path d="M11.1 2.9a1.4 1.4 0 0 1 1.8 0l8 6.9c.3.3.5.7.5 1.1V20a1.6 1.6 0 0 1-1.6 1.6h-4.4V15a1.4 1.4 0 0 0-1.4-1.4h-4A1.4 1.4 0 0 0 8.6 15v6.6H4.2A1.6 1.6 0 0 1 2.6 20v-9.1c0-.4.2-.8.5-1.1Z" />
  ),
  // 돋보기
  search: (
    <path
      fillRule="evenodd" clipRule="evenodd"
      d="M10.8 2.6a8.2 8.2 0 1 1-4.6 15l-2.6 2.6a1.4 1.4 0 0 1-2-2l2.6-2.6a8.2 8.2 0 0 1 6.6-13Zm0 2.8a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8Z"
    />
  ),
  // 놀이터 — 플라스크
  lab: (
    <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1.2 1.2 0 0 0 0 2.4h.8v5.1l-5.1 8.1A2.9 2.9 0 0 0 7.2 22h9.6a2.9 2.9 0 0 0 2.5-4.4l-5.1-8.1V4.4h.8a1.2 1.2 0 0 0 0-2.4H9Zm3.2 8.2-4.3 6.9h8.2l-4.3-6.9V4.4h-1.2v5.8h1.6Z" />
  ),
  // 사람
  profile: (
    <>
      <circle cx="12" cy="7.8" r="4.3" />
      <path d="M12 14.2c-4.4 0-7.9 2.3-7.9 5.7 0 .9.7 1.6 1.6 1.6h12.6c.9 0 1.6-.7 1.6-1.6 0-3.4-3.5-5.7-7.9-5.7Z" />
    </>
  ),
  // 오늘 출석 — 체크
  today: (
    <path
      fillRule="evenodd" clipRule="evenodd"
      d="M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm4.8 7.1-5.9 5.9a1.4 1.4 0 0 1-2 0l-2.7-2.7a1.4 1.4 0 0 1 2-2l1.7 1.7 4.9-4.9a1.4 1.4 0 1 1 2 2Z"
    />
  ),
  // 인사 — 말풍선
  greeting: (
    <path d="M12 3.2c-5.1 0-9.2 3.5-9.2 7.9 0 2.4 1.3 4.6 3.3 6v3.2a1 1 0 0 0 1.5.9l3.2-1.9c.4 0 .8.1 1.2.1 5.1 0 9.2-3.5 9.2-7.9S17.1 3.2 12 3.2Z" />
  ),
  // 랭킹 — 왕관 ("출석왕"이라 트로피보다 어울린다)
  ranking: (
    <>
      <path d="M2 8.4 6.6 12 12 5.6 17.4 12 22 8.4 20.2 16.8H3.8Z" />
      <path d="M4.4 18.5h15.2a1.3 1.3 0 0 1 0 2.6H4.4a1.3 1.3 0 0 1 0-2.6Z" />
    </>
  ),
  // 통계 — 막대그래프
  stats: (
    <>
      <rect x="3.2" y="12.6" width="4.4" height="8.4" rx="1.5" />
      <rect x="9.8" y="7.4" width="4.4" height="13.6" rx="1.5" />
      <rect x="16.4" y="3" width="4.4" height="18" rx="1.5" />
    </>
  ),
  // 설정 — 톱니바퀴
  settings: (
    <>
      {[0, 45, 90, 135].map((angle) => (
        <rect key={angle} x="10.2" y="3.6" width="3.6" height="16.8" rx="1" transform={`rotate(${angle} 12 12)`} />
      ))}
      <path
        fillRule="evenodd" clipRule="evenodd"
        d="M12 5.6a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8Zm0 3.7a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z"
      />
    </>
  ),
};
