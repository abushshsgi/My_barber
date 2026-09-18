import { Image, type ImageProps } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageProps["contentFit"];
  recyclingKey?: string;
  transition?: number;
};

/**
 * Responsive cover — container to‘liq to‘ldiriladi, aspect parentda.
 * `uri` bo‘lmasa placeholder.
 */
export function ResponsiveImage({
  uri,
  style,
  contentFit = "cover",
  recyclingKey,
  transition = 180,
}: Props) {
  return (
    <View style={[styles.frame, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.img}
          contentFit={contentFit}
          recyclingKey={recyclingKey ?? uri}
          transition={transition}
          cachePolicy="memory-disk"
          priority="high"
        />
      ) : (
        <View style={[styles.img, styles.placeholder]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  img: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: colors.surface,
  },
});
