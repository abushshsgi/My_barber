import { describe, expect, it } from "vitest";
import { injectExploreLcpShell } from "./explore-lcp-shell.server";

const SHELL = "<!DOCTYPE html><html><head></head><body></body></html>";

describe("injectExploreLcpShell", () => {
  it("skips non explore catalog routes", () => {
    expect(injectExploreLcpShell(SHELL, "/")).toBe(SHELL);
    expect(injectExploreLcpShell(SHELL, "/guides")).toBe(SHELL);
  });

  it("injects hero on explore paths including locale prefix", () => {
    for (const path of ["/explore", "/en/explore", "/ru/explore"]) {
      const out = injectExploreLcpShell(SHELL, path);
      expect(out).toContain('id="explore-lcp-static"');
      expect(out).toContain("mid-fade.webp");
      expect(out).toContain('rel="preload"');
    }
  });
});