import { useState } from "react";
import { api, ApiError } from "../utils/api";
import { AVATAR_COUNT, avatarEmojiSrc } from "../utils/emoji";
import { hasChangedAvatarToday, markAvatarChangedToday } from "../utils/avatarChangeLimit";
import { showTossRewardedAd, reportAdLoadFailed } from "../utils/tossRewardedAd";

// 기존 "출석왕_랭킹보기_리워드" 광고 그룹 재사용 — 포인트 전환에서 쓰는 것과 같은 그룹이다.
const AVATAR_CHANGE_AD_GROUP_ID = "ait.v2.live.320548a2f8304a56";

interface Props {
  userId: number;
  /** 지금 쓰고 있는 그림을 가리키는 값 — avatarIndex가 없으면 userId를 그대로 쓴다. */
  currentIndex: number;
  onClose: () => void;
  onChanged: (avatarIndex: number) => void;
}

type Step = "idle" | "watchingAd" | "confirm" | "saving";

function pickCandidate(exclude: number): number {
  const excludeMod = ((exclude % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  // 후보가 하나뿐이면(이론상 AVATAR_COUNT가 1일 때) 바꿀 방법이 없으니 그대로 둔다.
  if (AVATAR_COUNT <= 1) return excludeMod;
  let candidate = excludeMod;
  while (candidate === excludeMod) {
    candidate = Math.floor(Math.random() * AVATAR_COUNT);
  }
  return candidate;
}

export default function AvatarChangeModal({ userId, currentIndex, onClose, onChanged }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [candidate, setCandidate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alreadyChangedToday = hasChangedAvatarToday();

  const handleWatchAd = async () => {
    setError(null);
    setStep("watchingAd");
    let watched: boolean;
    try {
      watched = await showTossRewardedAd(AVATAR_CHANGE_AD_GROUP_ID);
    } catch (adError) {
      setStep("idle");
      reportAdLoadFailed(AVATAR_CHANGE_AD_GROUP_ID, adError instanceof Error ? adError.message : "unknown_error");
      setError("광고 불러오기가 실패했어요. 다음에 시도해주세요");
      return;
    }
    if (!watched) {
      setStep("idle");
      setError("광고를 끝까지 봐야 캐릭터를 바꿀 수 있어요");
      return;
    }
    setCandidate(pickCandidate(currentIndex));
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (candidate === null) return;
    setStep("saving");
    try {
      await api("/users/me/avatar", {
        method: "PUT",
        body: JSON.stringify({ avatarIndex: candidate }),
      });
      markAvatarChangedToday();
      onChanged(candidate);
      onClose();
    } catch (e) {
      setStep("confirm");
      setError(e instanceof ApiError ? e.message : "바꾸는 데 실패했어요");
    }
  };

  const handleDecline = () => {
    // 다시 뽑을 수 있게 처음 화면으로 — 오늘 안 바꾼 건 그대로라 또 광고를 보면 된다.
    setCandidate(null);
    setStep("idle");
  };

  return (
    <div
      onClick={step === "saving" ? undefined : onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(0, 0, 0, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="프로필 캐릭터 바꾸기"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 320, background: "var(--bg-card)",
          borderRadius: 20, padding: "24px 20px 20px", textAlign: "center",
        }}
      >
        {step !== "saving" && (
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              position: "absolute", top: 12, right: 14, background: "none", border: "none",
              fontSize: 22, lineHeight: 1, color: "var(--text-muted)", cursor: "pointer",
            }}
          >
            ×
          </button>
        )}

        {step === "confirm" || step === "saving" ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>이 캐릭터로 바꾸시겠습니까?</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
              <AvatarCircle src={avatarEmojiSrc(userId, currentIndex)} dim />
              <span style={{ fontSize: 18, color: "var(--text-secondary)" }}>→</span>
              <AvatarCircle src={avatarEmojiSrc(userId, candidate ?? currentIndex)} />
            </div>
            {error && <div style={{ color: "var(--accent-red)", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleDecline}
                disabled={step === "saving"}
                style={{
                  flex: 1, padding: 13, borderRadius: "var(--radius-button)", border: "1px solid var(--border-color)",
                  background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
                  cursor: step === "saving" ? "default" : "pointer", opacity: step === "saving" ? 0.5 : 1,
                }}
              >
                아니오
              </button>
              <button
                onClick={handleConfirm}
                disabled={step === "saving"}
                style={{
                  flex: 1, padding: 13, borderRadius: "var(--radius-button)", border: "none",
                  background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: step === "saving" ? "default" : "pointer", opacity: step === "saving" ? 0.7 : 1,
                }}
              >
                {step === "saving" ? "바꾸는 중..." : "예"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>프로필 캐릭터 바꾸기</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <AvatarCircle src={avatarEmojiSrc(userId, currentIndex)} large />
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
              {alreadyChangedToday
                ? "오늘은 이미 바꿨어요. 내일 다시 바꿀 수 있어요."
                : "광고를 보면 새 캐릭터를 하나 보여드려요. 마음에 들면 바꿀 수 있어요."}
            </div>
            {error && <div style={{ color: "var(--accent-red)", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button
              onClick={handleWatchAd}
              disabled={alreadyChangedToday || step === "watchingAd"}
              style={{
                width: "100%", padding: 14, borderRadius: "var(--radius-button)", border: "none",
                background: "var(--accent-blue)", color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: alreadyChangedToday || step === "watchingAd" ? "default" : "pointer",
                opacity: alreadyChangedToday ? 0.5 : step === "watchingAd" ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {step === "watchingAd" && (
                <span style={{
                  display: "inline-block", width: 16, height: 16, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
                  animation: "spin 0.8s linear infinite",
                }} />
              )}
              {step === "watchingAd" ? "광고 불러오는 중" : "광고 보고 바꾸기"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function AvatarCircle({ src, large, dim }: { src: string; large?: boolean; dim?: boolean }) {
  const size = large ? 76 : 56;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "var(--bg-secondary)",
      overflow: "hidden", padding: large ? 6 : 4, boxSizing: "border-box", opacity: dim ? 0.55 : 1,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}
