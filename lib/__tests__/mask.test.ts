import { describe, expect, it } from "vitest";
import { maskValue } from "@/lib/mask";

describe("maskValue", () => {
  it("shows the first 3 characters and stars the rest", () => {
    expect(maskValue("5551234567")).toBe("555*******");
    expect(maskValue("jane@ymg-legal.com")).toBe("jan***************");
  });

  it("leaves very short values as-is and handles empty", () => {
    expect(maskValue("ab")).toBe("ab");
    expect(maskValue("")).toBe("");
    expect(maskValue(null)).toBe("");
  });
});
