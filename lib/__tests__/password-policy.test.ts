import { describe, expect, it } from "vitest";
import { validatePassword } from "@/lib/password-policy";

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    expect(validatePassword("short", "a@ymg-legal.com")).toMatch(/at least 12/);
  });

  it("rejects common passwords case-insensitively", () => {
    expect(validatePassword("PASSWORD1234", "a@ymg-legal.com")).toMatch(/too common/);
  });

  it("rejects passwords containing the email's local part", () => {
    expect(validatePassword("xx-jane.doe-xx", "Jane.Doe@ymg-legal.com")).toMatch(/email/);
  });

  it("accepts a long, unrelated password", () => {
    expect(validatePassword("correct horse battery", "jane@ymg-legal.com")).toBeNull();
  });
});
