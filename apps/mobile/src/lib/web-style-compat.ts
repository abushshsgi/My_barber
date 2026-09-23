import { Animated, Platform, StyleSheet } from "react-native";

/**
 * react-native-web 0.21 warns on shadow*, textShadow*, props.pointerEvents,
 * and useNativeDriver when the native animated module is absent (web).
 * Native iOS/Android keeps the original props.
 */

type StyleRecord = Record<string, unknown>;
type JsxFn = (
  type: unknown,
  props: StyleRecord | null | undefined,
  key?: unknown,
) => unknown;
type JsxRuntime = { jsx?: JsxFn; jsxs?: JsxFn };

declare function require(id: string): JsxRuntime;

function px(value: unknown): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${n}px`;
}

function shadowPaint(color: unknown, opacity: unknown): string {
  const paint = color == null || color === "" ? "#000" : String(color);
  if (opacity == null) return paint;
  const alpha = Number(opacity);
  if (!Number.isFinite(alpha) || alpha >= 1) return paint;
  const clamped = Math.max(0, Math.min(1, alpha)) * 100;
  return `color-mix(in srgb, ${paint} ${clamped}%, transparent)`;
}

function migrateStyle(style: StyleRecord): StyleRecord {
  const next: StyleRecord = { ...style };
  const hasShadow =
    next.shadowColor != null ||
    next.shadowOffset != null ||
    next.shadowOpacity != null ||
    next.shadowRadius != null;
  if (hasShadow) {
    const offset = (next.shadowOffset ?? {}) as { width?: number; height?: number };
    if (next.boxShadow == null) {
      next.boxShadow = `${px(offset.width)} ${px(offset.height)} ${px(next.shadowRadius)} ${shadowPaint(next.shadowColor, next.shadowOpacity)}`;
    }
    delete next.shadowColor;
    delete next.shadowOffset;
    delete next.shadowOpacity;
    delete next.shadowRadius;
  }

  const hasTextShadow =
    next.textShadowColor != null ||
    next.textShadowOffset != null ||
    next.textShadowRadius != null;
  if (hasTextShadow) {
    const offset = (next.textShadowOffset ?? {}) as { width?: number; height?: number };
    const x = offset.width ?? 0;
    const y = offset.height ?? 0;
    const blur = typeof next.textShadowRadius === "number" ? next.textShadowRadius : 0;
    if (next.textShadow == null && (x !== 0 || y !== 0 || blur !== 0)) {
      next.textShadow = `${px(x)} ${px(y)} ${px(blur)} ${String(next.textShadowColor ?? "#000")}`;
    }
    delete next.textShadowColor;
    delete next.textShadowOffset;
    delete next.textShadowRadius;
  }
  return next;
}

function styleNeedsMigrate(style: unknown): boolean {
  if (!style || typeof style !== "object") return false;
  if (Array.isArray(style)) return style.some(styleNeedsMigrate);
  const record = style as StyleRecord;
  return (
    record.shadowColor != null ||
    record.shadowOffset != null ||
    record.shadowOpacity != null ||
    record.shadowRadius != null ||
    record.textShadowColor != null ||
    record.textShadowOffset != null ||
    record.textShadowRadius != null
  );
}

function migrateStyleProp(style: unknown): unknown {
  if (Array.isArray(style)) return style.map(migrateStyleProp);
  if (!style || typeof style !== "object") return style;
  if (!styleNeedsMigrate(style)) return style;
  return migrateStyle(style as StyleRecord);
}

function patchStyleSheet() {
  const origCreate = StyleSheet.create;
  StyleSheet.create = ((styles: Record<string, StyleRecord>) => {
    const next: Record<string, StyleRecord> = {};
    for (const key of Object.keys(styles)) {
      const value = styles[key];
      next[key] =
        value && typeof value === "object" && !Array.isArray(value)
          ? (migrateStyle(value) as StyleRecord)
          : value;
    }
    return origCreate(next as never);
  }) as typeof StyleSheet.create;
}

function patchJsx(runtime: JsxRuntime | null) {
  if (!runtime) return;
  const wrap = (orig: JsxFn | undefined): JsxFn | undefined => {
    if (!orig) return orig;
    return (type, props, key) => {
      if (!props || (props.pointerEvents == null && !styleNeedsMigrate(props.style))) {
        return orig(type, props, key);
      }
      const next: StyleRecord = { ...props };
      if (next.pointerEvents != null) {
        const pointerEvents = next.pointerEvents;
        delete next.pointerEvents;
        const extra = { pointerEvents };
        next.style =
          next.style == null
            ? extra
            : Array.isArray(next.style)
              ? [...next.style, extra]
              : [next.style, extra];
      }
      if (styleNeedsMigrate(next.style)) {
        next.style = migrateStyleProp(next.style);
      }
      return orig(type, next, key);
    };
  };
  if (runtime.jsx) runtime.jsx = wrap(runtime.jsx);
  if (runtime.jsxs) runtime.jsxs = wrap(runtime.jsxs);
}

function disableNativeDriver<T extends { useNativeDriver?: boolean }>(config: T): T {
  if (config?.useNativeDriver) return { ...config, useNativeDriver: false };
  return config;
}

function patchAnimated() {
  const timing = Animated.timing;
  const spring = Animated.spring;
  const decay = Animated.decay;
  Animated.timing = ((value, config) =>
    timing(value, disableNativeDriver(config))) as typeof Animated.timing;
  Animated.spring = ((value, config) =>
    spring(value, disableNativeDriver(config))) as typeof Animated.spring;
  Animated.decay = ((value, config) =>
    decay(value, disableNativeDriver(config))) as typeof Animated.decay;
  const event = Animated.event;
  Animated.event = ((argMapping, config) =>
    event(argMapping, config ? disableNativeDriver(config) : config)) as typeof Animated.event;
}

const marker = globalThis as { __mysaloonWebStyleCompat?: boolean };

if (Platform.OS === "web" && !marker.__mysaloonWebStyleCompat) {
  marker.__mysaloonWebStyleCompat = true;
  patchStyleSheet();
  try {
    patchJsx(require("react/jsx-runtime"));
  } catch {
    /* runtime optional */
  }
  try {
    patchJsx(require("react/jsx-dev-runtime"));
  } catch {
    /* dev runtime optional */
  }
  patchAnimated();
}
