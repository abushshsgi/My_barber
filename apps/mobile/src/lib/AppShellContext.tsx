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
  /** Switch overlay ko‘rinsin — target shell. */
  switchingTo: AppShell | null;
  setShell: (shell: AppShell) => void;
  rememberTab: (shell: AppShell, tab: string) => void;
  beginSwitch: (to: AppShell) => void;
  endSwitch: () => void;
  switchToMorphTarget: () => Promise<string>;
  switchToMysaloonTarget: () => Promise<string>;
};

export const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [shell, setShellState] = useState<AppShell>("morph");
  const [ready, setReady] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<AppShell | null>(null);

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

  const beginSwitch = useCallback((to: AppShell) => {
    setSwitchingTo(to);
  }, []);

  const endSwitch = useCallback(() => {
    setSwitchingTo(null);
  }, []);

  const switchToMorphTarget = useCallback(async () => {
    setShellState("morph");
    void writeAppShell("morph");
    return readLastMorphContentTab();
  }, []);

  const switchToMysaloonTarget = useCallback(async () => {
    setShellState("mysaloon");
    void writeAppShell("mysaloon");
    return readLastShellTab("mysaloon");
  }, []);

  const value = useMemo(
    () => ({
      shell,
      ready,
      switchingTo,
      setShell,
      rememberTab,
      beginSwitch,
      endSwitch,
      switchToMorphTarget,
      switchToMysaloonTarget,
    }),
    [
      shell,
      ready,
      switchingTo,
      setShell,
      rememberTab,
      beginSwitch,
      endSwitch,
      switchToMorphTarget,
      switchToMysaloonTarget,
    ],
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
