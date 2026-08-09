const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");
const https = require("https");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

/** Web: react-native-maps native codegen — stub (MapScreen.web / OnboardingMap.web ishlatiladi). */
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      type: "sourceFile",
      filePath: path.resolve(projectRoot, "src/shims/react-native-maps.web.js"),
    };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

const UPSTREAM = (process.env.EXPO_PUBLIC_API_URL || "https://api.mysaloon.uz").replace(
  /\/+$/,
  "",
);

function sendProxyError(res, err) {
  if (res.headersSent || res.writableEnded) {
    try {
      res.destroy();
    } catch {
      /* ignore */
    }
    return;
  }
  res.writeHead(502, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "proxy_failed", message: String(err?.message || err) }));
}

/** Expo web CORS yo‘qotish: /api va /media → backend. */
function proxyToUpstream(req, res) {
  const target = new URL(req.url, UPSTREAM);
  const lib = target.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: target.host };
  delete headers["origin"];
  delete headers["referer"];

  // AI face-check / analyze uzoq davom etishi mumkin.
  const isAi = target.pathname.includes("/api/v1/ai/");
  const timeoutMs = isAi ? 120_000 : 30_000;

  const proxyReq = lib.request(
    target,
    { method: req.method, headers, timeout: timeoutMs },
    (proxyRes) => {
      proxyRes.on("error", (err) => sendProxyError(res, err));
      if (res.headersSent || res.writableEnded) {
        proxyRes.resume();
        return;
      }
      const outHeaders = { ...proxyRes.headers };
      delete outHeaders["access-control-allow-origin"];
      res.writeHead(proxyRes.statusCode || 502, outHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("timeout", () => {
    proxyReq.destroy(new Error("upstream_timeout"));
  });
  proxyReq.on("error", (err) => sendProxyError(res, err));
  req.on("aborted", () => {
    proxyReq.destroy();
  });
  res.on("close", () => {
    if (!res.writableEnded) proxyReq.destroy();
  });

  req.pipe(proxyReq);
}

const previousEnhance = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const base = previousEnhance ? previousEnhance(middleware, server) : middleware;
    return (req, res, next) => {
      const url = req.url || "";
      if (url.startsWith("/api/") || url.startsWith("/media/")) {
        return proxyToUpstream(req, res);
      }
      return base(req, res, next);
    };
  },
};

module.exports = config;
