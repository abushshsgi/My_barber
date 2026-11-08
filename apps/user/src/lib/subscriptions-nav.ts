export type SubscriptionsSearch = {
  plan?: string;
  returnTo?: string;
};

function optString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseSubscriptionsSearch(search: Record<string, unknown>): SubscriptionsSearch {
  return {
    plan: optString(search.plan),
    returnTo: optString(search.returnTo),
  };
}
