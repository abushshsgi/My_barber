/**
 * HTTPS reverse proxy for the local user app so a phone browser can open the camera.
 * Forwards to http://127.0.0.1:3000. Does not deploy and does not touch production.
 *
 *   node scripts/dev-https-preview.mjs
 *
 * Desktop can skip this and use http://127.0.0.1:3000 (already a secure context).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(here, ".certs");
const keyPath = path.join(certDir, "dev-key.pem");
const certPath = path.join(certDir, "dev-cert.pem");
const targetPort = Number(process.env.PREVIEW_TARGET_PORT || 3000);
const listenPort = Number(process.env.PREVIEW_HTTPS_PORT || 3443);

function lanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

function ensureCert() {
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) return true;
  fs.mkdirSync(certDir, { recursive: true });
  const names = ["localhost", "127.0.0.1", ...lanAddresses()];
  const alt = names.map((name) => (name.includes(":") ? `IP:${name}` : name.match(/^\d/) ? `IP:${name}` : `DNS:${name}`)).join(",");
  const result = spawnSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "14",
      "-nodes",
      "-subj",
      "/CN=mysaloon-scanner-preview",
      "-addext",
      `subjectAltName=${alt}`,
    ],
    { stdio: "inherit" },
  );
  if (result.status === 0) return true;
  console.error("");
  console.error("OpenSSL is not available, so this script did not create a certificate.");
  console.error("On Windows PowerShell, create one and export PEM files to scripts/.certs/:");
  console.error("");
  console.error(`$cert = New-SelfSignedCertificate -DnsName ${names.map((n) => `"${n}"`).join(",")} -CertStoreLocation Cert:\\CurrentUser\\My -NotAfter (Get-Date).AddDays(14)`);
  console.error(`$pwd = ConvertTo-SecureString -String "preview" -Force -AsPlainText`);
  console.error(`Export-PfxCertificate -Cert $cert -FilePath "$env:TEMP\\mysaloon-preview.pfx" -Password $pwd`);
  console.error("Then convert the PFX to scripts/.certs/dev-cert.pem and scripts/.certs/dev-key.pem with OpenSSL,");
  console.error("trust that certificate on the phone, and run this script again.");
  console.error("");
  console.error("Desktop camera QA does not need this proxy:");
  console.error(`  http://127.0.0.1:${targetPort}/ai-style/care/ingredient`);
  return false;
}

function proxyRequest(req, res) {
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Local user app is not accepting connections on 127.0.0.1:${targetPort}. Start it with: npm run dev:user`);
    }
  });
  req.pipe(upstream);
}

if (!ensureCert()) process.exit(1);

const server = https.createServer(
  { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
  proxyRequest,
);

server.on("upgrade", (req, socket, head) => {
  const upstream = http.request({
    hostname: "127.0.0.1",
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });
  upstream.on("upgrade", (res, upSocket, upHead) => {
    const headers = [`HTTP/1.1 ${res.statusCode} ${res.statusMessage}`];
    for (const [key, value] of Object.entries(res.headers)) {
      if (value == null) continue;
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) headers.push(`${key}: ${item}`);
    }
    socket.write(`${headers.join("\r\n")}\r\n\r\n`);
    if (upHead.length) socket.write(upHead);
    if (head.length) upSocket.write(head);
    upSocket.pipe(socket);
    socket.pipe(upSocket);
  });
  upstream.on("error", () => socket.destroy());
  upstream.end();
});

server.listen(listenPort, "0.0.0.0", () => {
  const pathName = "/ai-style/care/ingredient";
  console.log(`Desktop: https://127.0.0.1:${listenPort}${pathName}`);
  for (const ip of lanAddresses()) {
    console.log(`Phone (trust the cert): https://${ip}:${listenPort}${pathName}`);
  }
  console.log(`Proxy target: http://127.0.0.1:${targetPort}`);
  console.log("API stays on the Vite proxy (local backend). This is not a production deploy.");
});
