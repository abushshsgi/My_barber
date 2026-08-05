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
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          recyclingKey={recyclingKey ?? uri}
          transition={transition}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  placeholder: {
    backgroundColor: colors.surface,
  },
});
