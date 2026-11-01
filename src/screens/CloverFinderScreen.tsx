import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import HomeTabBar from "../components/HomeTabBar";
import type { HomeTab } from "../components/HomeTabBar";
import { useAttendancePoints } from "../hooks/useAttendancePoints";
import { Meadow } from "../lab/clover/Meadow";
import { CloverIcon } from "../lab/clover/CloverIcon";
import CloverGuideModal from "../lab/clover/CloverGuideModal";
import { CLOVER_FORTUNES, GOLDEN_CLOVER_MESSAGE } from "../lab/clover/fortunes";
import type { ActiveField } from "../lab/clover/domain";
import { incrementMissionProgress } from "../hooks/useMissions";
import { api } from "../utils/api";
import { isTossApp } from "../utils/platform";
import TossBannerAd, { BANNER_AD_GROUPS } from "../components/TossBannerAd";
import { showTossInterstitialAd } from "../utils/tossRewardedAd";
import "../styles/lab.css";

interface Props {
  onBack: () => void;
  onNavigateHome: () => void;
  onNavigatePublicRooms: () => void;
  onNavigateProfile: () => void;
  onNavigateLab: () => void;
}

interface CloverOverview {
  totalFound: number;
  personalBestMs: number | null;
  myRank: number | null;
  participantCount: number;
  ranking: Array<{ rank: number; nickname: string; bestTimeMs: number | null; mine: boolean; failed: boolean }>;
}

interface CloverAttempt {
  attemptId: string;
  seed: number;
  serverNowEpochMs: number;
  expiresAtEpochMs: number;
  localDeadlineMs: number;
  penaltySeconds: number;
}

interface CloverResult {
  elapsedMs: number;
  totalFound: number;
  golden: boolean;
  fortuneIndex: number;
  personalBestMs: number | null;
  personalBest: boolean;
  pointsAwarded: number;
}

type FinderPhase = "ready" | "starting" | "playing" | "submitting" | "success" | "failed" | "timeoutReveal" | "timeout";

const ATTEMPT_DURATION_MS = 60_000;

/** 콘솔 광고 그룹 "출석왕_전면형". 다음 판으로 넘어갈 때 한 번 보여준다. */
const CLOVER_RETRY_AD_GROUP_ID = "ait.v2.live.3e114abe2d31408c";

const formatElapsed = (ms: number) => `${(ms / 1000).toFixed(2)}초`;

