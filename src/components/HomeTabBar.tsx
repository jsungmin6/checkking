import { useEffect, useState } from "react";
import TabIcon from "./TabIcon";
import type { TabIconName } from "./TabIcon";

type HomeTab = "home" | "publicRooms" | "lab" | "profile";

interface HomeTabBarProps {
  active: HomeTab;
  onSelect: (tab: HomeTab) => void;
}

const TABS: { key: HomeTab; label: string; icon: TabIconName }[] = [
  { key: "home", label: "홈", icon: "home" },
  { key: "publicRooms", label: "방 찾기", icon: "search" },
  { key: "lab", label: "놀이터", icon: "lab" },
  { key: "profile", label: "내 정보", icon: "profile" },
];

const PLAYGROUND_SEEN_KEY = "att-playground-seen-v1";

export default function HomeTabBar({ active, onSelect }: HomeTabBarProps) {
  const [playgroundSeen, setPlaygroundSeen] = useState(() => localStorage.getItem(PLAYGROUND_SEEN_KEY) === "1");

  useEffect(() => {
    if (active === "lab" && !playgroundSeen) {
      localStorage.setItem(PLAYGROUND_SEEN_KEY, "1");
      setPlaygroundSeen(true);
    }
  }, [active, playgroundSeen]);

  return (
    <div style={{ display: "flex", flexShrink: 0, borderTop: "1px solid var(--border-color)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {TABS.map((tab) => {
        const on = active === tab.key;
        return (
          <div
            key={tab.key}
            onClick={() => {
              if (tab.key === "lab" && !playgroundSeen) {
                localStorage.setItem(PLAYGROUND_SEEN_KEY, "1");
                setPlaygroundSeen(true);
              }
              onSelect(tab.key);
            }}
            role="tab"
            aria-selected={on}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "8px 0 9px", cursor: "pointer",
              color: on ? "var(--accent-blue)" : "var(--text-muted)",
            }}
          >
            {/* 선택된 탭만 알약 배경을 깔아, 글자색만으로 구분할 때보다 눈에 잘 띄게 한다. */}
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 30, borderRadius: 15,
              position: "relative",
              background: on ? "rgba(49, 130, 246, 0.12)" : "transparent",
            }}>
              <TabIcon name={tab.icon} />
              {tab.key === "lab" && !playgroundSeen && !on && (
                <span aria-label="새 놀이터" style={{
                  position: "absolute", top: 1, right: 8, width: 9, height: 9,
                  border: "2px solid var(--bg-primary)", borderRadius: "50%", background: "var(--accent-red, #F04452)",
                }} />
              )}
            </span>
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { HomeTab };
