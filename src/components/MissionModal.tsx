import { useState } from "react";
import GiftBox from "./GiftBox";
import { api } from "../utils/api";
import { GREETING_MISSION } from "../missions";

interface MissionModalProps {
  /** 미션을 수행했는지 (인사를 남겼는지) */
  done: boolean;
  onClose: () => void;
  /** 선물상자를 열어 보상이 확정됐을 때 */
  onRewarded: (amount: number) => void;
}

export default function MissionModal({ done, onClose, onRewarded }: MissionModalProps) {
  const [opened, setOpened] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleGiftOpened = () => {
    setOpened(true);
    onRewarded(GREETING_MISSION.reward);
    // 누가 미션을 끝냈는지 운영자가 알 수 있게 서버에 알린다.
    // 보상은 이미 기기에 반영됐으므로, 전송이 실패해도 사용자에게는 영향이 없다.
    void api("/notifications/mission-completed", {
      method: "POST",
      body: JSON.stringify({ missionId: GREETING_MISSION.id }),
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
              <div className="attendance-gift-rank">{GREETING_MISSION.title}</div>
              <GiftBox onOpened={handleGiftOpened} label="미션 보상이 도착했어요" />
            </>
          ) : (
            <>
              <img className="attendance-gift-open-image" src="/rewards/gift-box-open.png" alt="포인트 동전이 나온 열린 선물 상자" />
              <h2 className="attendance-gift-title attendance-gift-result-title">와! 선물이 열렸어요!</h2>
              <div className="attendance-gift-points-list">
                <div className="attendance-gift-point-row">
                  <span>미션 보상</span>
                  <strong>+{GREETING_MISSION.reward.toLocaleString()}P</strong>
                </div>
              </div>
              <div className="attendance-gift-total-label">총 지급 포인트</div>
              <div className="attendance-gift-total">+{GREETING_MISSION.reward.toLocaleString()}P</div>
              <button className="attendance-gift-confirm" onClick={onClose}>확인</button>
            </>
          )}
        </section>
      </div>
    );
  }

  // 미션 안내 단계
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
        style={{ width: "100%", maxWidth: 360, background: "var(--bg-card)", borderRadius: 20, padding: "24px 20px" }}
      >
        <div style={{
          display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
          color: "var(--accent-orange, #FF9500)", background: "rgba(255,149,0,0.12)",
          padding: "4px 9px", borderRadius: 7, marginBottom: 10,
        }}>
          이벤트 미션
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{GREETING_MISSION.title}</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 18 }}>
          {GREETING_MISSION.description}
        </div>

        {/* 할 일 체크 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 14px", borderRadius: "var(--radius-card)",
          background: "var(--bg-secondary)", marginBottom: 14,
        }}>
          <span style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
            background: done ? "var(--accent-green, #34C759)" : "var(--border-color)",
            color: "#fff", fontSize: 13, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            ✓
          </span>
          <span style={{
            flex: 1, fontSize: 14, fontWeight: 600,
            color: done ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}>
            {GREETING_MISSION.todo}
          </span>
        </div>

        {/* 보상 — 금액은 선물상자를 열 때 알게 한다 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "13px 14px", borderRadius: "var(--radius-card)",
          border: "1px dashed var(--border-color)", marginBottom: 18,
        }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>보상</span>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <img src="/rewards/gift-box-closed.png" alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
            <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>출석 선물상자</strong>
          </span>
        </div>

        {done ? (
          <button
            onClick={() => setClaiming(true)}
            style={{
              width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
            }}
          >
            보상받기
          </button>
        ) : (
          <>
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
              아직 인사를 남기지 않았어요
            </div>
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: 14, borderRadius: "var(--radius-button)",
                border: "1px solid var(--border-color)", background: "transparent",
                color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
