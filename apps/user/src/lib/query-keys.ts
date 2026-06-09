export function userQueryKey<T extends readonly string[]>(
  base: T,
  userId: number | null | undefined,
): readonly [...T, number] | T {
  return userId != null ? ([...base, userId] as const) : base;
}
