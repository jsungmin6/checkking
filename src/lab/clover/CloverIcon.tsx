import type { CSSProperties } from "react";

/** 행운의 클로버 찾기 앱에서 쓰는 네잎클로버 모양을 옮겼어요. */
export function CloverIcon({ size = 104, seed = 0, golden = false }: { size?: number; seed?: number; golden?: boolean }) {
  const hue = golden ? 43 : 105 + seed % 24;
  return <svg className="clover-found-leaf" width={size} height={size * 1.2} viewBox="0 0 120 144" fill="none" aria-hidden="true" style={{ "--leaf-hue": hue } as CSSProperties}>
    <path d="M60 65c-15 25 14 47-5 70" stroke={golden ? "#9a6a18" : "#57814b"} strokeWidth="2.2" strokeLinecap="round" />
    {[0, 90, 180, 270].map((angle, index) => <g key={angle} transform={`rotate(${angle + seed % 15 - 7} 60 60)`}>
      <path d="M60 60C48 53 27 45 29 26c1-17 23-23 31-7 9-16 30-10 31 7 2 19-19 27-31 34Z" fill={golden ? `hsl(43 88% ${62 + index * 2}%)` : `hsl(${hue} 32% ${34 + index * 3}%)`} stroke={golden ? "#9a6a18" : `hsl(${hue} 28% 30%)`} strokeWidth=".5" />
      <path d="M39 29c10 5 16 11 21 19 5-8 12-14 21-19" stroke={golden ? "#fff2b7" : `hsl(${hue - 5} 31% 70%)`} strokeWidth="2" opacity=".65" />
      <path d="M60 58V24M60 46 45 35m15 5 12-11M60 53l17-12" stroke="#dbe2ab" strokeWidth=".7" opacity=".35" />
    </g>)}
  </svg>;
}
