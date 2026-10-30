import TabIcon from "./TabIcon";
import type { TabIconName } from "./TabIcon";

type TabName = "today" | "greeting" | "ranking" | "stats" | "settings";

interface TabBarProps {
  active: TabName;
  onSelect: (tab: TabName) => void;
  /** 안 읽은 인사가 있으면 인사 탭에 점을 찍는다. */
  greetingUnread?: boolean;
}

const TABS: { key: TabName; label: string; icon: TabIconName }[] = [
  { key: "today", label: "순위", icon: "today" },
  { key: "greeting", label: "인사", icon: "greeting" },
  { key: "ranking", label: "랭킹", icon: "ranking" },
  { key: "stats", label: "통계", icon: "stats" },
  { key: "settings", label: "설정", icon: "settings" },
];

export default function TabBar({ active, onSelect, greetingUnread = false }: TabBarProps) {
  return (
    <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {TABS.map((tab) => {
        const on = active === tab.key;
        // 보고 있는 탭에 점을 찍어 둘 이유가 없다.
        const dot = tab.key === "greeting" && greetingUnread && !on;
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
            {/* 탭이 5개라 알약을 홈보다 좁게 잡는다. */}
            <span style={{
              position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 28, borderRadius: 14,
              background: on ? "rgba(49, 130, 246, 0.12)" : "transparent",
            }}>
              <TabIcon name={tab.icon} size={21} />
              {dot && (
                <span
                  aria-label="안 읽은 인사"
                  style={{
                    position: "absolute", top: 2, right: 7,
                    width: 7, height: 7, borderRadius: "50%",
                    background: "var(--accent-red)",
                  }}
                />
              )}
            </span>
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { TabName };
