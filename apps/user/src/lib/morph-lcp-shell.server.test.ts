import { describe, expect, it } from "vitest";
import { injectMorphLcpShell } from "./morph-lcp-shell.server";

const SHELL = "<!DOCTYPE html><html><head></head><body></body></html>";

describe("injectMorphLcpShell", () => {
  it("skips non try-on routes", () => {
    expect(injectMorphLcpShell(SHELL, "/")).toBe(SHELL);
    expect(injectMorphLcpShell(SHELL, "/explore")).toBe(SHELL);
  });

  it("injects hero only on /ai-style", () => {
    const out = injectMorphLcpShell(SHELL, "/ai-style");
    expect(out).toContain('id="morph-lcp-static"');
    expect(out).toContain("try-on-selfie-hero-480.webp");
    expect(out).toContain('rel="preload"');
  });
});