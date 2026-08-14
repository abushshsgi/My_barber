import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppToast, type AppToastTone } from "./AppToast";
import { sanitizeDisplayError } from "../../lib/network-error";

export type ShowToastOptions = {
  tone?: AppToastTone;
  /** ms — 0 = qo‘lda yopilmaguncha turadi */
  durationMs?: number;
};

type ToastItem = {
  id: number;
  message: string;
  tone: AppToastTone;
  durationMs: number;
};

type ToastContextValue = {
  show: (message: string, options?: ShowToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);

  const hide = useCallback(() => {
    setToast(null);
  }, []);

  const show = useCallback((message: string, options?: ShowToastOptions) => {
    const next: ToastItem = {
      id: ++toastSeq,
      message: sanitizeDisplayError(message.trim() || "Xabar"),
      tone: options?.tone ?? "info",
      durationMs: options?.durationMs ?? 4200,
    };
    setToast(next);
  }, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[styles.host, { paddingTop: Math.max(insets.top, 10) + 6 }]}
      >
        {toast ? (
          <AppToast
            key={toast.id}
            message={toast.message}
            tone={toast.tone}
            durationMs={toast.durationMs}
            onDismiss={hide}
          />
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useAppToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useAppToast ToastProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    paddingHorizontal: 16,
  },
});
