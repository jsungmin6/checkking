type HomeTab = "home" | "publicRooms" | "profile";

interface HomeTabBarProps {
  active: HomeTab;
  onSelect: (tab: HomeTab) => void;
}

const TABS: { key: HomeTab; label: string }[] = [
  { key: "home", label: "홈" },
  { key: "publicRooms", label: "방 찾기" },
  { key: "profile", label: "내 정보" },
];

export default function HomeTabBar({ active, onSelect }: HomeTabBarProps) {
  return (
    <div style={{ display: "flex", flexShrink: 0, borderTop: "1px solid var(--border-color)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {TABS.map((tab) => (
        <div
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "14px 0",
            fontSize: 13,
            color: active === tab.key ? "var(--accent-blue)" : "var(--text-muted)",
            fontWeight: active === tab.key ? 600 : 400,
            cursor: "pointer",
          }}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}

export type { HomeTab };
