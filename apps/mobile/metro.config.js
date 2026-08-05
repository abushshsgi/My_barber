const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");
const https = require("https");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const UPSTREAM = (process.env.EXPO_PUBLIC_API_URL || "https://api.mysaloon.uz").replace(
  /\/+$/,
  "",
);

/** Expo web CORS yo‘qotish: /api va /media → backend. */
function proxyToUpstream(req, res) {
  const target = new URL(req.url, UPSTREAM);
  const lib = target.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: target.host };
  delete headers["origin"];
  delete headers["referer"];

  const proxyReq = lib.request(
    target,
    { method: req.method, headers },
    (proxyRes) => {
      const outHeaders = { ...proxyRes.headers };
      // Same-origin proxy — CORS kerak emas, lekin cache chalkashmasin.
      delete outHeaders["access-control-allow-origin"];
      res.writeHead(proxyRes.statusCode || 502, outHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "proxy_failed", message: String(err.message) }));
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
