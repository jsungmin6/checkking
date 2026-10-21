import { describe, it, expect } from "vitest";
import { formatTime, formatCheckInTime, getWeekOfMonth } from "../time";

describe("formatTime", () => {
  it("formats ISO datetime to HH:mm", () => {
    expect(formatTime("2026-06-02T07:31:25")).toBe("07:31");
  });

  it("formats ISO datetime with seconds", () => {
    expect(formatTime("2026-06-02T14:05:00")).toBe("14:05");
  });

  it("formats HH:mm:ss to HH:mm", () => {
    expect(formatTime("19:48:34")).toBe("19:48");
  });

  it("returns HH:mm as-is", () => {
    expect(formatTime("07:30")).toBe("07:30");
  });
});

describe("formatCheckInTime", () => {
  it("formats ISO datetime to HH:mm:ss", () => {
    expect(formatCheckInTime("2026-06-02T07:31:25")).toBe("07:31:25");
  });

  it("returns HH:mm:ss as-is", () => {
    expect(formatCheckInTime("19:48:34")).toBe("19:48:34");
  });
});

describe("getWeekOfMonth", () => {
  // 2026-10-01은 목요일, 첫 월요일은 2026-10-05
  it("월 시작이 월요일이 아니면 첫 월요일 전날까지는 1주차", () => {
    expect(getWeekOfMonth(2026, 10, 1)).toBe(1);
    expect(getWeekOfMonth(2026, 10, 4)).toBe(1);
  });

  it("첫 월요일부터 2주차가 시작된다", () => {
    expect(getWeekOfMonth(2026, 10, 5)).toBe(2);
    expect(getWeekOfMonth(2026, 10, 11)).toBe(2);
    expect(getWeekOfMonth(2026, 10, 12)).toBe(3);
  });

  it("오늘(2026-10-22)은 4주차여야 한다", () => {
    expect(getWeekOfMonth(2026, 10, 22)).toBe(4);
  });

  // 2026-06-01은 월요일 → 조각 주 없이 바로 1주차 시작
  it("월 1일이 월요일이면 조각 주 없이 1주차부터 시작한다", () => {
    expect(getWeekOfMonth(2026, 6, 1)).toBe(1);
    expect(getWeekOfMonth(2026, 6, 7)).toBe(1);
    expect(getWeekOfMonth(2026, 6, 8)).toBe(2);
  });
});
