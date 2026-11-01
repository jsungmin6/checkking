import { api } from "./api";

/**
 * 토스포인트 관련 — **지급은 서버가 한다. 클라이언트는 조회와 요청만 한다.**
 *
 * 예전에는 이 파일에 `grantTossPromotionReward`가 있어서 클라이언트가
 * `Promotion.grantReward`로 직접 지급하고, 지급 사실을 `POST /points/toss-grants`로
 * 서버에 "알렸다". 두 가지가 문제였다.
 *
 *  1. 지급 금액을 클라이언트가 정했다. 서버 추첨액은 권고값일 뿐이었다.
 *  2. 지급 원장에 임의의 내역을 넣을 수 있었다. 그 원장은 자체포인트 발행 신고와
 *     "받은 토스포인트" 표시의 근거라 틀어지면 안 된다.
 *
 * 지금은 서버가 지급하면서 직접 기록한다. 여기 남은 것은 조회뿐이다.
 * 포인트 교환을 다시 열 때도 클라이언트 지급으로 만들지 말고 서버 지급으로 만든다.
 */

export const TOSS_POINTS_RECEIVED_KEY = "att-toss-points-received";
export const TOSS_POINTS_RECEIVED_EVENT = "att-toss-points-received-change";

/** 이관 전 클라이언트가 쌓아 두던 지급 대기 큐. 이제 서버가 기록하므로 남은 값은 버린다. */
const LEGACY_PENDING_GRANTS_KEY = "att-toss-points-pending-grants";
const LEGACY_PENDING_LOTTERY_WINS_KEY = "att-lottery-pending-server-records";

interface TossPointTotalResponse {
  totalReceivedWon: number;
}

function publishTossPointsReceived(total: number) {
  const normalized = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  localStorage.setItem(TOSS_POINTS_RECEIVED_KEY, String(normalized));
  window.dispatchEvent(new CustomEvent(TOSS_POINTS_RECEIVED_EVENT, { detail: normalized }));
}

/**
 * 출석왕에서 받은 토스포인트 누적액을 서버에서 읽는다.
 * 네트워크가 끊기면 마지막으로 표시한 값을 유지한다.
 */
export async function syncTossPointLedger(): Promise<void> {
  // 구버전이 남긴 대기 큐는 더 이상 보내지 않는다. 서버가 이미 기록을 갖고 있다.
  localStorage.removeItem(LEGACY_PENDING_GRANTS_KEY);
  localStorage.removeItem(LEGACY_PENDING_LOTTERY_WINS_KEY);

  try {
    const total = await api<TossPointTotalResponse>("/points/toss-grants/total");
    publishTossPointsReceived(total.totalReceivedWon);
  } catch {
    /* 서버에 연결할 수 없으면 마지막으로 저장한 값 유지 */
  }
}

export interface AttendanceLotteryScratchResult {
  drawId: string;
  amountWon: number;
}

/**
 * 복권을 긁는다. **한 번의 호출로 차감·추첨·토스포인트 지급·기록이 모두 끝난다.**
 *
 * 금액을 미리 받지 않으므로 금액을 보고 닫아 공짜로 재추첨할 수 없고, 지급액을
 * 클라이언트가 정할 수도 없다.
 *
 * `drawId`는 이 시도의 멱등 키다. 재시도해도 차감과 지급이 한 번만 일어난다.
 */
export function scratchAttendanceLottery(drawId: string): Promise<AttendanceLotteryScratchResult> {
  return api<AttendanceLotteryScratchResult>("/labs/attendance-lottery/scratch", {
    method: "POST",
    body: JSON.stringify({ drawId }),
  });
}

/** 시도마다 새로 만든다. crypto.randomUUID가 없는 구형 웹뷰를 위한 폴백을 둔다. */
export function newLotteryDrawId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
}
