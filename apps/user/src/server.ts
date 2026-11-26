import "./lib/error-capture";

import { maybeProxyApi } from "./lib/api-proxy.server";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { injectMorphLcpShell } from "./lib/morph-lcp-shell.server";
import { injectSeoIntoHtml } from "./lib/seo-html-inject.server";
import { applyStaticCacheHeaders } from "./lib/static-cache.server";
import { maybeServeSeoAsset } from "./lib/sitemap-handlers.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const seoAsset = await maybeServeSeoAsset(request);
      if (seoAsset) return applyStaticCacheHeaders(request, seoAsset);

      const proxied = await maybeProxyApi(request);
      if (proxied) return applyStaticCacheHeaders(request, proxied);

      const handler = await getServerEntry();
      let response = await handler.fetch(request, env, ctx);
      response = await normalizeCatastrophicSsrResponse(response);

      const { pathname } = new URL(request.url);
      if (request.method === "GET" && response.headers.get("content-type")?.includes("text/html")) {
        response = await injectSeoIntoHtml(response, pathname);
        const html = injectMorphLcpShell(await response.text(), pathname);
        const outHeaders = new Headers(response.headers);
        outHeaders.delete("content-length");
        response = new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: outHeaders,
        });
      }

      return applyStaticCacheHeaders(request, response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
