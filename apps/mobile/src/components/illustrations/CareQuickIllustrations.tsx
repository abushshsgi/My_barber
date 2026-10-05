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
  Text as SvgText,
} from "react-native-svg";
import { MORPH_FONT } from "../../theme/morph-font";

const fill = StyleSheet.absoluteFillObject;

type Kind = "sos" | "shelf" | "growth";

function QuickLabel({ label, shadow }: { label: string; shadow: string }) {
  const size = label.length > 7 ? 18 : 22;
  return (
    <G>
      <SvgText
        x={12}
        y={114}
        fontSize={size}
        fontWeight="700"
        fontFamily={MORPH_FONT}
        fill={shadow}
      >
        {label}
      </SvgText>
      <SvgText
        x={11}
        y={112}
        fontSize={size}
        fontWeight="700"
        fontFamily={MORPH_FONT}
        fill="#FFFFFF"
      >
        {label}
      </SvgText>
    </G>
  );
}

function CareQuickSosIllustration({ label }: { label: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 124" preserveAspectRatio="xMidYMid slice" style={fill}>
      <Defs>
        <LinearGradient id="careQuickSosBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF4EA" />
          <Stop offset="1" stopColor="#F3D2BC" />
        </LinearGradient>
        <LinearGradient id="careQuickSosGlass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E39A4A" />
          <Stop offset="1" stopColor="#B85E22" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="124" fill="url(#careQuickSosBg)" />
      <Ellipse cx="96" cy="86" rx="22" ry="5" fill="#E2B48A" opacity={0.7} />
      <Rect x="78" y="34" width="34" height="48" rx="12" fill="url(#careQuickSosGlass)" />
      <Path d="M86 42c2 10 2 22 0 34" stroke="#FFF1DC" strokeWidth="2" opacity={0.45} />
      <Rect x="84" y="22" width="22" height="14" rx="3" fill="#1A1A1A" />
      <Circle cx="95" cy="18" r="6" fill="#1A1A1A" />
      <Circle cx="48" cy="58" r="1.6" fill="#F6C56B" />
      <Circle cx="58" cy="72" r="1.2" fill="#F6C56B" />
      <Circle cx="128" cy="64" r="1.5" fill="#F6C56B" />
      <Path d="M42 46l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4 1.4-3.2z" fill="#F6C56B" />
      <QuickLabel label={label} shadow="#C48962" />
    </Svg>
  );
}

function CareQuickShelfIllustration({ label }: { label: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 124" preserveAspectRatio="xMidYMid slice" style={fill}>
      <Defs>
        <LinearGradient id="careQuickShelfBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F4FAF5" />
          <Stop offset="1" stopColor="#D7EBDD" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="124" fill="url(#careQuickShelfBg)" />
      <Path d="M18 70c8-22 22-28 28-10-8 2-12 12-8 20-10-2-18-2-20-10z" fill="#B7D4C2" />
      <Path d="M138 28c14 8 16 24 4 32-8-6-8-16-2-22-6 2-12 0-14-6 4-4 8-6 12-4z" fill="#C5DECE" />
      <Rect x="22" y="72" width="116" height="7" rx="3" fill="#C6A15A" />
      <Rect x="34" y="34" width="26" height="38" rx="8" fill="#B7D7C6" />
      <Rect x="42" y="26" width="10" height="10" rx="2" fill="#C6A15A" />
      <Path d="M44 22h8c2 4-1 8-4 8s-6-4-4-8z" fill="#FFFFFF" />
      <Path d="M47 48c4-8 8-8 8 0-4 2-6 2-8 0z" fill="#FFFFFF" />
      <Rect x="70" y="46" width="20" height="26" rx="6" fill="#F6F0E4" />
      <Rect x="74" y="40" width="12" height="8" rx="2" fill="#C6A15A" />
      <Circle cx="80" cy="36" r="3.5" fill="#FFFFFF" />
      <Path d="M80 52c2-4 6-4 6 0 0 4-3 6-3 6s-3-2-3-6z" fill="none" stroke="#C6A15A" strokeWidth="1.2" />
      <Path d="M102 38h24c2 0 4 2 4 6v22c0 4-2 6-6 6h-20c-2 0-4-2-4-6V42c0-2 1-4 2-4z" fill="#C9E4D4" />
      <Rect x="108" y="58" width="16" height="8" rx="2" fill="#C6A15A" />
      <QuickLabel label={label} shadow="#7EA892" />
    </Svg>
  );
}

function CareQuickGrowthIllustration({ label }: { label: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 124" preserveAspectRatio="xMidYMid slice" style={fill}>
      <Defs>
        <LinearGradient id="careQuickGrowthBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF3E8" />
          <Stop offset="1" stopColor="#F4D4BE" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="124" fill="url(#careQuickGrowthBg)" />
      <Path
        d="M80 16c-24 2-40 22-36 42-10 6-14 20-2 28 8 6 20 4 24-2 4 12 22 16 34 6 12 8 28 2 32-12 12-10 14-30 2-42-8-24-26-36-54-20z"
        fill="#C9844A"
      />
      <Path
        d="M72 28c10-10 32-8 40 8 4 14-8 22-18 16-2 10-16 12-22 2-8-4-10-18 0-26z"
        fill="#E2A56B"
      />
      <Rect x="62" y="70" width="7" height="14" rx="2" fill="#C9E6C0" />
      <Rect x="73" y="62" width="7" height="22" rx="2" fill="#B7DCAE" />
      <Rect x="84" y="52" width="7" height="32" rx="2" fill="#A8D4A0" />
      <Rect x="95" y="42" width="7" height="42" rx="2" fill="#9BCB96" />
      <Path d="M60 78c14-6 28-20 42-34" stroke="#E7F6DE" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Path d="M94 40l10 1-7 8z" fill="#E7F6DE" />
      <Circle cx="36" cy="40" r="1.5" fill="#F6C56B" />
      <Circle cx="128" cy="36" r="1.4" fill="#F6C56B" />
      <Circle cx="24" cy="70" r="1.2" fill="#F6C56B" />
      <QuickLabel label={label} shadow="#C48962" />
    </Svg>
  );
}

export function CareQuickIllustration({ kind, label }: { kind: Kind; label: string }) {
  if (kind === "sos") return <CareQuickSosIllustration label={label} />;
  if (kind === "shelf") return <CareQuickShelfIllustration label={label} />;
  return <CareQuickGrowthIllustration label={label} />;
}
