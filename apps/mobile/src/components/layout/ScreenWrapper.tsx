import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { H_PADDING, TAB_DOCK_CLEARANCE, spacing } from "../../utils/responsive";
import { AppStatusBar, safeTop } from "../ui/AppStatusBar";

/** Home indicator bo'lmagan Android'da ham minimal pastki chekka. */
const MIN_BOTTOM_PAD = 10;

export type ScreenWrapperProps = {
  children: ReactNode;

  /**
   * `false` (default) — single-screen dashboard: kontent `flex: 1` ichida,
   * scroll yo'q. `true` — uzun forma/ro'yxat sahifalari uchun.
   */
  scrollable?: boolean;

  /**
   * Floating tab dock ostida joy qoldiradi. Tab bar ko'rinadigan barcha
   * asosiy sahifalarda `true` bo'lishi kerak.
   */
  withTabDock?: boolean;

  /** Safe area qaysi tomonlarga qo'llanadi. */
  edges?: {
    top?: boolean;
    bottom?: boolean;
    horizontal?: boolean;
  };

  /** Standart gorizontal chekka (`H_PADDING`). Custom bg uchun `false`. */
  padded?: boolean;

  backgroundColor?: string;

  /** Gradient / mesh fon — kontent ostiga absolute joylashtiriladi. */
  backdrop?: ReactNode;

  /** Scroll qilinmaydigan sticky pastki panel (CTA tugmalari). */
  footer?: ReactNode;

  /** Klaviatura ochilganda kontentni ko'tarish (forma va chat sahifalari). */
  keyboardAvoiding?: boolean;

  statusBarStyle?: "light" | "dark" | "auto";

  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;

  testID?: string;
};

/**
 * Barcha sahifalar uchun yagona safe-area qobig'i.
 *
 * - Notch / Dynamic Island bilan to'qnashuvni bartaraf etadi.
 * - Pastki Home Bar va floating tab dock ostida tugmalar kesilmasligini kafolatlaydi.
 * - Default holatda scroll yo'q: kontent `flex: 1` ichida bir ekranga sig'adi.
 */
export function ScreenWrapper({
  children,
  scrollable = false,
  withTabDock = false,
  edges,
  padded = true,
  backgroundColor = colors.bg,
  backdrop,
  footer,
  keyboardAvoiding = false,
  statusBarStyle,
  style,
  contentStyle,
  testID,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  const applyTop = edges?.top ?? true;
  const applyBottom = edges?.bottom ?? true;
  const applyHorizontal = edges?.horizontal ?? true;

  const frame = useMemo(() => {
    const dock = withTabDock ? TAB_DOCK_CLEARANCE : 0;
    const top = applyTop ? safeTop(insets.top) : 0;
    const safeBottom = applyBottom ? Math.max(insets.bottom, MIN_BOTTOM_PAD) : 0;

    return {
      paddingTop: top,
      paddingBottom: safeBottom + dock,
      /** Landscape notch — chap/o'ng tomondagi kesilishning oldini oladi. */
      paddingLeft: applyHorizontal ? insets.left : 0,
      paddingRight: applyHorizontal ? insets.right : 0,
    };
  }, [
    applyBottom,
    applyHorizontal,
    applyTop,
    insets.bottom,
    insets.left,
    insets.right,
    insets.top,
    withTabDock,
  ]);

  const horizontalPad = padded ? { paddingHorizontal: H_PADDING } : null;

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, horizontalPad, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[styles.content, horizontalPad, contentStyle]}
      testID={testID ? `${testID}-content` : undefined}
    >
      {children}
    </View>
  );

  const frameContent = (
    <View
      style={[
        styles.frame,
        {
          paddingTop: frame.paddingTop,
          paddingLeft: frame.paddingLeft,
          paddingRight: frame.paddingRight,
        },
      ]}
    >
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            padded && { paddingHorizontal: H_PADDING },
            { paddingBottom: frame.paddingBottom },
          ]}
        >
          {footer}
        </View>
      ) : (
        <View style={{ height: frame.paddingBottom }} pointerEvents="none" />
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor }, style]} testID={testID}>
      {statusBarStyle ? <AppStatusBar style={statusBarStyle} /> : null}
      {backdrop ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {backdrop}
        </View>
      ) : null}

      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {frameContent}
        </KeyboardAvoidingView>
      ) : (
        frameContent
      )}
    </View>
  );
}

/**
 * Single-screen dashboard qatori — bolalarni teng taqsimlaydi va
 * kichik ekranda ortiqcha bo'sh joyni yig'ishtiradi.
 */
export function ScreenSection({
  children,
  grow = false,
  style,
}: {
  children: ReactNode;
  /** `true` — qolgan bo'sh joyni egallaydi (rasm/kamera bloklari uchun). */
  grow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[grow ? styles.grow : styles.section, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  frame: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingTop: spacing.sm,
  },
  section: {
    flexShrink: 1,
    minHeight: 0,
  },
  grow: {
    flex: 1,
    minHeight: 0,
  },
});
