import { describe, expect, it } from "vitest";
import { canStartRun, isQualifiedLead, normalizeDomain, shouldChargeCredit } from "./index";

describe("campaign rules", () => {
  it("requires the full run target to be covered by credits", () => {
    expect(canStartRun(20, 20)).toBe(true);
    expect(canStartRun(19, 20)).toBe(false);
  });

  it("keeps the qualification threshold fixed at 80", () => {
    expect(isQualifiedLead(80)).toBe(true);
    expect(isQualifiedLead(79)).toBe(false);
  });

  it("charges only a newly confirmed success", () => {
    expect(shouldChargeCredit("SUCCESS", false)).toBe(true);
    expect(shouldChargeCredit("SUCCESS", true)).toBe(false);
    expect(shouldChargeCredit("FAILED", false)).toBe(false);
  });

  it("normalizes domains for suppression", () => {
    expect(normalizeDomain("https://www.example.jp/path")).toBe("example.jp");
  });
});
