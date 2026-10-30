import { useState, useEffect, useCallback, useRef } from "react";
import BackHeader from "../components/BackHeader";
import TabBar from "../components/TabBar";
import RankRow from "../components/RankRow";
import UserActionSheet, { isBlocked } from "../components/UserActionSheet";
import MemberProfileModal from "../components/MemberProfileModal";
import AttendanceGiftModal from "../components/AttendanceGiftModal";
import RankOnlyModal from "../components/RankOnlyModal";
import { hideAdBanner } from "../utils/admob";
import { api, ApiError } from "../utils/api";
import { collectCheckInData } from "../utils/location";
import { isTossApp } from "../utils/platform";
import { formatTime } from "../utils/time";
import { launchConfetti } from "../utils/confetti";
import { shareRoomInvite } from "../utils/invite";
import { markMissionDone } from "../hooks/useMissions";
import { maybePromptPushConsentAfterCheckIn } from "../utils/pushConsent";
import Toast from "../components/Toast";
import { useToast } from "../hooks/useToast";
import SatisfactionModal from "../components/SatisfactionModal";
import PhotoAttendanceConfirmModal from "../components/PhotoAttendanceConfirmModal";
import {
  shouldAskSatisfaction, isTossReviewSupported, markSatisfactionAsked,
  reportSatisfaction, requestTossReview,
} from "../utils/review";
import { useAttendancePoints, useAttendanceGift, useDailyRewardLimit, rollDailyRankBonus } from "../hooks/useAttendancePoints";
import type { TabName } from "../components/TabBar";
import type { Classroom, TodayAttendance, CheckInResponse, CheckInRequest, User } from "../types";
import { hasUnreadGreeting, rememberLatestGreetingId } from "../utils/unreadGreetings";

interface RoomScreenProps {
  classroomId: number;
  user: User;
  onBack: () => void;
  onTabChange: (tab: TabName) => void;
}

