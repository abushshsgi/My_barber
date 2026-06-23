import { createContext, useContext, type ReactNode } from "react";
import type { AuthAccent } from "@/lib/auth-desktop-variant";

const AuthAccentContext = createContext<AuthAccent>("violet");

export function AuthAccentProvider({ accent, children }: { accent: AuthAccent; children: ReactNode }) {
  return <AuthAccentContext.Provider value={accent}>{children}</AuthAccentContext.Provider>;
}

export function useAuthAccent() {
  return useContext(AuthAccentContext);
}
