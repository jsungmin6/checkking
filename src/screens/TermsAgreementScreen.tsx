import { useState } from "react";
import TermsViewer from "../components/TermsViewer";

interface TermsAgreementScreenProps {
  onAgree: () => void;
  onCancel: () => void;
}

interface TermItem {
  id: string;
  label: string;
  url: string;
  required: boolean;
}

interface AgeCheckItem {
  id: string;
  label: string;
  required: boolean;
}

const TERMS: TermItem[] = [
  { id: "terms", label: "서비스 이용약관", url: "/terms.html", required: true },
  { id: "privacy", label: "개인정보 처리방침", url: "/privacy.html", required: true },
  { id: "location", label: "위치정보 이용약관", url: "/location-terms.html", required: true },
];

const AGE_CHECK: AgeCheckItem = { id: "age14", label: "만 14세 이상입니다", required: true };

export default function TermsAgreementScreen({ onAgree, onCancel }: TermsAgreementScreenProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [viewingTerms, setViewingTerms] = useState<{ url: string; title: string } | null>(null);

  const allItems = [...TERMS.map((t) => t.id), AGE_CHECK.id];
  const allChecked = allItems.every((id) => checked[id]);
  const allRequired = TERMS.filter((t) => t.required).every((t) => checked[t.id]) && checked[AGE_CHECK.id];

  const toggleAll = () => {
    if (allChecked) {
      setChecked({});
    } else {
      const all: Record<string, boolean> = {};
      allItems.forEach((id) => { all[id] = true; });
      setChecked(all);
    }
  };

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="page" style={{ justifyContent: "center", padding: 24, background: "var(--bg-card)" }}>
      {viewingTerms && <TermsViewer url={viewingTerms.url} title={viewingTerms.title} onClose={() => setViewingTerms(null)} />}
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>약관 동의</div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
        서비스 이용을 위해 약관에 동의해주세요.
      </div>

      {/* 전체 동의 */}
      <label style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 0",
        borderBottom: "1px solid var(--border)", cursor: "pointer", marginBottom: 4,
      }}>
        <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ width: 20, height: 20, accentColor: "var(--accent-blue)" }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>전체 동의</span>
      </label>

      {/* 개별 약관 */}
      {TERMS.map((item) => (
        <div key={item.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 0",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}>
            <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)} style={{ width: 18, height: 18, accentColor: "var(--accent-blue)" }} />
            <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
              <span style={{ color: "var(--accent-blue)", marginRight: 4 }}>[필수]</span>
              {item.label}
            </span>
          </label>
          <span onClick={() => setViewingTerms({ url: item.url, title: item.label })} style={{
            fontSize: 13, color: "var(--text-secondary)", textDecoration: "underline", cursor: "pointer",
          }}>보기</span>
        </div>
      ))}

      {/* 만 14세 이상 확인 */}
      <div style={{
        display: "flex", alignItems: "center", padding: "12px 0",
        borderTop: "1px solid var(--border)", marginTop: 4,
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={!!checked[AGE_CHECK.id]} onChange={() => toggle(AGE_CHECK.id)} style={{ width: 18, height: 18, accentColor: "var(--accent-blue)" }} />
          <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
            <span style={{ color: "var(--accent-blue)", marginRight: 4 }}>[필수]</span>
            {AGE_CHECK.label}
          </span>
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: 14, borderRadius: 12, background: "var(--bg-secondary)",
          color: "var(--text-secondary)", fontSize: 15, fontWeight: 600, border: "none",
        }}>
          취소
        </button>
        <button onClick={onAgree} disabled={!allRequired} style={{
          flex: 2, padding: 14, borderRadius: 12, background: allRequired ? "var(--accent-blue)" : "#ccc",
          color: "#fff", fontSize: 15, fontWeight: 600, border: "none",
          opacity: allRequired ? 1 : 0.6,
        }}>
          동의하고 시작하기
        </button>
      </div>
    </div>
  );
}
