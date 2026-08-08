import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AppShell,
  readAppShell,
  readLastMorphContentTab,
  readLastShellTab,
  writeAppShell,
  writeLastShellTab,
} from "./app-shell";

type AppShellContextValue = {
  shell: AppShell;
  ready: boolean;
  setShell: (shell: AppShell) => void;
  rememberTab: (shell: AppShell, tab: string) => void;
  switchToMorphTarget: () => Promise<string>;
  switchToMysaloonTarget: () => Promise<string>;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [shell, setShellState] = useState<AppShell>("mysaloon");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void readAppShell().then((value) => {
      if (!alive) return;
      setShellState(value);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setShell = useCallback((next: AppShell) => {
    setShellState(next);
    void writeAppShell(next);
  }, []);

  const rememberTab = useCallback((target: AppShell, tab: string) => {
    void writeLastShellTab(target, tab);
  }, []);

  const switchToMorphTarget = useCallback(async () => {
    setShellState("morph");
    await writeAppShell("morph");
    return readLastMorphContentTab();
  }, []);

  const switchToMysaloonTarget = useCallback(async () => {
    setShellState("mysaloon");
    await writeAppShell("mysaloon");
    return readLastShellTab("mysaloon");
  }, []);

  const value = useMemo(
    () => ({
      shell,
      ready,
      setShell,
      rememberTab,
      switchToMorphTarget,
      switchToMysaloonTarget,
    }),
    [shell, ready, setShell, rememberTab, switchToMorphTarget, switchToMysaloonTarget],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
}
