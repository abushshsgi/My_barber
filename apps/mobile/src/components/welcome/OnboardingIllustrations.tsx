import Svg, { Circle, Path, Rect, G } from "react-native-svg";
import { View } from "react-native";

/** Slide 2 — soch uslubi / Morf AI illustratsiyasi. */
export function MorphAiIllustration({ size = 220 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        <Circle cx="110" cy="110" r="96" fill="#F2F4F8" />
        <Circle cx="110" cy="110" r="72" fill="#E8ECF3" />
        {/* Telefon ramka */}
        <Rect x="70" y="48" width="80" height="124" rx="16" fill="#0A0A0A" />
        <Rect x="76" y="58" width="68" height="96" rx="8" fill="#FFFFFF" />
        {/* Soch silueti */}
        <Path
          d="M96 88c0-12 10-22 24-22s24 10 24 22c0 8-4 14-8 18v8c0 10-7 18-16 18s-16-8-16-18v-8c-4-4-8-10-8-18z"
          fill="#0A0A0A"
        />
        <Path
          d="M100 78c6-8 14-10 20-8 4 8 2 16-2 20-6-2-12 0-18-4z"
          fill="#FF5C5C"
          opacity="0.85"
        />
        {/* Sparkles */}
        <Path d="M158 72l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" fill="#FF5C5C" />
        <Path d="M52 120l2.5 5.5 5.5 2.5-5.5 2.5-2.5 5.5-2.5-5.5-5.5-2.5 5.5-2.5 2.5-5.5z" fill="#0A0A0A" />
        <Circle cx="168" cy="140" r="5" fill="#0A0A0A" />
        <Circle cx="58" cy="78" r="4" fill="#FF5C5C" />
      </Svg>
    </View>
  );
}

/** Slide 3 — joylashuv / xarita pin illustratsiyasi. */
export function LocationIllustration({ size = 220 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        <Circle cx="110" cy="110" r="96" fill="#F2F4F8" />
        {/* Xarita varaq */}
        <G transform="translate(40 118) rotate(-6)">
          <Rect x="0" y="0" width="140" height="70" rx="10" fill="#E5E9F0" />
          <Path d="M12 22h40M12 36h56M12 50h28" stroke="#C5CCD8" strokeWidth="4" strokeLinecap="round" />
          <Rect x="88" y="18" width="36" height="28" rx="6" fill="#D4DAE4" />
        </G>
        {/* Pin */}
        <Path
          d="M110 42c-22 0-40 17-40 39 0 28 40 71 40 71s40-43 40-71c0-22-18-39-40-39z"
          fill="#0A0A0A"
        />
        <Circle cx="110" cy="80" r="14" fill="#FFFFFF" />
        <Circle cx="110" cy="80" r="7" fill="#FF5C5C" />
        {/* Dashed arc */}
        <Path
          d="M48 96c18-28 48-40 76-36"
          stroke="#FF5C5C"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          fill="none"
          opacity="0.7"
        />
      </Svg>
    </View>
  );
}
