import { describe, it, expect } from "vitest";
import { formatTime, formatCheckInTime } from "../time";

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
