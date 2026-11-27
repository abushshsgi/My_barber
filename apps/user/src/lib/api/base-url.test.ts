import { describe, expect, it } from "vitest";
import { resolveApiUpstream } from "./base-url";

describe("resolveApiUpstream", () => {
  const originalEnv = process.env;

  it("prefers API_UPSTREAM_URL when set", () => {
    process.env = { ...originalEnv, API_UPSTREAM_URL: "http://127.0.0.1:9001", NODE_ENV: "development" };
    expect(resolveApiUpstream()).toBe("http://127.0.0.1:9001");
    process.env = originalEnv;
  });

  it("does not default to production in development without env", () => {
    process.env = {
      ...originalEnv,
      API_UPSTREAM_URL: "",
      NODE_ENV: "development",
      CONTENT_API_URL: "http://127.0.0.1:8000",
    };
    expect(resolveApiUpstream()).toBe("http://127.0.0.1:8000");
    process.env = originalEnv;
  });
});