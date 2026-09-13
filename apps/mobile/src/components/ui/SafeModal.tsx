import type { ComponentProps, ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from "react-native-safe-area-context";

type RNModalProps = ComponentProps<typeof Modal>;

type Props = Omit<RNModalProps, "children"> & {
  children: ReactNode;
  /**
   * Android edge-to-edge: Modal yangi window ochganda insets 0 bo‘lishini
   * oldini olish uchun ichki SafeAreaProvider (default: true).
   */
  withSafeArea?: boolean;
};

/**
 * Native Modal + SafeAreaProvider.
 * Status/nav bar translucent — sheet footer `useSafePads`/`safeBottom` bilan ishlaydi.
 */
export function SafeModal({
  children,
  withSafeArea = true,
  statusBarTranslucent = true,
  navigationBarTranslucent = true,
  ...rest
}: Props) {
  const body = withSafeArea ? (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.fill}>{children}</View>
    </SafeAreaProvider>
  ) : (
    children
  );

  return (
    <Modal
      statusBarTranslucent={statusBarTranslucent}
      navigationBarTranslucent={navigationBarTranslucent}
      {...rest}
    >
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
