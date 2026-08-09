import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Ctx = {
  hidden: boolean;
  acquireHide: () => void;
  releaseHide: () => void;
};

const TabBarVisibilityContext = createContext<Ctx | null>(null);

/** Custom dock — nested stack setOptions o‘rniga ishonchli yashirish. */
export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const [hideCount, setHideCount] = useState(0);

  const acquireHide = useCallback(() => {
    setHideCount((n) => n + 1);
  }, []);

  const releaseHide = useCallback(() => {
    setHideCount((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo(
    () => ({
      hidden: hideCount > 0,
      acquireHide,
      releaseHide,
    }),
    [acquireHide, hideCount, releaseHide],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarHidden(): boolean {
  return useContext(TabBarVisibilityContext)?.hidden ?? false;
}

export function useTabBarHideControls(): Pick<Ctx, "acquireHide" | "releaseHide"> {
  const ctx = useContext(TabBarVisibilityContext);
  return {
    acquireHide: ctx?.acquireHide ?? (() => undefined),
    releaseHide: ctx?.releaseHide ?? (() => undefined),
  };
}
