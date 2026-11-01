import { useState } from "react";
import GiftBox from "./GiftBox";
import { reportMissionCompleted } from "../hooks/useMissions";
import { showTossInterstitialAd } from "../utils/tossRewardedAd";
import type { MissionState } from "../hooks/useMissions";

/** 콘솔 광고 그룹 "출석왕_전면형". */
const MISSION_REWARD_AD_GROUP_ID = "ait.v2.live.3e114abe2d31408c";

interface MissionModalProps {
  missions: MissionState[];
  onClose: () => void;
  /** 선물상자를 열어 보상이 확정됐을 때 */
  /** 적립 금액은 서버가 정한다. 여기서는 어떤 미션인지만 알린다. */
  onRewarded: (missionId: string) => void;
}

export default function MissionModal({ missions, onClose, onRewarded }: MissionModalProps) {
  /** 보상 수령 중인 미션 — null이면 목록 화면. */
  const [claiming, setClaiming] = useState<MissionState | null>(null);
  const [opened, setOpened] = useState(false);
  /**
   * 펼쳐 둔 미션. 한 번에 하나만 펼친다 — 전부 펼치면 예전처럼 길어진다.
   *
   * 처음에는 **받을 수 있는 미션**을 펼친다. 전부 접어 두면 보상받기 버튼이 숨어
   * 한 번 더 눌러야 한다. 받을 게 없으면 전부 접힌 채로 시작한다.
   */
  const [expandedId, setExpandedId] = useState<string | null>(
    () => missions.find((m) => m.done)?.id ?? null,
  );
  /** 광고를 불러오는 중인 미션. 그동안 버튼을 잠가 두 번 눌리지 않게 한다. */
  const [loadingAdFor, setLoadingAdFor] = useState<string | null>(null);

  /**
   * 광고를 본 뒤 보상 단계로 넘어간다.
   *
   * 광고가 실패해도 그냥 넘어간다 — {@link showTossInterstitialAd}가 던지지 않는다.
   * 받을 수 있는 보상을 광고 사정으로 막으면 안 된다.
   */
  const handleClaim = async (mission: MissionState) => {
    if (loadingAdFor) return;
    setLoadingAdFor(mission.id);
    try {
      await showTossInterstitialAd(MISSION_REWARD_AD_GROUP_ID);
    } finally {
      setLoadingAdFor(null);
      setOpened(false);
      setClaiming(mission);
    }
  };

  const handleGiftOpened = () => {
    if (!claiming) return;
    setOpened(true);
    onRewarded(claiming.id);
    // 이전 버전에서 이미 완료해 둔 미션이나 완료 시 알림 전송에 실패한 경우를 보완한다.
    reportMissionCompleted(claiming.id);
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
                  <strong>+{claiming.reward.toLocaleString()}점</strong>
                </div>
              </div>
              <div className="attendance-gift-total-label">총 지급 포인트</div>
              <div className="attendance-gift-total">+{claiming.reward.toLocaleString()}점</div>
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

        {missions.map((mission, index) => {
          const expanded = expandedId === mission.id;
          return (
          <div
            key={mission.id}
            style={{
              paddingTop: index === 0 ? 0 : 14, marginTop: index === 0 ? 0 : 14,
              borderTop: index === 0 ? "none" : "1px solid var(--border-light)",
            }}
          >
            {/* 제목 줄만 보이고, 누르면 펼쳐진다. 미션이 늘어도 목록이 길어지지 않는다. */}
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : mission.id)}
              aria-expanded={expanded}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "6px 0", border: "none", background: "transparent",
                color: "var(--text-primary)", textAlign: "left", cursor: "pointer",
              }}
            >
              {mission.titleImage && <img src={mission.titleImage} alt="" style={{ width: 25, height: 25, objectFit: "contain", flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800 }}>{mission.title}</span>
              {mission.done ? (
                <span style={{
                  flexShrink: 0, padding: "3px 8px", borderRadius: 7, fontSize: 11, fontWeight: 800,
                  background: "rgba(49,130,246,0.12)", color: "var(--accent-blue)",
                }}>
                  받기
                </span>
              ) : mission.targetCount !== undefined ? (
                <span style={{ flexShrink: 0, color: "var(--text-secondary)", fontSize: 12, fontWeight: 700 }}>
                  {mission.progress}/{mission.targetCount}
                </span>
              ) : null}
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0, color: "var(--text-muted)", fontSize: 18, lineHeight: 1,
                  transform: expanded ? "rotate(180deg)" : "none", transition: "transform .18s ease",
                }}
              >
                ⌄
              </span>
            </button>

            {!expanded ? null : (
            <>
            <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "6px 0", marginBottom: mission.guideImage || mission.guideSteps?.length ? 10 : 14 }}>
              {mission.description}
            </div>

            {mission.guideSteps?.map((step) => (
              <div key={step.image} style={{ marginBottom: 12 }}>
                <img
                  src={step.image}
                  alt={step.caption}
                  style={{ width: "100%", borderRadius: 12, display: "block" }}
                />
                <div style={{ marginTop: 5, color: "var(--text-secondary)", fontSize: 12 }}>{step.caption}</div>
              </div>
            ))}

            {mission.guideImage && (
              <img
                src={mission.guideImage}
                alt="어디를 누르면 되는지 보여주는 화면"
                style={{ width: "100%", borderRadius: 12, marginBottom: 14, display: "block" }}
              />
            )}

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
              {mission.targetCount !== undefined && (
                <span style={{ flexShrink: 0, color: mission.done ? "var(--accent-green, #34C759)" : "var(--text-secondary)", fontSize: 13, fontWeight: 750 }}>
                  {mission.progress}/{mission.targetCount}
                </span>
              )}
              {/* 보상 금액은 선물상자를 열 때 알게 한다 */}
              <img src="/rewards/gift-box-closed.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />
            </div>

            {mission.done ? (
              <button
                onClick={() => { void handleClaim(mission); }}
                disabled={loadingAdFor !== null}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: 13, borderRadius: "var(--radius-button)", border: "none",
                  background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 800,
                  cursor: loadingAdFor !== null ? "default" : "pointer",
                  opacity: loadingAdFor !== null ? 0.6 : 1,
                }}
              >
                {loadingAdFor === mission.id && <span className="ad-loading-spinner" aria-hidden="true" />}
                {loadingAdFor === mission.id ? "광고 불러오는 중" : "광고 보고 보상받기"}
              </button>
            ) : (
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", padding: "6px 0" }}>
                아직 완료하지 않았어요
              </div>
            )}
            </>
            )}
          </div>
          );
        })}

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
