import { describe, it, expect, vi, afterEach } from "vitest";
import { isTossApp } from "../platform";

describe("isTossApp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when userAgent contains TossApp", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 TossApp/1.0"
    );
    expect(isTossApp()).toBe(true);
  });

  it("returns false for normal browser", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 Chrome/120"
    );
    expect(isTossApp()).toBe(false);
  });
});
