interface RankOnlyModalProps {
  rank: number;
  onClose: () => void;
}

/** 선물/보너스를 하루 상한까지 다 받아서 더 줄 게 없을 때 보여주는 담백한 축하 모달 */
export default function RankOnlyModal({ rank, onClose }: RankOnlyModalProps) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 340, background: "var(--bg-card)", borderRadius: 20,
        padding: "28px 22px 22px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{rank}등이에요!</div>
        <button onClick={onClose} style={{
          width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
          background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
        }}>
          확인
        </button>
      </div>
    </div>
  );
}
