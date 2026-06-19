import { createContext, useContext } from "react";
import type { DesktopUiVariant } from "@/lib/desktop-variant";

const DesktopVariantContext = createContext<DesktopUiVariant>("marketplace");

export function DesktopVariantProvider({
  value,
  children,
}: {
  value: DesktopUiVariant;
  children: React.ReactNode;
}) {
  return <DesktopVariantContext.Provider value={value}>{children}</DesktopVariantContext.Provider>;
}

export function useDesktopVariant() {
  return useContext(DesktopVariantContext);
}
