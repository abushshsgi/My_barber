import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveBuildId() {
  let raw;
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    raw = process.env.VERCEL_GIT_COMMIT_SHA;
  } else if (process.env.GITHUB_SHA) {
    raw = process.env.GITHUB_SHA;
  } else {
    try {
      raw = execSync("git rev-parse --short HEAD", { cwd: appDir, encoding: "utf8" }).trim();
    } catch {
      return `local-${Date.now().toString(36)}`;
    }
  }
  // Vercel SHA (12) va git short (7) bir xil formatda bo'lsin — reload loop oldini olish.
  return raw.slice(0, 7);
}

const buildId = resolveBuildId();
const payload = { buildId, builtAt: new Date().toISOString() };

writeFileSync(path.join(appDir, ".build-id"), buildId);
writeFileSync(path.join(appDir, "version.json"), JSON.stringify(payload));
writeFileSync(
  path.join(appDir, "src/lib/app-build-id.ts"),
  `/** Generated at build — do not edit */\nexport const APP_BUILD_ID = ${JSON.stringify(buildId)};\n`,
);

const bootScript = `/** Generated at build — do not edit */
export const CLIENT_BOOT_SCRIPT = ${JSON.stringify(
  `(function(){
var BUILD=${JSON.stringify(buildId)};
var CK="mysaloon-app-build";
function purge(cb){
  var t=[];
  if("serviceWorker"in navigator)t.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));
  if("caches"in window)t.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}));
  if(t.length)Promise.all(t).then(function(){if(cb)cb()});else if(cb)cb();
}
try{
  if(localStorage.getItem(CK)===BUILD)return;
  localStorage.setItem(CK,BUILD);
  purge(function(){
    var u=new URL(location.href);
    u.searchParams.set("_v",Date.now().toString(36));
    location.replace(u.toString());
  });
}catch(e){}
})();`,
)};
`;

writeFileSync(path.join(appDir, "src/lib/client-boot-script.ts"), bootScript);

console.log(`App build ID: ${buildId}`);
