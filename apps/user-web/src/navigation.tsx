import {
  Link as RouterLink,
  useNavigate,
  useParams as useRouterParams,
  useRouterState,
} from "@tanstack/react-router";

export const Link = RouterLink;

export function usePathname(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}

// Next.js useParams() returns Record<string, string | string[]>
export function useParams(): Record<string, string> {
  const p = useRouterParams({ strict: false }) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p || {})) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function useRouter(): { push: (to: string) => void; replace: (to: string) => void; back: () => void } {
  const navigate = useNavigate();
  return {
    push: (to) => void navigate({ to }),
    replace: (to) => void navigate({ to, replace: true }),
    back: () => window.history.back(),
  };
}

