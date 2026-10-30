interface PhotoAttendanceConfirmModalProps {
  imageDataUri: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export default function PhotoAttendanceConfirmModal({ imageDataUri, busy, error, onCancel, onRetake, onConfirm }: PhotoAttendanceConfirmModalProps) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div role="dialog" aria-modal="true" aria-label="출석 사진 확인" style={{ width: "100%", maxWidth: 380, background: "var(--bg-card)", borderRadius: 20, padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>이 사진으로 출석할까요?</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 14 }}>확인하면 출석이 완료되고 사진이 인사에 올라갑니다.</div>
        <img src={imageDataUri} alt="출석 인증 사진 미리보기" style={{ display: "block", width: "100%", maxHeight: "48vh", objectFit: "contain", borderRadius: 14, background: "var(--bg-secondary, #f4f6f8)" }} />
        {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={secondaryButton}>취소</button>
          <button type="button" onClick={onRetake} disabled={busy} style={secondaryButton}>다시 촬영</button>
          <button type="button" onClick={onConfirm} disabled={busy} style={primaryButton}>{busy ? "출석 중..." : "확인"}</button>
        </div>
      </div>
    </div>
  );
}

const secondaryButton: React.CSSProperties = { flex: 1, padding: "12px 8px", borderRadius: 12, border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)", fontSize: 13, fontWeight: 700 };
const primaryButton: React.CSSProperties = { flex: 1, padding: "12px 8px", borderRadius: 12, border: "none", background: "var(--accent-blue)", color: "#fff", fontSize: 13, fontWeight: 800 };
