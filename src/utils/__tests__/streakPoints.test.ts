import { describe, it, expect } from "vitest";
import { streakPoints, isTossRewardDay, nextTossRewardDay, MAX_STREAK_DAY } from "../attendancePoints";

/**
 * 연속 출석 보상표를 고정한다.
 *
 * **토스포인트를 받는 날에는 출석점수를 주지 않는다.** 두 규칙이 떨어져 있으면
 * 한쪽만 고치는 실수가 나므로 함께 못 박는다 — 실제로 7일차에 10,000점과 10원을
 * 둘 다 주고 있었다.
 */
describe("streakPoints", () => {
  it("토스포인트를 받는 날은 출석점수가 0이다", () => {
    for (const day of [7, 12, 17, 22, 97]) {
      expect(isTossRewardDay(day)).toBe(true);
      expect(streakPoints(day)).toBe(0);
    }
  });

  it("그 외 1~7일차는 표를 따른다", () => {
    expect(streakPoints(1)).toBe(2_000);
    expect(streakPoints(2)).toBe(5_000);
    expect(streakPoints(3)).toBe(2_000);
    expect(streakPoints(4)).toBe(5_000);
    expect(streakPoints(5)).toBe(2_000);
    expect(streakPoints(6)).toBe(5_000);
  });

  it("8일차부터는 10의 배수 30,000 · 100일차 100,000 · 나머지 10,000", () => {
    expect(streakPoints(8)).toBe(10_000);
    expect(streakPoints(10)).toBe(30_000);
    expect(streakPoints(13)).toBe(10_000);
    expect(streakPoints(20)).toBe(30_000);
    expect(streakPoints(100)).toBe(100_000);
  });

  it("점수와 토스포인트가 겹치는 날이 없다", () => {
    for (let day = 1; day <= MAX_STREAK_DAY; day += 1) {
      const both = isTossRewardDay(day) && streakPoints(day) > 0;
      expect(both).toBe(false);
    }
  });

  it("한 주기에 토스포인트를 받는 날은 19번이다", () => {
    let count = 0;
    for (let day = 1; day <= MAX_STREAK_DAY; day += 1) if (isTossRewardDay(day)) count += 1;
    expect(count).toBe(19);
  });

  it("다음 지급일까지 남은 일수를 센다", () => {
    expect(nextTossRewardDay(0)).toBe(7);    // 7일 남음
    expect(nextTossRewardDay(5)).toBe(7);    // 2일 남음
    expect(nextTossRewardDay(6)).toBe(7);    // 1일 남음
    // 오늘이 지급일이면 그날은 세지 않는다 — 아직 안 받았다면 따로 "받을 수 있다"고 알린다.
    expect(nextTossRewardDay(7)).toBe(12);
    expect(nextTossRewardDay(8)).toBe(12);
    expect(nextTossRewardDay(12)).toBe(17);
  });

  it("마지막 지급일(97)을 지나면 더 없다", () => {
    expect(nextTossRewardDay(92)).toBe(97);
    expect(nextTossRewardDay(97)).toBeNull();
    expect(nextTossRewardDay(100)).toBeNull();
  });
});
