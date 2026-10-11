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

const SCAN_BARS: Array<[number, number]> = [
  [126, 2.8],
  [130.2, 1.4],
  [133, 4],
  [138.4, 1.4],
  [141.2, 2.6],
  [145.2, 1.4],
  [148, 4.8],
  [154.2, 1.4],
  [157, 2.8],
  [161.2, 1.4],
  [164, 3.6],
];

/** Tarkib kartasi — qo‘l telefon bilan noutbukdagi shtrix-kodni skanerlaydi. */
export function CareHubScanIllustration() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 200 250"
      preserveAspectRatio="xMidYMid slice"
      style={fill}
    >
      <Rect width="200" height="250" fill="#F6F6F4" />

      <Rect x="104" y="58" width="82" height="66" rx="4" fill="#111111" />
      <Rect x="110" y="64" width="70" height="54" fill="#F6F6F4" />
      {SCAN_BARS.map(([x, w]) => (
        <Rect key={`${x}-${w}`} x={x} y={76} width={w} height={30} fill="#111111" />
      ))}
      <Path
        d="M120 84V74H130 M174 74H164 M174 74V84 M120 100V110H130 M174 110H164 M174 110V100"
        stroke="#111111"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="square"
      />
      <Rect x="104" y="124" width="82" height="8" fill="#111111" />
      <Path d="M92 132H196L186 150H102Z" fill="#111111" />
      <Rect x="128" y="138" width="36" height="3" rx="1.5" fill="#F6F6F4" />

      <G transform="rotate(-18 58 118)">
        <Path
          fill="#111111"
          d="M36 90C24 88 16 100 18 114 20 126 30 130 36 118L34 140C22 146 12 152 10 162L8 172 28 180 40 164 40 144 38 94Z"
        />
        <Path
          d="M14 158L32 172"
          stroke="#F6F6F4"
          strokeWidth={3.2}
          strokeLinecap="round"
          fill="none"
        />
        <Rect x="32" y="68" width="48" height="84" rx="10" fill="#111111" />
        <Rect x="36.5" y="78" width="39" height="68" rx="4" fill="#F6F6F4" />
        <Rect x="44" y="72" width="22" height="5" rx="2.5" fill="#111111" />
        <Path
          d="M44 94V86H52 M70 86H62 M70 86V94 M44 128V136H52 M70 136H62 M70 136V128"
          stroke="#111111"
          strokeWidth={2}
          fill="none"
          strokeLinecap="square"
        />
      </G>
    </Svg>
  );
}