export default function RoomScreen({ classroomId, user, onBack, onTabChange }: RoomScreenProps) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ userId: number; nickname: string } | null>(null);
  const [profileTarget, setProfileTarget] = useState<{ userId: number; nickname: string } | null>(null);
  const [rewardModal, setRewardModal] = useState<{ rank: number; rankBonus: number | null } | null>(null);
  const [rankOnlyModal, setRankOnlyModal] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<number | null>(null);
  const satisfactionTimer = useRef<number | null>(null);
  // 서버가 알려준 누적 출석 횟수 — 만족도를 물어볼 시점인지 판단하는 데만 쓴다.
  const myTotalCheckIns = useRef(0);
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [photoToConfirm, setPhotoToConfirm] = useState<{ data: string; preview: string } | null>(null);
  const [photoCaptureBusy, setPhotoCaptureBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toastMessage, showToast } = useToast();
  const { addPoints } = useAttendancePoints();
  const { claim: claimGift } = useAttendanceGift(classroomId);
  const { remaining: rewardRemaining, increment: incrementReward } = useDailyRewardLimit();

  const handleInvite = async () => {
    if (!classroom) return;
    const result = await shareRoomInvite(classroom.name, classroom.inviteCode, classroomId);
    if (result === "failed") return;
    // 공유시트를 띄운 것까지만 알 수 있다(실제로 보냈는지는 확인할 방법이 없다).
    markMissionDone("invite");
    if (result === "copied") showToast("초대 메시지를 복사했어요");
  };

  const playCheckInCelebration = () => {
    if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
    setCelebrating(true);
    celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 1500);

    // 색종이(1.5초)가 끝나길 기다리면 그 전에 화면을 떠나는 사람이 많아서, 더 빨리 물어본다.
    // 조건에 안 맞으면 아무 일도 일어나지 않는다.
    if (satisfactionTimer.current !== null) window.clearTimeout(satisfactionTimer.current);
    satisfactionTimer.current = window.setTimeout(() => {
      if (shouldAskSatisfaction(myTotalCheckIns.current)) {
        void isTossReviewSupported().then((supported) => {
          if (supported) {
            markSatisfactionAsked();
            setShowSatisfaction(true);
            return;
          }
          // 리뷰 요청을 지원하지 않으면 리뷰 안내 모달은 생략하고, 다른 출석 후 동의를 확인한다.
          maybePromptPushConsentAfterCheckIn();
        });
        return;
      }
      // 만족도를 묻는 날에는 알림 동의까지 겹쳐 띄우지 않는다.
      maybePromptPushConsentAfterCheckIn();
    }, 500);
  };

  const processAttendancePhoto = async (source: string) => {
    const image = new Image();
    image.src = source.startsWith("data:") ? source : `data:image/jpeg;base64,${source}`;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("사진을 읽지 못했어요."));
    });
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 처리하지 못했어요.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.78, 0.66, 0.54, 0.42]) {
      const data = canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
      if (data.length <= 1_333_334) {
        setPhotoToConfirm({ data, preview: `data:image/jpeg;base64,${data}` });
        setCheckInError(null);
        return;
      }
    }
    throw new Error("사진 용량이 커요. 다시 촬영해 주세요.");
  };

  const captureAttendancePhoto = async () => {
    if (photoCaptureBusy || checkingIn) return;
    setCheckInError(null);
    if (!isTossApp()) {
      photoInputRef.current?.click();
      return;
    }
    setPhotoCaptureBusy(true);
    try {
      const { Device } = await import("@apps-in-toss/web-framework");
      const image = await Device.openCamera({ base64: true, maxWidth: 1024 });
      await processAttendancePhoto(image.dataUri);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (!/cancel/i.test(message)) setCheckInError(message || "사진을 촬영하지 못했어요. 카메라 권한을 확인해 주세요.");
    } finally {
      setPhotoCaptureBusy(false);
    }
  };

  const handlePhotoInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("사진을 읽지 못했어요."));
        reader.onerror = () => reject(new Error("사진을 읽지 못했어요."));
        reader.readAsDataURL(file);
      });
      await processAttendancePhoto(source);
    } catch (e) {
      setCheckInError(e instanceof Error ? e.message : "사진을 불러오지 못했어요.");
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setFetchError(false);
      const [c, t] = await Promise.all([
        api<Classroom>(`/classrooms/${classroomId}`),
        api<TodayAttendance>(`/classrooms/${classroomId}/attendance/today`),
      ]);
      setClassroom(c);
      rememberLatestGreetingId(classroomId, c.latestGreetingId);
      setToday(t);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => { hideAdBanner(); fetchData(); }, [fetchData]);
  // 화면을 떠난 뒤에 리뷰 창이 뜨면 뜬금없으므로 타이머를 정리한다.
  useEffect(() => () => {
    if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
    if (satisfactionTimer.current !== null) window.clearTimeout(satisfactionTimer.current);
  }, []);

  const handleCheckIn = async (imageBase64?: string): Promise<boolean> => {
    if (!classroom) return false;
    setCheckingIn(true);
    setCheckInError(null);
    try {
      const locationData: CheckInRequest = await collectCheckInData(classroom.validationType);
      if (classroom.validationType === "PHOTO") locationData.imageBase64 = imageBase64;
      const checkInResult = await api<CheckInResponse>(`/classrooms/${classroomId}/attendance/check-in`, {
        method: "POST",
        body: JSON.stringify(locationData),
      });
      await fetchData();
      myTotalCheckIns.current = checkInResult.myTotalCheckIns;
      if (classroom.validationType === "PHOTO") markMissionDone("greeting");
      // 출석 성공 — 방을 넘나들어도 "보상을 받는 체크인"은 하루 최대 3번까지만.
      // 그 안에 들면 선물상자(+1~3등이면 보너스도 같이)를 보여주고, 넘으면 등수만 보여준다.
      if (rewardRemaining > 0) {
        incrementReward();
        const rankBonus = rollDailyRankBonus(checkInResult.dailyRank);
        setTimeout(() => launchConfetti(rankBonus !== null), 300);
        setRewardModal({ rank: checkInResult.dailyRank, rankBonus });
      } else {
        setRankOnlyModal(checkInResult.dailyRank);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setCheckInError(e.message);
      } else {
        const msg = e instanceof Error ? e.message : "출석에 실패했습니다";
        if (msg.includes("위치")) setCheckInError("GPS 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요");
        else setCheckInError(msg);
      }
      return false;
    } finally {
      setCheckingIn(false);
    }
    return true;
  };


  if (loading) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>
      </div>
    );
  }

  if (fetchError || !classroom || !today) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <span style={{ color: "var(--text-secondary)" }}>정보를 불러올 수 없습니다</span>
        <button onClick={() => { setLoading(true); fetchData(); }} style={{ padding: "8px 20px", borderRadius: "var(--radius-card)", background: "var(--accent-blue)", color: "#fff", fontSize: 13 }}>다시 시도</button>
      </div>
    );
  }

  const isCheckedIn = today.myRank !== null;
  const timeRange = classroom.checkInStartTime && classroom.checkInEndTime
    ? `${classroom.checkInStartTime} ~ ${classroom.checkInEndTime}`
    : "24시간";

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <BackHeader title={classroom.name} onBack={onBack} right={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            onClick={() => void handleInvite()}
            style={{ color: "var(--accent-blue)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            초대하기
          </span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{classroom.memberCount}명</span>
        </div>
      } />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoInput} style={{ display: "none" }} />
        <section className="attendance-hero" aria-label="오늘 출석">
          <div className={`attendance-jelly-stage${celebrating ? " is-celebrating" : ""}${isCheckedIn ? " is-done" : ""}`}>
            <div className="attendance-jelly-particles" aria-hidden="true"><i /><i />{celebrating && <><i /><i /><i /><i /></>}</div>
            <button
              onClick={() => classroom.validationType === "PHOTO" ? void captureAttendancePhoto() : void handleCheckIn()}
              disabled={isCheckedIn || checkingIn || photoCaptureBusy}
              className={`attendance-jelly-button${checkingIn || photoCaptureBusy ? " is-loading" : ""}`}
              aria-label={isCheckedIn ? "출석 완료" : classroom.validationType === "PHOTO" ? "카메라로 사진 출석하기" : "출석하기"}
            >
              {checkingIn || photoCaptureBusy ? <span className="attendance-spinner" /> : classroom.validationType === "PHOTO" ? (
                <svg viewBox="0 0 32 32" aria-hidden="true" style={{ width: 34, height: 34, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }}>
                  <path d="M4.5 10.5h5l2-3h9l2 3h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
                  <circle cx="16" cy="17" r="5" />
                </svg>
              ) : (
                <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m6.5 16.5 6.2 6.2L25.5 9.8" /></svg>
              )}
            </button>
          </div>
          <div className="attendance-hero-summary">
            {isCheckedIn
              ? `${today.myRank}등으로 출석 완료 · ${today.myCheckInTime ? formatTime(today.myCheckInTime) : ""}`
              : `${today.totalCheckedIn}명 출석 · ${timeRange}`}
          </div>
          {checkInError && <div className="attendance-error" role="alert">{checkInError}</div>}
        </section>

        {/* 하단: 오늘의 순위 리스트 */}
        <div style={{ flex: 1, padding: "0 16px", overflow: "auto" }}>
          {/* 아직 아무도 출석하지 않은 방에서도 초대할 수 있어야 하므로 이 줄은 항상 보여준다.
              토스 앱에서는 헤더(BackHeader)가 통째로 숨겨져서, 초대 버튼은 본문에 있어야 보인다. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>오늘의 순위</span>
            {classroom.memberCount < classroom.maxMembers && (
              <button
                onClick={handleInvite}
                style={{
                  flexShrink: 0, padding: "6px 11px", borderRadius: 999,
                  border: "1px solid var(--border-color)", background: "var(--bg-card)",
                  color: "var(--accent-blue)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                ＋ 친구 초대하기
              </button>
            )}
          </div>
          {today.rankings.filter((r) => !isBlocked(r.userId)).map((r) => (
            <div key={r.userId} onClick={() => r.userId !== user.userId && setProfileTarget({ userId: r.userId, nickname: r.nickname })}>
              <RankRow rank={r.rank} nickname={r.nickname} checkInTime={r.checkInTime} isMe={r.userId === user.userId} isOwner={classroom?.ownerId === r.userId} />
            </div>
          ))}
          {today.rankings.length === 0 && (
            <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-muted)", fontSize: 13 }}>
              아직 아무도 출석하지 않았어요
            </div>
          )}
        </div>
      </div>

      {profileTarget && (
        <MemberProfileModal
          classroomId={classroomId}
          userId={profileTarget.userId}
          nickname={profileTarget.nickname}
          isOwner={classroom?.ownerId === profileTarget.userId}
          isMe={false}
          onClose={() => setProfileTarget(null)}
          onReportOrBlock={() => {
            setActionTarget(profileTarget);
            setProfileTarget(null);
          }}
        />
      )}
      {actionTarget && (
        <UserActionSheet
          userId={actionTarget.userId}
          nickname={actionTarget.nickname}
          onClose={() => setActionTarget(null)}
        />
      )}
      {rewardModal !== null && (
        <AttendanceGiftModal
          rank={rewardModal.rank}
          rankBonus={rewardModal.rankBonus}
          onClaimGift={claimGift}
          onClose={(total) => {
            addPoints(total);
            setRewardModal(null);
            playCheckInCelebration();
          }}
        />
      )}
      {showSatisfaction && (
        <SatisfactionModal
          onGood={() => {
            reportSatisfaction("GOOD");
            setShowSatisfaction(false);
            // 토스 리뷰 창은 떴는지도 알 수 없으므로 뒷일을 연결하지 않는다.
            void requestTossReview();
          }}
          onClose={() => {
            reportSatisfaction("DISMISS");
            setShowSatisfaction(false);
          }}
        />
      )}
      {photoToConfirm && (
        <PhotoAttendanceConfirmModal
          imageDataUri={photoToConfirm.preview}
          busy={checkingIn}
          error={checkInError}
          onCancel={() => { setPhotoToConfirm(null); setCheckInError(null); }}
          onRetake={() => { setPhotoToConfirm(null); setCheckInError(null); void captureAttendancePhoto(); }}
          onConfirm={() => {
            void handleCheckIn(photoToConfirm.data).then((success) => {
              if (success) setPhotoToConfirm(null);
            });
          }}
        />
      )}
      {rankOnlyModal !== null && (
        <RankOnlyModal rank={rankOnlyModal} onClose={() => { setRankOnlyModal(null); playCheckInCelebration(); }} />
      )}
      <Toast message={toastMessage} />
      <TabBar active="today" onSelect={onTabChange} greetingUnread={hasUnreadGreeting(classroomId, classroom?.latestGreetingId)} />
    </div>
  );
}
