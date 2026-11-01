import { describe, it, expect, vi, afterEach } from "vitest";
import { rollLotteryPrize, LOTTERY_MAX_PRIZE_WON } from "../tossPromotion";

/**
 * 복권 당첨 금액 분포를 고정한다. **실제 돈이 나가는 숫자다.**
 *
 * 두 가지가 깨지면 안 된다.
 *
 *  1. 최대 당첨금이 콘솔 프로모션의 지급 금액(1,000원)을 넘으면 토스가 4114로 거부한다.
 *     긁은 사람은 점수만 잃고 돈을 못 받는다.
 *  2. 꽝(0원)이 생기면 "꽝 없이 최소 1원"이라는 화면 문구가 거짓이 된다.
 *
 * 경계값은 `Math.random()`을 고정해 확인한다. 한 구간의 가중치를 고치면 뒤따르는
 * 경계가 전부 밀리므로, 표를 손볼 때 이 테스트가 먼저 깨져야 한다.
 */
describe("rollLotteryPrize", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** roll = floor(random * 1_000_000)이 정확히 그 값이 되도록 고정한다. */
  const atRoll = (roll: number) => {
    vi.spyOn(Math, "random").mockReturnValue(roll / 1_000_000);
    return rollLotteryPrize();
  };

  it("구간 경계에서 금액이 바뀐다", () => {
    expect(atRoll(0)).toBe(1);
    expect(atRoll(249_999)).toBe(1);

    expect(atRoll(250_000)).toBe(2);
    expect(atRoll(689_008)).toBe(2);

    expect(atRoll(689_009)).toBe(3);
    expect(atRoll(889_008)).toBe(3);

    expect(atRoll(889_009)).toBe(5);
    expect(atRoll(989_008)).toBe(5);

    expect(atRoll(989_009)).toBe(10);
    expect(atRoll(999_008)).toBe(10);

    expect(atRoll(999_009)).toBe(50);
    expect(atRoll(999_808)).toBe(50);

    expect(atRoll(999_809)).toBe(100);
    expect(atRoll(999_958)).toBe(100);

    expect(atRoll(999_959)).toBe(LOTTERY_MAX_PRIZE_WON);
    expect(atRoll(999_999)).toBe(LOTTERY_MAX_PRIZE_WON);
  });

  it("구간이 100만을 빈틈없이 덮는다 — 꽝도, 상한 초과도 없다", () => {
    const counts = new Map<number, number>();
    // 100만 번을 다 돌리면 느리다. 경계 주변과 고른 표본만 본다.
    const samples = [
      ...Array.from({ length: 2_000 }, (_, i) => i * 500),
      249_999, 250_000, 689_008, 689_009, 889_008, 889_009,
      989_008, 989_009, 999_008, 999_009, 999_808, 999_809,
      999_958, 999_959, 999_999,
    ];
    for (const roll of samples) {
      const prize = atRoll(roll);
      expect(prize).toBeGreaterThanOrEqual(1);              // 꽝 없음
      expect(prize).toBeLessThanOrEqual(LOTTERY_MAX_PRIZE_WON);  // 4114 방지
      counts.set(prize, (counts.get(prize) ?? 0) + 1);
    }
    // 표에 없는 금액이 나오면 구간에 구멍이 있다는 뜻이다.
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 5, 10, 50, 100, 1_000]);
  });

  it("최대 당첨금은 콘솔 프로모션의 지급 금액과 같다", () => {
    // 이 값을 올리려면 콘솔 프로모션을 먼저 바꿔야 한다. 코드만 올리면 4114로 거부된다.
    expect(LOTTERY_MAX_PRIZE_WON).toBe(1_000);
  });
});
