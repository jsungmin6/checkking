type HomeTab = "home" | "profile";

interface HomeTabBarProps {
  active: HomeTab;
  onSelect: (tab: HomeTab) => void;
}

export default function HomeTabBar({ active, onSelect }: HomeTabBarProps) {
  const tabs: { key: HomeTab; label: string; icon: string }[] = [
    { key: "home", label: "홈", icon: "🏠" },
    { key: "profile", label: "내 정보", icon: "👤" },
  ];

  return (
    <div
      style={{
        display: "flex",
        borderTop: "1px solid var(--border-color)",
        background: "var(--bg-card)",
        boxShadow: "0 -1px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "10px 0 8px",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 2 }}>{tab.icon}</div>
          <div
            style={{
              fontSize: 11,
              color: active === tab.key ? "var(--accent-blue)" : "var(--text-muted)",
              fontWeight: active === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { HomeTab };
