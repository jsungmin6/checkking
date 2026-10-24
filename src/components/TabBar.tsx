type TabName = "today" | "greeting" | "ranking" | "stats" | "settings";

interface TabBarProps {
  active: TabName;
  onSelect: (tab: TabName) => void;
}

const TABS: { key: TabName; label: string }[] = [
  { key: "today", label: "순위" },
  { key: "greeting", label: "인사" },
  { key: "ranking", label: "랭킹" },
  { key: "stats", label: "통계" },
  { key: "settings", label: "설정" },
];

export default function TabBar({ active, onSelect }: TabBarProps) {
  return (
    <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", paddingBottom: "env(safe-area-inset-bottom)" }}>
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

export type { TabName };
