import { useState } from "react";
import GiftBox from "./GiftBox";
import { api } from "../utils/api";
import type { MissionState } from "../hooks/useMissions";

interface MissionModalProps {
  missions: MissionState[];
  onClose: () => void;
  /** 선물상자를 열어 보상이 확정됐을 때 */
  onRewarded: (missionId: string, amount: number) => void;
}

export default function MissionModal({ missions, onClose, onRewarded }: MissionModalProps) {
  /** 보상 수령 중인 미션 — null이면 목록 화면. */
  const [claiming, setClaiming] = useState<MissionState | null>(null);
  const [opened, setOpened] = useState(false);

  const handleGiftOpened = () => {
    if (!claiming) return;
    setOpened(true);
    onRewarded(claiming.id, claiming.reward);
    // 누가 미션을 끝냈는지 운영자가 알 수 있게 알린다. 실패해도 보상에는 영향이 없다.
    void api("/notifications/mission-completed", {
      method: "POST",
      body: JSON.stringify({ missionId: claiming.id }),
    }).catch(() => {});
  };

  // 보상 수령 단계 — 출석 선물(AttendanceGiftModal)과 동일한 연출을 재사용한다.
  if (claiming) {
    return (
      <div className="attendance-gift-overlay">
        <section className={`attendance-gift-dialog${opened ? " is-opened" : ""}`} role="dialog" aria-modal="true" aria-label="미션 보상">
          <button className="attendance-gift-close" onClick={onClose} aria-label="닫기">×</button>
          {!opened ? (
            <>
              <h2 className="attendance-gift-title">미션 완료!</h2>
              <div className="attendance-gift-rank">{claiming.title}</div>
              <GiftBox onOpened={handleGiftOpened} label="미션 보상이 도착했어요" />
            </>
          ) : (
            <>
              <img className="attendance-gift-open-image" src="/rewards/gift-box-open.png" alt="포인트 동전이 나온 열린 선물 상자" />
              <h2 className="attendance-gift-title attendance-gift-result-title">와! 선물이 열렸어요!</h2>
              <div className="attendance-gift-points-list">
                <div className="attendance-gift-point-row">
                  <span>미션 보상</span>
                  <strong>+{claiming.reward.toLocaleString()}P</strong>
                </div>
              </div>
              <div className="attendance-gift-total-label">총 지급 포인트</div>
              <div className="attendance-gift-total">+{claiming.reward.toLocaleString()}P</div>
              <button className="attendance-gift-confirm" onClick={onClose}>확인</button>
            </>
          )}
        </section>
      </div>
    );
  }

  // 미션 목록
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="이벤트 미션"
        style={{
          position: "relative", width: "100%", maxWidth: 360, maxHeight: "85vh", overflowY: "auto",
          background: "var(--bg-card)", borderRadius: 20, padding: "24px 20px 20px",
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "transparent", color: "var(--text-muted)",
            fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 0,
          }}
        >
          ×
        </button>

        <div style={{
          display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
          color: "var(--accent-orange, #FF9500)", background: "rgba(255,149,0,0.12)",
          padding: "4px 9px", borderRadius: 7, marginBottom: 14,
        }}>
          이벤트 미션
        </div>

        {missions.map((mission, index) => (
          <div
            key={mission.id}
            style={{
              paddingTop: index === 0 ? 0 : 16, marginTop: index === 0 ? 0 : 16,
              borderTop: index === 0 ? "none" : "1px solid var(--border-light)",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{mission.title}</div>
            <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
              {mission.description}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: 13, borderRadius: "var(--radius-card)",
              background: "var(--bg-secondary)", marginBottom: 12,
            }}>
              <span style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                background: mission.done ? "var(--accent-green, #34C759)" : "var(--border-color)",
                color: "#fff", fontSize: 13, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                ✓
              </span>
              <span style={{
                flex: 1, fontSize: 14, fontWeight: 600,
                color: mission.done ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: mission.done ? "line-through" : "none",
              }}>
                {mission.todo}
              </span>
              {/* 보상 금액은 선물상자를 열 때 알게 한다 */}
              <img src="/rewards/gift-box-closed.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />
            </div>

            {mission.done ? (
              <button
                onClick={() => { setOpened(false); setClaiming(mission); }}
                style={{
                  width: "100%", padding: 13, borderRadius: "var(--radius-button)", border: "none",
                  background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                }}
              >
                보상받기
              </button>
            ) : (
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", padding: "6px 0" }}>
                아직 완료하지 않았어요
              </div>
            )}
          </div>
        ))}

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: 13, marginTop: 16, borderRadius: "var(--radius-button)",
            border: "1px solid var(--border-color)", background: "transparent",
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
