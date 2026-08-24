import { Easing, Platform } from "react-native";
import type { StackCardInterpolationProps, StackNavigationOptions } from "@react-navigation/stack";

const openRight = {
  animation: "timing" as const,
  config: { duration: 320, easing: Easing.out(Easing.cubic) },
};
const closeRight = {
  animation: "timing" as const,
  config: { duration: 280, easing: Easing.in(Easing.cubic) },
};
const openBottom = {
  animation: "timing" as const,
  config: { duration: 480, easing: Easing.out(Easing.cubic) },
};
const closeBottom = {
  animation: "timing" as const,
  config: { duration: 360, easing: Easing.in(Easing.cubic) },
};

/** O'ngdan ochilish — web + native. */
function forSlideFromRight({ current, layouts }: StackCardInterpolationProps) {
  const width = layouts.screen.width || 400;
  return {
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [width, 0],
          }),
        },
      ],
    },
  };
}

/** Pastdan 480ms — QR va modal. */
function forSlideFromBottom({ current, layouts }: StackCardInterpolationProps) {
  const height = layouts.screen.height || 800;
  return {
    cardStyle: {
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [height, 0],
          }),
        },
      ],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
      }),
    },
  };
}

export const walletFromRight: StackNavigationOptions = {
  gestureEnabled: true,
  gestureResponseDistance: Platform.OS === "ios" ? 50 : undefined,
  cardStyleInterpolator: forSlideFromRight,
  transitionSpec: { open: openRight, close: closeRight },
};

export const walletFromBottom: StackNavigationOptions = {
  gestureEnabled: true,
  gestureDirection: "vertical",
  cardStyleInterpolator: forSlideFromBottom,
  transitionSpec: { open: openBottom, close: closeBottom },
  cardOverlayEnabled: true,
};

/** Freeze sheet — navigator animatsiyasiz (ichki Animated ishlaydi). */
export const walletFreezeSheet: StackNavigationOptions = {
  presentation: "transparentModal",
  cardStyle: { backgroundColor: "transparent" },
  cardOverlayEnabled: false,
  gestureEnabled: false,
  transitionSpec: {
    open: { animation: "timing", config: { duration: 0 } },
    close: { animation: "timing", config: { duration: 0 } },
  },
};
