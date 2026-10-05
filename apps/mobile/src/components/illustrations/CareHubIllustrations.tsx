import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

const fill = StyleSheet.absoluteFillObject;

/** Parvarish kartasi — serum, likopcha va sochiq. */
export function CareHubRoutineIllustration() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 200 174"
      preserveAspectRatio="xMidYMid slice"
      style={fill}
    >
      <Defs>
        <LinearGradient id="careHubRoutineBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F8F3EC" />
          <Stop offset="1" stopColor="#E6D3BE" />
        </LinearGradient>
        <LinearGradient id="careHubSerum" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F8E7A8" />
          <Stop offset="1" stopColor="#E2C15A" />
        </LinearGradient>
      </Defs>

      <Rect width="200" height="174" fill="url(#careHubRoutineBg)" />
      <Circle cx="34" cy="42" r="36" fill="#FFF8F0" opacity={0.85} />
      <Path
        d="M18 34c8-14 18-16 26-8-6 2-10 8-10 14 4-2 10-2 14 2-10 4-20 2-30-8z"
        fill="#E7D7C2"
      />

      <Ellipse cx="96" cy="132" rx="72" ry="16" fill="#D9CBB8" />
      <Ellipse cx="96" cy="126" rx="66" ry="13" fill="#EFE4D4" />
      <Circle cx="62" cy="124" r="1.4" fill="#CDBBA6" />
      <Circle cx="78" cy="130" r="1.2" fill="#CDBBA6" />
      <Circle cx="108" cy="122" r="1.3" fill="#CDBBA6" />
      <Circle cx="124" cy="129" r="1.1" fill="#CDBBA6" />

      <G>
        <Path
          d="M138 78c18 4 28 16 26 28-2 10-12 16-24 14-4 8-2 16 6 20 10 4 8 12-2 14-16 4-28-6-26-18 2-8 8-12 8-12s-10-2-12-12c-2-12 8-28 24-34z"
          fill="#F4EBE1"
        />
        <Path
          d="M146 96c10 2 16 8 14 16-6 2-14 0-20-6 2-4 4-8 6-10z"
          fill="#E7D9C8"
        />
      </G>

      <Rect x="78" y="62" width="32" height="58" rx="10" fill="#FFFFFF" opacity={0.72} />
      <Rect x="82" y="78" width="24" height="36" rx="7" fill="url(#careHubSerum)" />
      <Circle cx="90" cy="88" r="1.6" fill="#FFF8E8" opacity={0.9} />
      <Circle cx="98" cy="98" r="1.2" fill="#FFF8E8" opacity={0.8} />
      <Circle cx="92" cy="106" r="1.4" fill="#FFF8E8" opacity={0.75} />
      <Rect x="86" y="50" width="16" height="14" rx="3" fill="#F7F4EF" />
      <Rect x="82" y="38" width="24" height="14" rx="4" fill="#FFFFFF" />
      <Circle cx="94" cy="32" r="7" fill="#FFFFFF" />
      <Rect x="92.2" y="36" width="3.6" height="28" rx="1.5" fill="#F3E7C4" opacity={0.9} />
    </Svg>
  );
}

/** Tarkib kartasi — skaner telefon va mahsulot idishi. */
export function CareHubScanIllustration() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 200 174"
      preserveAspectRatio="xMidYMid slice"
      style={fill}
    >
      <Defs>
        <LinearGradient id="careHubScanBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F7F6F3" />
          <Stop offset="1" stopColor="#D5E7E3" />
        </LinearGradient>
        <LinearGradient id="careHubScreen" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E7F4F1" />
          <Stop offset="1" stopColor="#8FBDB4" />
        </LinearGradient>
      </Defs>

      <Rect width="200" height="174" fill="url(#careHubScanBg)" />
      <Ellipse cx="168" cy="48" rx="48" ry="36" fill="#C5DDD8" opacity={0.85} />

      <G transform="rotate(-14 118 58)">
        <Rect x="78" y="28" width="86" height="54" rx="10" fill="#111111" />
        <Rect x="84" y="34" width="74" height="42" rx="6" fill="url(#careHubScreen)" />
        <Path d="M92 55h58" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.7} />
        <Path
          d="M96 46h8M96 64h8M146 46v8M154 46h-8M146 64h8M154 56v8"
          stroke="#111111"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </G>

      <Rect x="78" y="96" width="44" height="70" rx="14" fill="#F4F1EC" />
      <Rect x="78" y="96" width="44" height="16" rx="8" fill="#3E8F86" />
      <Path
        d="M78 124c10 6 16-4 24 2s14-2 20 4v36H78v-42z"
        fill="#7EB8B0"
        opacity={0.85}
      />
      <Path
        d="M78 136c12 4 14-6 26-2s16 2 18 6v24H78v-28z"
        fill="#5AA39A"
        opacity={0.9}
      />

      <Circle cx="46" cy="118" r="16" fill="#FFFFFF" opacity={0.7} />
      <Path d="M46 108l2.2 5 5.2 2.2-5.2 2.2-2.2 5-2.2-5-5.2-2.2 5.2-2.2 2.2-5z" fill="#C6EF4A" />
    </Svg>
  );
}
