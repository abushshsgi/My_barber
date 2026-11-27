import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { APIRequestContext, Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, "../../../../backend");

export const PLAYWRIGHT_ISOLATED_API =
  process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8001";
export const PLAYWRIGHT_ISOLATED_PHONE = "+998900000199";
export const PLAYWRIGHT_ISOLATED_PASSWORD = "PlaywrightIsolated1!";

type TokenResponse = {
  access: string;
  refresh: string;
  session_id?: number;
  user: { id: number; phone?: string };
};

function obtainTokensViaManagement(): TokenResponse {
  const raw = execFileSync(
    "python",
    ["manage.py", "playwright_auth_json"],
    {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        DATABASE_URL: process.env.PLAYWRIGHT_DATABASE_URL ?? "sqlite:///qa_verify_8001.sqlite3",
        MYSALOON_QA_ISOLATED: "1",
        REDIS_URL: "",
      },
      encoding: "utf8",
    },
  ).trim();
  return JSON.parse(raw) as TokenResponse;
}

export async function obtainIsolatedTokens(
  request: APIRequestContext,
): Promise<TokenResponse> {
  if (process.env.PLAYWRIGHT_AUTH_VIA_MGMT !== "0") {
    try {
      return obtainTokensViaManagement();
    } catch {
      /* fall through to HTTP login when management emit unavailable */
    }
  }
  const res = await request.post(
    `${PLAYWRIGHT_ISOLATED_API}/api/v1/auth/phone/password-login/`,
    {
      data: {
        phone: PLAYWRIGHT_ISOLATED_PHONE,
        password: PLAYWRIGHT_ISOLATED_PASSWORD,
      },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `Isolated login failed (${res.status()}): ${(await res.text()).slice(0, 200)}`,
    );
  }
  return (await res.json()) as TokenResponse;
}

export async function seedIsolatedAuth(
  page: Page,
  tokens: TokenResponse,
): Promise<void> {
  await page.addInitScript(
    ({ access, refresh, sessionId, user }) => {
      localStorage.setItem("mybarber_user_access", access);
      localStorage.setItem("mybarber_user_refresh", refresh);
      if (sessionId != null) {
        localStorage.setItem("mybarber_user_session_id", String(sessionId));
      }
      localStorage.setItem("mysaloon.auth.user", JSON.stringify(user));
    },
    {
      access: tokens.access,
      refresh: tokens.refresh,
      sessionId: tokens.session_id ?? null,
      user: { id: tokens.user.id, phone: tokens.user.phone ?? "900000199" },
    },
  );
}

export async function verifyHistoryApiAccess(
  request: APIRequestContext,
  tokens: TokenResponse,
): Promise<{ status: number; count: number }> {
  const res = await request.get(`${PLAYWRIGHT_ISOLATED_API}/api/v1/hair-advisor/history/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  if (!res.ok()) {
    return { status: res.status(), count: -1 };
  }
  const rows = (await res.json()) as unknown[];
  return { status: res.status(), count: Array.isArray(rows) ? rows.length : -1 };
}