export default function CloverFinderScreen({
  onBack, onNavigateHome, onNavigatePublicRooms, onNavigateProfile, onNavigateLab,
}: Props) {
  const [overview, setOverview] = useState<CloverOverview | null>(null);
  const [phase, setPhase] = useState<FinderPhase>("ready");
  const [attempt, setAttempt] = useState<CloverAttempt | null>(null);
  const [remainingMs, setRemainingMs] = useState(ATTEMPT_DURATION_MS);
  const [result, setResult] = useState<CloverResult | null>(null);
  const [error, setError] = useState("");
  const [inspectMessage, setInspectMessage] = useState("");
  const [hintSignal, setHintSignal] = useState(0);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  /** 다음 판 전면 광고를 불러오는 중. 버튼을 잠가 두 번 눌리지 않게 한다. */
  const [loadingRetryAd, setLoadingRetryAd] = useState(false);
  const phaseRef = useRef<FinderPhase>("ready");
  const attemptRef = useRef<CloverAttempt | null>(null);
  const inspectTimeoutRef = useRef<number | null>(null);
  const timeoutRevealRef = useRef<number | null>(null);
  const { claim: claimPointReward } = useAttendancePoints();

  const updatePhase = (next: FinderPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const refreshOverview = useCallback(async () => {
    setRankingLoading(true);
    try {
      setOverview(await api<CloverOverview>("/labs/clover"));
    } catch {
      setError("기록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setRankingLoading(false);
    }
  }, []);

  const revealMissedClover = useCallback(() => {
    if (phaseRef.current !== "playing" && phaseRef.current !== "submitting") return;
    if (timeoutRevealRef.current !== null) window.clearTimeout(timeoutRevealRef.current);
    const timedOutAttemptId = attemptRef.current?.attemptId;
    setHintSignal((value) => value + 1);
    updatePhase("timeoutReveal");
    if (timedOutAttemptId) {
      void api(`/labs/clover/attempts/${timedOutAttemptId}/failed`, { method: "POST" })
        .then(() => refreshOverview())
        .catch(() => {});
    }
    timeoutRevealRef.current = window.setTimeout(() => {
      timeoutRevealRef.current = null;
      if (phaseRef.current === "timeoutReveal") updatePhase("timeout");
    }, 2600);
  }, [refreshOverview]);

  useEffect(() => { void refreshOverview(); }, [refreshOverview]);

  useEffect(() => () => {
    if (inspectTimeoutRef.current !== null) window.clearTimeout(inspectTimeoutRef.current);
    if (timeoutRevealRef.current !== null) window.clearTimeout(timeoutRevealRef.current);
  }, []);

  useEffect(() => {
    if (!attempt || (phase !== "playing" && phase !== "submitting")) return;

    const tick = () => {
      const nextRemaining = Math.max(0, attempt.localDeadlineMs - Date.now());
      setRemainingMs(nextRemaining);
      if (nextRemaining === 0 && phaseRef.current === "playing") revealMissedClover();
    };
    tick();
    const timer = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [attempt, phase, revealMissedClover]);

  const startAttempt = async () => {
    if (phaseRef.current === "starting" || phaseRef.current === "playing" || phaseRef.current === "submitting") return;
    setError("");
    setResult(null);
    setHintSignal(0);
    updatePhase("starting");
    try {
      const response = await api<Omit<CloverAttempt, "localDeadlineMs" | "penaltySeconds">>("/labs/clover/attempts", { method: "POST" });
      const nextAttempt: CloverAttempt = {
        ...response,
        penaltySeconds: 0,
        localDeadlineMs: Date.now() + Math.max(0, response.expiresAtEpochMs - response.serverNowEpochMs),
      };
      attemptRef.current = nextAttempt;
      setAttempt(nextAttempt);
      setRemainingMs(Math.max(0, nextAttempt.localDeadlineMs - Date.now()));
      updatePhase("playing");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "도전을 시작하지 못했어요.");
      updatePhase("failed");
    }
  };

  const onFound = useCallback(async () => {
    const activeAttempt = attemptRef.current;
    if (!activeAttempt || phaseRef.current !== "playing") return;
    updatePhase("submitting");
    setError("");
    try {
      const found = await api<Omit<CloverResult, "pointsAwarded">>(`/labs/clover/attempts/${activeAttempt.attemptId}/found`, {
        method: "POST",
        body: JSON.stringify({ penaltySeconds: activeAttempt.penaltySeconds }),
      });
      // 황금 클로버는 보상이 더 크다. 같은 attemptId로는 한 번만 적립된다.
      const reward = await claimPointReward("CLOVER", activeAttempt.attemptId, { golden: found.golden });
      const pointsAwarded = reward.amount;
      incrementMissionProgress("clover-finder");
      setResult({ ...found, pointsAwarded });
      setRemainingMs(Math.max(0, activeAttempt.localDeadlineMs - Date.now()));
      setOverview((previous) => previous ? {
        ...previous,
        totalFound: found.totalFound,
        personalBestMs: found.personalBestMs,
      } : previous);
      updatePhase("success");
      void refreshOverview();
    } catch (foundError) {
      const isTimeout = Date.now() >= activeAttempt.localDeadlineMs;
      setError(isTimeout ? "1분이 지나 클로버 찾기에 실패했어요." : foundError instanceof Error ? foundError.message : "기록을 저장하지 못했어요.");
      if (isTimeout) revealMissedClover();
      else updatePhase("failed");
    }
  }, [claimPointReward, refreshOverview, revealMissedClover]);

  /**
   * 다음 판으로 넘어간다. **전면 광고를 한 번 보여준 뒤** 시작한다.
   *
   * 광고가 실패해도 그냥 시작한다 — {@link showTossInterstitialAd}는 던지지 않는다.
   * 광고 사정으로 플레이를 막으면 심사에서 "행동을 강제로 막는 배치"로 걸린다.
   */
  const handleContinue = async () => {
    if (loadingRetryAd) return;
    setLoadingRetryAd(true);
    try {
      await showTossInterstitialAd(CLOVER_RETRY_AD_GROUP_ID, "CLOVER_RETRY");
    } finally {
      setLoadingRetryAd(false);
      void startAttempt();
    }
  };

  const field = useMemo<ActiveField>(() => ({
    id: attempt?.attemptId ?? "clover-preview",
    seed: attempt?.seed ?? 20261031,
    openedAt: attempt ? new Date(attempt.serverNowEpochMs).toISOString() : new Date().toISOString(),
    theme: (attempt?.seed ?? 0) % 3,
    foundIndexes: [],
    hintUsed: false,
    bonus: false,
  }), [attempt]);

  const handleTabChange = (tab: HomeTab) => {
    if (tab === "home") onNavigateHome();
    else if (tab === "publicRooms") onNavigatePublicRooms();
    else if (tab === "profile") onNavigateProfile();
    else onNavigateLab();
  };

  const remainingSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const rankingRows = useMemo(() => {
    if (!overview) return [];
    const rows = new Map<number, CloverOverview["ranking"][number]>();
    overview.ranking
      .filter((item) => item.rank <= 3 || item.rank > overview.participantCount - 3 || item.mine)
      .forEach((item) => rows.set(item.rank, item));
    return [...rows.values()].sort((a, b) => a.rank - b.rank);
  }, [overview]);

  return (
    <div className="page lab-page clover-finder-page">
      <header className="lab-game-header">
        {/*
          토스 앱에서는 네비게이션 바에 뒤로가기가 있다. 여기서도 그리면 버튼이 둘이
          되어 심사에서 반려된다(2026-11-01). 다른 화면은 BackHeader가 같은 이유로
          스스로 숨는데, 이 화면만 자체 버튼을 쓰고 있었다.
        */}
        {isTossApp()
          ? <span className="lab-header-spacer" />
          : <button className="lab-back-button" onClick={onBack} aria-label="포인트로 돌아가기">‹</button>}
        <h1>네잎 클로버 빨리 찾기</h1>
        <span className="lab-header-spacer" />
      </header>

      <main className="lab-game-content">
        <section className="clover-balance-card">
          <div className="clover-balance-topline">
            <span className="clover-balance-character"><img src="/emojis/redrawn/wellwish-chick.png" alt="" /></span>
            <strong>성공하면 출석점수를 제공해요!</strong>
            <button className="clover-guide-trigger" onClick={() => setGuideOpen(true)}>설명</button>
          </div>
        </section>

        <section className="lab-meadow-stage" aria-label="네잎클로버 찾기">
          <Meadow
            key={field.id}
            field={field}
            onFound={() => { void onFound(); }}
            onInspect={(message, penaltySeconds = 0) => {
              setInspectMessage(penaltySeconds > 0 ? `${message} · ${penaltySeconds}초 감소` : message);
              if (penaltySeconds > 0 && attemptRef.current && phaseRef.current === "playing") {
                const active = attemptRef.current;
                const penaltyMs = penaltySeconds * 1000;
                const localDeadlineMs = Math.max(Date.now(), active.localDeadlineMs - penaltyMs);
                const penalizedAttempt = {
                  ...active,
                  penaltySeconds: active.penaltySeconds + penaltySeconds,
                  localDeadlineMs,
                };
                attemptRef.current = penalizedAttempt;
                setAttempt(penalizedAttempt);
                const nextRemaining = Math.max(0, localDeadlineMs - Date.now());
                setRemainingMs(nextRemaining);
                if (nextRemaining === 0) revealMissedClover();
              }
              if (inspectTimeoutRef.current !== null) window.clearTimeout(inspectTimeoutRef.current);
              inspectTimeoutRef.current = window.setTimeout(() => setInspectMessage(""), 1200);
            }}
            hintSignal={hintSignal}
            readOnly={phase !== "playing"}
          />
          {attempt && <div className={`clover-fence-timer${remainingSeconds <= 10 ? " is-urgent" : ""}`} aria-label={`남은 시간 ${remainingSeconds}초`}>
            {remainingSeconds}<span>/60</span>
          </div>}
          {inspectMessage && <div className="clover-inspect-message" role="status">{inspectMessage}</div>}
          {phase === "timeoutReveal" && <div className="clover-timeout-reveal-toast" role="status">네잎클로버가 여기 있었어요!</div>}

          {(phase === "ready" || phase === "starting") && (
            <div className="clover-stage-overlay">
              <section className="clover-stage-modal-card clover-start-card">
                <strong>1분 안에 네잎클로버를 찾아보세요</strong>
                <p>풀밭을 살펴보고 네잎클로버를 탭하세요.</p>
                {error && <p className="clover-error" role="alert">{error}</p>}
                <button className="clover-start-button" onClick={() => void startAttempt()} disabled={phase === "starting"}>
                  {phase === "starting" ? "풀밭을 준비하고 있어요" : "도전"}
                </button>
              </section>
            </div>
          )}

          {phase === "success" && result && (
            <div className="clover-stage-overlay">
              <section className={`clover-stage-modal-card clover-found-modal${result.golden ? " clover-found-modal-golden" : ""}`} role="dialog" aria-modal="true" aria-labelledby="clover-result-title">
                <div className="clover-found-art" aria-hidden="true">
                  <span className="clover-found-orbit" />
                  <CloverIcon size={76} seed={field.seed} golden={result.golden} />
                  <span className="clover-found-spark clover-found-spark-a">✦</span>
                  <span className="clover-found-spark clover-found-spark-b">✧</span>
                  <span className="clover-found-spark clover-found-spark-c">✦</span>
                </div>
                <h2 id="clover-result-title">{result.golden ? "황금클로버를 발견했어요!" : `${CLOVER_FORTUNES[result.fortuneIndex]?.category ?? "행운의 클로버"}를 발견했어요!`}</h2>
                <div className="clover-result-record">
                  <strong className="clover-result-time">{formatElapsed(result.elapsedMs)}</strong>
                  {result.personalBestMs !== null && !result.personalBest && <p className="clover-personal-best">내 최고 기록 {formatElapsed(result.personalBestMs)}</p>}
                </div>
                <div className="clover-earned-points">
                  <span>출석점수</span>
                  <strong>+{result.pointsAwarded.toLocaleString()}점</strong>
                </div>
                <p className="clover-result-fortune">{result.golden ? GOLDEN_CLOVER_MESSAGE : CLOVER_FORTUNES[result.fortuneIndex]?.text ?? "오늘도 행운이 함께해요!"}</p>
                <button className="clover-start-button" onClick={() => void handleContinue()} disabled={loadingRetryAd}>
                  {loadingRetryAd ? "광고 불러오는 중" : "광고 보고 다시 도전"}
                </button>
              </section>
            </div>
          )}

          {phase === "timeout" && (
            <div className="clover-stage-overlay">
              <section className="clover-stage-modal-card" role="dialog" aria-modal="true" aria-labelledby="clover-timeout-title">
                <h2 id="clover-timeout-title">이번 판은 여기까지예요</h2>
                <p>다음 판에서 새 밭을 열고 다시 찾아보세요.</p>
                <button className="clover-start-button" onClick={() => void handleContinue()} disabled={loadingRetryAd}>
                  {loadingRetryAd ? "광고 불러오는 중" : "광고 보고 다음 판"}
                </button>
              </section>
            </div>
          )}

          {phase === "failed" && (
            <div className="clover-stage-overlay">
              <section className="clover-stage-modal-card" role="dialog" aria-modal="true" aria-labelledby="clover-failed-title">
                <h2 id="clover-failed-title">기록을 저장하지 못했어요</h2>
                <p className="clover-error" role="alert">{error}</p>
                <button className="clover-start-button" onClick={() => void startAttempt()}>다시 도전</button>
              </section>
            </div>
          )}
        </section>

        <section className="clover-ranking-section">
          <div className="clover-ranking-heading">
            <h2>네잎 클로버 찾기 랭킹</h2>
            {overview?.personalBestMs != null && <span>내 최고 {formatElapsed(overview.personalBestMs)}</span>}
          </div>
          {rankingLoading ? <p className="clover-ranking-empty">랭킹을 불러오고 있어요.</p>
            : overview ? (
              <ol className="clover-ranking-list">
                {rankingRows.map((item, index) => <Fragment key={item.rank}>
                  {index > 0 && item.rank > rankingRows[index - 1]!.rank + 1 && (
                    <li className="clover-ranking-ellipsis" aria-hidden="true">···</li>
                  )}
                  <li className={item.mine ? "is-mine" : ""}>
                    <span className={`clover-ranking-rank${item.rank <= 3 ? ` rank-${item.rank}` : ""}`}>{item.rank}</span>
                    <span className="clover-ranking-name">{item.nickname}{item.mine && <small className="clover-ranking-mine">나</small>}</span>
                    <strong>{item.bestTimeMs == null ? "-" : formatElapsed(item.bestTimeMs)}</strong>
                  </li>
                </Fragment>)}
                {overview.myRank === null && <li className="clover-ranking-own-empty">
                  <span className="clover-ranking-rank">-</span>
                  <span className="clover-ranking-name">기록을 남기면 내 순위가 표시돼요</span>
                </li>}
              </ol>
            ) : <p className="clover-ranking-empty">랭킹을 불러오지 못했어요.</p>}
        </section>

        {/* 랭킹 아래. 게임판 쪽에 두면 플레이 중 시선을 뺏는다. */}
        <TossBannerAd
          adGroupId={BANNER_AD_GROUPS.text}
          variant="card"
          className="clover-inline-ad"
        />

        {guideOpen && <CloverGuideModal onClose={() => setGuideOpen(false)} />}
      </main>

      <HomeTabBar active="lab" onSelect={handleTabChange} />
    </div>
  );
}
