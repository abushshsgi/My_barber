import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/**
 * Login landing — Soft Paper: profil + soch try-on oynasi (naushnik o‘rniga).
 */
export function LoginHeroIllustration({ size = 200 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Circle cx="120" cy="120" r="108" fill="#F4F4F5" />
        <Circle cx="120" cy="120" r="88" fill="#FAFAFA" />

        {/* Soft ground */}
        <Ellipse cx="120" cy="198" rx="64" ry="8" fill="#E5E5E5" />

        {/* Mirror / try-on frame */}
        <G transform="translate(132 54)">
          <Rect x="0" y="0" width="72" height="96" rx="16" fill="#111111" />
          <Rect x="6" y="8" width="60" height="72" rx="10" fill="#FFFFFF" />
          {/* Mini hairstyle preview */}
          <Path
            d="M36 28c-12 0-20 10-18 22 1 8 8 14 18 14s17-6 18-14c2-12-6-22-18-22z"
            fill="#111111"
          />
          <Circle cx="36" cy="44" r="11" fill="#FFF8F0" />
          <Circle cx="32" cy="43" r="1.6" fill="#111" />
          <Circle cx="40" cy="43" r="1.6" fill="#111" />
          <Path d="M32 49c2.5 2.5 5.5 2.5 8 0" stroke="#111" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <Path d="M24 66c2-8 8-12 12-12s10 4 12 12" fill="#111111" />
          {/* Spark */}
          <Path d="M58 18l1.8 4 4 1.8-4 1.8-1.8 4-1.8-4-4-1.8 4-1.8 1.8-4z" fill="#C6EF4A" />
        </G>

        {/* Person (left) */}
        <G transform="translate(48 62)">
          <Path
            d="M44 36c-16 0-28 14-26 30 2 10 11 18 26 18s24-8 26-18c2-16-10-30-26-30z"
            fill="#111111"
          />
          <Circle cx="44" cy="58" r="20" fill="#FFF8F0" />
          <Path d="M30 54c3.5-1.5 7-1.5 10.5 0M47.5 54c3.5-1.5 7-1.5 10.5 0" stroke="#111" strokeWidth="2" strokeLinecap="round" />
          <Circle cx="36" cy="60" r="2" fill="#111" />
          <Circle cx="52" cy="60" r="2" fill="#111" />
          <Path d="M38 68c3.5 3.5 8.5 3.5 12 0" stroke="#111" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Body */}
          <Path
            d="M20 98c-2 22 8 42 24 46 16 4 28-10 30-28 2-14-4-32-14-42-6 12-22 16-40 24z"
            fill="#111111"
          />
          <Path
            d="M28 104c2 16 8 28 16 32"
            stroke="#C6EF4A"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Hand pointing to mirror */}
          <Path
            d="M72 92c14-4 28 6 26 18-2 8-12 12-22 8"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="98" cy="104" r="8" fill="#FFF8F0" stroke="#111" strokeWidth="2.5" />
        </G>

        {/* Floating scissors accent */}
        <G transform="translate(42 158)">
          <Circle cx="10" cy="10" r="7" fill="none" stroke="#111" strokeWidth="2.2" />
          <Circle cx="28" cy="10" r="7" fill="none" stroke="#111" strokeWidth="2.2" />
          <Path d="M15 14l18 22M23 14L5 36" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/** Ism bosqichi — profil kartochkasi. */
export function ProfileHeroIllustration({ size = 180 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 180 180">
        <Circle cx="90" cy="90" r="78" fill="#F4F4F5" />
        <Circle cx="90" cy="72" r="28" fill="#111111" />
        <Circle cx="90" cy="76" r="20" fill="#FFF8F0" />
        <Circle cx="82" cy="74" r="2.4" fill="#111" />
        <Circle cx="98" cy="74" r="2.4" fill="#111" />
        <Path d="M84 84c4 4 8 4 12 0" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Path d="M62 128c4-22 16-32 28-32s24 10 28 32" fill="#111111" />
        <Rect x="48" y="132" width="84" height="22" rx="11" fill="#111111" />
        <Path d="M64 143h52" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
