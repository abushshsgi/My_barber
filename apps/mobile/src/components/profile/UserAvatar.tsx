import { useId } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Image } from "expo-image";
import { initials } from "../../api/user";
import { useAvatarCacheEpoch } from "../../hooks/useAvatarPhoto";

type Props = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  onPress?: () => void;
  busy?: boolean;
};

/** Binafsha fon, rangli to'lqinlar va bosh harflar. Rasm bo'lsa shu rasm. */
export function UserAvatar({ name, uri, size = 88, onPress, busy }: Props) {
  const letters = initials(name || "");
  const epoch = useAvatarCacheEpoch();
  const shown =
    uri && epoch > 0 ? `${uri}${uri.includes("?") ? "&" : "?"}av=${epoch}` : uri;
  const body = shown ? (
    <Image
      source={{ uri: shown }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  ) : (
    <DefaultMark letters={letters} size={size} />
  );

  const frame = (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
      {body}
      {busy ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(27,16,69,0.45)",
          }}
        >
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return frame;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" disabled={busy}>
      {frame}
    </Pressable>
  );
}

function DefaultMark({ letters, size }: { letters: string; size: number }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `avc${raw}`;
  const g1 = `avg1${raw}`;
  const g2 = `avg2${raw}`;
  const g3 = `avg3${raw}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clip}>
          <Circle cx="50" cy="50" r="50" />
        </ClipPath>
        <LinearGradient id={g1} x1="0" y1="90" x2="100" y2="40" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFE14A" />
          <Stop offset="0.38" stopColor="#FF7A18" />
          <Stop offset="0.72" stopColor="#FF4D8D" />
          <Stop offset="1" stopColor="#C44BFF" />
        </LinearGradient>
        <LinearGradient id={g2} x1="10" y1="70" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FF5C9A" />
          <Stop offset="1" stopColor="#7A3CFF" />
        </LinearGradient>
        <LinearGradient id={g3} x1="60" y1="70" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#B388FF" />
          <Stop offset="1" stopColor="#5B2BE0" />
        </LinearGradient>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <Rect width="100" height="100" fill="#1B1045" />
        <Path
          d="M-8 76 C 16 58, 30 92, 54 78 C 74 66, 84 50, 110 44 L 110 112 L -8 112 Z"
          fill={`url(#${g1})`}
        />
        <Path
          d="M-6 92 C 22 74, 46 100, 76 86 C 92 78, 102 70, 112 64 L 112 114 L -6 114 Z"
          fill={`url(#${g2})`}
        />
        <Path d="M46 106 C 68 86, 90 98, 114 76 L 114 114 L 46 114 Z" fill={`url(#${g3})`} />
      </G>
      <SvgText
        x="50"
        y="44"
        textAnchor="middle"
        alignmentBaseline="central"
        fill="#FFFFFF"
        fontSize={letters.length > 1 ? 28 : 34}
        fontWeight="700"
        fontFamily="System"
      >
        {letters}
      </SvgText>
    </Svg>
  );
}
