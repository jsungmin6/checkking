import { isTossApp } from "../utils/platform";

interface BackHeaderProps {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export default function BackHeader({ title, onBack, right }: BackHeaderProps) {
  // 앱인토스는 네이티브 내비게이션 바에 뒤로가기 버튼이 있으므로
  // 미니앱 화면 안의 두 번째 헤더/뒤로가기는 표시하지 않는다.
  if (isTossApp()) return null;

  return (
    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 8 }}>
      <span onClick={onBack} style={{ color: "var(--text-secondary)", cursor: "pointer", fontSize: 18 }}>←</span>
      <span style={{ fontWeight: 600, fontSize: 17 }}>{title}</span>
      {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
    </div>
  );
}
