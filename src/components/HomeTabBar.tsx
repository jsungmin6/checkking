import TabIcon from "./TabIcon";
import type { TabIconName } from "./TabIcon";

type HomeTab = "home" | "publicRooms" | "profile";

interface HomeTabBarProps {
  active: HomeTab;
  onSelect: (tab: HomeTab) => void;
}

const TABS: { key: HomeTab; label: string; icon: TabIconName }[] = [
  { key: "home", label: "홈", icon: "home" },
  { key: "publicRooms", label: "방 찾기", icon: "search" },
  { key: "profile", label: "내 정보", icon: "profile" },
];

export default function HomeTabBar({ active, onSelect }: HomeTabBarProps) {
  return (
    <div style={{ display: "flex", flexShrink: 0, borderTop: "1px solid var(--border-color)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {TABS.map((tab) => {
        const on = active === tab.key;
        return (
          <div
            key={tab.key}
            onClick={() => onSelect(tab.key)}
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
              background: on ? "rgba(49, 130, 246, 0.12)" : "transparent",
            }}>
              <TabIcon name={tab.icon} />
            </span>
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { HomeTab };
