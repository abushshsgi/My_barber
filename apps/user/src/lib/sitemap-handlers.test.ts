import { describe, expect, it } from "vitest";
import { maybeServeSeoAsset } from "./sitemap-handlers.server";

describe("maybeServeSeoAsset", () => {
  it("returns robots.txt", async () => {
    const res = await maybeServeSeoAsset(new Request("https://mysaloon.uz/robots.txt"));
    expect(res?.status).toBe(200);
    const body = await res!.text();
    expect(body).toContain("Sitemap:");
  });

  it("returns sitemap index", async () => {
    const res = await maybeServeSeoAsset(new Request("https://mysaloon.uz/sitemap.xml"));
    expect(res?.status).toBe(200);
    const body = await res!.text();
    expect(body).toContain("sitemapindex");
  });

  it("ignores unrelated paths", async () => {
    const res = await maybeServeSeoAsset(new Request("https://mysaloon.uz/map"));
    expect(res).toBeNull();
  });
});
