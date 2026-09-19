import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/** Login landing — chiziqli illustratsiya (naushnik, noutbuk, qo‘l silkitish). */
export function LoginHeroIllustration({ size = 240 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Ellipse cx="120" cy="208" rx="78" ry="10" fill="#E8F5D8" />
        <Path
          d="M28 168c18-28 38-22 46 6 4 14-8 28-22 30-22 4-36-14-24-36z"
          fill="#C6EF4A"
        />
        <Path
          d="M34 150c6-18 22-16 26 2 2 10-6 18-14 18-12 2-18-8-12-20z"
          fill="#1C4A32"
        />
        <Path
          d="M186 172c-14-24-36-18-42 6-4 16 10 30 24 30 22 2 32-16 18-36z"
          fill="#C6EF4A"
        />
        <Path
          d="M198 154c-6-16-20-14-24 2-2 10 6 16 14 16 12 0 16-8 10-18z"
          fill="#1C4A32"
        />

        <G transform="translate(58 46)">
          <Path
            d="M42 38c-18 0-30 16-28 34 2 12 12 20 28 20s26-8 28-20c2-18-10-34-28-34z"
            fill="#111111"
          />
          <Path d="M22 58c0-16 10-28 22-30 4 10 2 22-4 28-8 2-14 4-18 2z" fill="#C6EF4A" />
          <Circle cx="42" cy="62" r="22" fill="#FFF8F0" />
          <Path d="M28 58c4-2 8-2 12 0M44 58c4-2 8-2 12 0" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
          <Circle cx="34" cy="64" r="2.2" fill="#111" />
          <Circle cx="50" cy="64" r="2.2" fill="#111" />
          <Path d="M36 74c4 4 8 4 12 0" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none" />
          <Path
            d="M18 58c-8 2-12 12-8 22 8 4 14 2 16-4"
            stroke="#111"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M66 58c8 2 12 12 8 22-8 4-14 2-16-4"
            stroke="#111"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <Path d="M18 56h48" stroke="#111" strokeWidth="5" strokeLinecap="round" />

          <Path
            d="M22 96c-6 18 2 44 20 52 18 8 32-4 36-22 4-16-4-36-16-46-8 14-26 18-40 16z"
            fill="#111111"
          />
          <Path
            d="M28 102c2 22 10 38 22 42 10 4 20-6 22-18"
            stroke="#C6EF4A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          <Path
            d="M78 78c18-10 32 6 28 24-4 12-18 16-28 10"
            stroke="#111"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="108" cy="88" r="10" fill="#FFF8F0" stroke="#111" strokeWidth="3" />
          <Path d="M104 84l8 8M112 84l-8 8" stroke="#111" strokeWidth="2" strokeLinecap="round" />

          <Rect x="18" y="128" width="72" height="44" rx="8" fill="#111111" />
          <Rect x="24" y="134" width="60" height="28" rx="4" fill="#F4FBE6" />
          <Path d="M36 148h36" stroke="#1C4A32" strokeWidth="3" strokeLinecap="round" />
          <Path d="M40 156h20" stroke="#C6EF4A" strokeWidth="3" strokeLinecap="round" />
          <Rect x="8" y="168" width="92" height="10" rx="4" fill="#1C4A32" />
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
        <Circle cx="90" cy="90" r="78" fill="#F4FBE6" />
        <Circle cx="90" cy="72" r="28" fill="#111111" />
        <Circle cx="90" cy="76" r="20" fill="#FFF8F0" />
        <Circle cx="82" cy="74" r="2.4" fill="#111" />
        <Circle cx="98" cy="74" r="2.4" fill="#111" />
        <Path d="M84 84c4 4 8 4 12 0" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Path d="M62 128c4-22 16-32 28-32s24 10 28 32" fill="#111111" />
        <Rect x="48" y="132" width="84" height="22" rx="11" fill="#C6EF4A" />
        <Path d="M64 143h52" stroke="#1C4A32" strokeWidth="4" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
