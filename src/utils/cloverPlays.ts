import { readStore, writeStore } from "./nativeStore";

/** 한 묶음에 쓸 수 있는 판 수. */
export const PLAY_LIMIT = 7;
/** 다 쓴 뒤 기다리는 시간. 마지막 판을 시작한 순간부터 센다. */
export const PLAY_REFILL_MS = 60 * 60 * 1000;

const PLAYS_KEY = "att-clover-plays";

interface PlayState {
  /** 지금 묶음에서 쓴 판 수. */
  used: number;
  /** 판이 다시 차는 시각(epoch ms). 잠겨 있지 않으면 null. */
  refillAt: number | null;
}

const EMPTY: PlayState = { used: 0, refillAt: null };

function read(): PlayState {
  try {
    const saved = readStore(PLAYS_KEY);
    if (!saved) return { ...EMPTY };
    const parsed = JSON.parse(saved) as Partial<PlayState>;
    return {
      used: Number.isInteger(parsed.used) ? Math.max(0, parsed.used as number) : 0,
      refillAt: typeof parsed.refillAt === "number" ? parsed.refillAt : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

/**
 * 기다리는 시간이 지났으면 묶음을 비운 상태를 돌려준다. **저장하지는 않는다.**
 *
 * 읽을 때마다 쓰면 화면을 그리는 동안 저장소에 계속 쓰게 된다. 실제 저장은 판을
 * 시작할 때 한 번만 한다.
 */
function settle(state: PlayState, now: number): PlayState {
  if (state.refillAt !== null && now >= state.refillAt) return { ...EMPTY };
  return state;
}

export interface PlayStatus {
  /** 남은 판 수. 0이면 잠겨 있다. */
  playsLeft: number;
  /** 한 묶음의 판 수. */
  playLimit: number;
  /** 잠금이 풀릴 때까지 남은 밀리초. 잠겨 있지 않으면 0. */
  lockedForMs: number;
}

export function readPlayStatus(now = Date.now()): PlayStatus {
  const state = settle(read(), now);
  const playsLeft = Math.max(0, PLAY_LIMIT - state.used);
  return {
    playsLeft,
    playLimit: PLAY_LIMIT,
    lockedForMs: playsLeft === 0 && state.refillAt !== null ? Math.max(0, state.refillAt - now) : 0,
  };
}

/**
 * 판 하나를 쓴다. 잠겨 있으면 `false`를 돌려주고 아무것도 바꾸지 않는다.
 *
 * **시작할 때 센다.** 성공할 때 세면 1분을 안 기다리고 화면을 나가 다시 시작하는 것이
 * 공짜가 되어, 찾을 때까지 돌리는 게 최적 전략이 된다. 실패·이탈한 판도 한 판이다.
 */
export function consumePlay(now = Date.now()): boolean {
  const state = settle(read(), now);
  if (state.used >= PLAY_LIMIT) return false;

  const used = state.used + 1;
  // 첫 판이 아니라 마지막 판 시작 시점부터 기다린다. 첫 판부터 세면 천천히 하는
  // 사람은 사실상 제한을 받지 않는다.
  const refillAt = used >= PLAY_LIMIT ? now + PLAY_REFILL_MS : null;
  writeStore(PLAYS_KEY, JSON.stringify({ used, refillAt } satisfies PlayState));
  return true;
}

/** 개발용. `?cloverPlays=0` 으로 잠긴 상태를, `?cloverPlays=7` 로 가득 찬 상태를 만든다. */
export function devSetPlaysLeft(playsLeft: number, now = Date.now()): void {
  const used = Math.max(0, Math.min(PLAY_LIMIT, PLAY_LIMIT - playsLeft));
  const refillAt = used >= PLAY_LIMIT ? now + PLAY_REFILL_MS : null;
  writeStore(PLAYS_KEY, JSON.stringify({ used, refillAt } satisfies PlayState));
}
