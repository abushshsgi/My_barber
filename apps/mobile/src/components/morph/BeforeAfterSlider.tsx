import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

type Props = {
  beforeUri: string;
  afterUri: string;
  width: number;
  height: number;
  title?: string;
};

/**
 * Siljiydigan Oldin/Keyin — kartani to‘ldiradi (cover) + pastki gradient.
 */
export function BeforeAfterSlider({
  beforeUri,
  afterUri,
  width,
  height,
  title,
}: Props) {
  const split = useSharedValue(width * 0.5);
  const startX = useSharedValue(width * 0.5);

  useEffect(() => {
    split.value = width * 0.5;
    startX.value = width * 0.5;
  }, [width, split, startX]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = split.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      split.value = Math.min(width - 18, Math.max(18, next));
    });

  const beforeClip = useAnimatedStyle(() => ({
    width: split.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: split.value - 18 }],
  }));

  return (
    <View style={[styles.root, { width, height }]}>
      <View style={[styles.layer, { width, height }]}>
        <Image
          source={{ uri: afterUri }}
          style={styles.img}
          contentFit="cover"
        />
        <View style={styles.tagRight}>
          <Text style={styles.tagText}>Keyin</Text>
        </View>
      </View>

      <Animated.View style={[styles.beforeClip, beforeClip, { height }]}>
        <View style={{ width, height }}>
          <Image
            source={{ uri: beforeUri }}
            style={styles.img}
            contentFit="cover"
          />
        </View>
        <View style={styles.tagLeft}>
          <Text style={styles.tagText}>Oldin</Text>
        </View>
      </Animated.View>

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.88)"]}
        locations={[0.45, 0.75, 1]}
        style={styles.grad}
        pointerEvents="none"
      />

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.handleHit, handleStyle, { height }]}>
          <View style={styles.divider} />
          <View style={styles.handleKnob}>
            <Ionicons name="swap-horizontal" size={16} color="#0A0A0A" />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#111111",
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
  beforeClip: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  grad: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  title: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    zIndex: 3,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagLeft: {
    position: "absolute",
    left: 10,
    top: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    zIndex: 3,
  },
  tagRight: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    zIndex: 3,
  },
  tagText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  handleHit: {
    position: "absolute",
    top: 0,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  divider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#FFF",
  },
  handleKnob: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
  },
});
