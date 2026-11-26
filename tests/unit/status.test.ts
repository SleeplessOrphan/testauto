import { describe, expect, it } from "vitest";
import { appStatus } from "@/lib/status";

describe("appStatus", () => {
  it("mentions the spec", () => {
    expect(appStatus()).toContain("spec/app.md");
  });
});
