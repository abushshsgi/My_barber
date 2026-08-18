import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { morfMarkWhite } from "../branding/morf-logo";
import { ShellSwitchOverlay } from "../components/ShellSwitchOverlay";
import { FLOATING_TAB_BAR_STYLE } from "../hooks/useHideTabBar";
import { AppShellProvider, useAppShell } from "../lib/AppShellContext";
import { MorphAppearanceProvider } from "../lib/MorphAppearanceContext";
import { readLastMorphContentTab } from "../lib/app-shell";
import { peekMorphReturn } from "../lib/morph-return";
import {
  TabBarVisibilityProvider,
  useTabBarHidden,
} from "../lib/TabBarVisibility";
import { MorphSessionProvider } from "../lib/morph-session";
import { useAuth } from "../auth/AuthContext";
import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { MorphChatScreen } from "../screens/morph/MorphChatScreen";
import { MorphPlaceholderScreen } from "../screens/morph/MorphPlaceholderScreen";
import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { colors } from "../theme/colors";
import { MorphStack } from "./MorphStack";
import { ProfileStack } from "./ProfileStack";

export type RootTabParamList = {
  Home: undefined;
  Map: undefined;
  Explore: undefined;
  Profile: undefined;
  MorphChat: undefined;
  MorphCare: undefined;
  MorphIngredient: undefined;
  MorphTryOn: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabDef = {
  name: keyof RootTabParamList;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOn: keyof typeof Ionicons.glyphMap;
};

/** MySaloon shell — Asosiy, Xarita | Explore, Profil + markaz Morf AI. */
const MYSALOON_LEFT: TabDef[] = [
  { name: "Home", labelKey: "nav.home", icon: "home-outline", iconOn: "home" },
  { name: "Map", labelKey: "nav.map", icon: "map-outline", iconOn: "map" },
];

const MYSALOON_RIGHT: TabDef[] = [
  { name: "Explore", labelKey: "nav.explore", icon: "compass-outline", iconOn: "compass" },
  { name: "Profile", labelKey: "nav.profile", icon: "person-outline", iconOn: "person" },
];

/** Morf AI shell — Chatbot, Parvarish | Try-on, Profil + markaz MySaloon. */
const MORPH_LEFT: TabDef[] = [
  {
    name: "MorphChat",
    labelKey: "nav.morphChat",
    icon: "chatbubble-ellipses-outline",
    iconOn: "chatbubble-ellipses",
  },
  { name: "MorphCare", labelKey: "nav.morphCare", icon: "water-outline", iconOn: "water" },
];

const MORPH_RIGHT: TabDef[] = [
  { name: "MorphTryOn", labelKey: "nav.morphTryOn", icon: "sparkles-outline", iconOn: "sparkles" },
  { name: "Profile", labelKey: "nav.profile", icon: "person-outline", iconOn: "person" },
];

const CENTER_SLOT = 54;
const SWITCH_MIN_MS = 720;
const mysaloonIcon = require("../../assets/icon.png");

function isMorphTab(name: string | undefined): boolean {
  return (
    name === "MorphChat" ||
    name === "MorphCare" ||
    name === "MorphIngredient" ||
    name === "MorphTryOn"
  );
}

function isMysaloonExclusiveTab(name: string | undefined): boolean {
  return name === "Home" || name === "Map" || name === "Explore";
}

function navigateToShellTab(
  navigation: BottomTabBarProps["navigation"],
  name: string,
) {
  const tab = (name === "MorphStudio" ? "MorphTryOn" : name) as keyof RootTabParamList;
  if (tab === "MorphTryOn") {
    navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
    return;
  }
  navigation.navigate(tab);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const tabBarHidden = useTabBarHidden();
  const { isAuthenticated } = useAuth();
  const prevAuth = useRef(isAuthenticated);
  const {
    shell,
    ready,
    rememberTab,
    setShell,
    beginSwitch,
    endSwitch,
    switchToMorphTarget,
    switchToMysaloonTarget,
  } = useAppShell();
  const activeName = state.routes[state.index]?.name as keyof RootTabParamList | undefined;
  const switchingRef = useRef(false);
  const hydratedRef = useRef(false);
  const [displayShell, setDisplayShell] = useState(shell);
  const sidesY = useRef(new Animated.Value(0)).current;
  const sidesOpacity = useRef(new Animated.Value(1)).current;
  const centerScale = useRef(new Animated.Value(1)).current;

  // Login dan keyin — obuna/chat qayerda ochilgan bo‘lsa, shu yerga qaytarish.
  useEffect(() => {
    const justLoggedIn = isAuthenticated && !prevAuth.current;
    prevAuth.current = isAuthenticated;
    if (!justLoggedIn) return;
    const pending = peekMorphReturn();
    if (!pending) return;
    if (pending.returnTo === "MorphChat") {
      navigation.navigate("MorphChat");
      return;
    }
    navigation.navigate("MorphTryOn", {
      screen: "MorphPaywall",
      params: {
        reason: pending.reason ?? "subscription",
        returnTo: pending.returnTo,
      },
    } as never);
  }, [isAuthenticated, navigation]);

  // Saqlangan shell = morph bo‘lsa — jimda Morph tabga o‘tkazish (cold start’da overlay kerak emas).
  useEffect(() => {
    if (!ready || hydratedRef.current) return;
    hydratedRef.current = true;

    if (shell === "morph" && !isMorphTab(activeName) && activeName !== "Profile") {
      switchingRef.current = true;
      setDisplayShell("morph");
      void (async () => {
        try {
          const target = await readLastMorphContentTab();
          navigateToShellTab(navigation, target);
        } finally {
          switchingRef.current = false;
        }
      })();
      return;
    }

    setDisplayShell(shell);
  }, [ready, shell, activeName, navigation]);

  // Faol tab ↔ shell sinxroni: MySaloon sahifada faqat MySaloon nav.
  useEffect(() => {
    if (!ready || switchingRef.current) return;

    if (isMysaloonExclusiveTab(activeName)) {
      if (shell !== "mysaloon") setShell("mysaloon");
      setDisplayShell("mysaloon");
      rememberTab("mysaloon", activeName!);
      return;
    }

    if (isMorphTab(activeName)) {
      if (shell !== "morph") setShell("morph");
      setDisplayShell("morph");
      rememberTab("morph", activeName!);
      return;
    }

    if (activeName === "Profile") {
      setDisplayShell(shell);
      rememberTab(shell, "Profile");
    }
  }, [activeName, ready, rememberTab, setShell, shell]);

  const pressTab = (name: keyof RootTabParamList) => {
    if (switchingRef.current) return;
    if (name === "MorphTryOn") {
      // Qayta bosilsa Capture ga qaytadi; boshqa tabdan esa stack holatini saqlaydi.
      if (activeName === "MorphTryOn") {
        navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
      } else {
        navigation.navigate("MorphTryOn");
      }
      return;
    }
    const route = state.routes.find((r) => r.name === name);
    if (!route) {
      navigation.navigate(name);
      return;
    }
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (activeName !== name && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  const animateSidesOut = () =>
    new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(sidesY, {
          toValue: 28,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sidesOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(centerScale, {
            toValue: 0.86,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(centerScale, {
            toValue: 1.06,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => resolve());
    });

  const animateSidesIn = () =>
    new Promise<void>((resolve) => {
      sidesY.setValue(36);
      sidesOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(sidesY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sidesOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(centerScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });

  const runShellSwitch = (toMorph: boolean) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    const targetShell = toMorph ? "morph" : "mysaloon";
    beginSwitch(targetShell);

    void (async () => {
      const started = Date.now();
      try {
        await animateSidesOut();
        if (toMorph) {
          const target = await switchToMorphTarget();
          setDisplayShell("morph");
          navigateToShellTab(navigation, target);
        } else {
          const target = await switchToMysaloonTarget();
          setDisplayShell("mysaloon");
          navigateToShellTab(navigation, target);
        }
        const elapsed = Date.now() - started;
        if (elapsed < SWITCH_MIN_MS) await wait(SWITCH_MIN_MS - elapsed);
      } finally {
        await animateSidesIn();
        endSwitch();
        switchingRef.current = false;
      }
    })();
  };

  const onCenterPress = () => {
    runShellSwitch(displayShell === "mysaloon");
  };

  const visibleLeft = displayShell === "morph" ? MORPH_LEFT : MYSALOON_LEFT;
  const visibleRight = displayShell === "morph" ? MORPH_RIGHT : MYSALOON_RIGHT;

  const morphDock = displayShell === "morph";

  const renderSideTab = (tab: TabDef) => {
    const focused = activeName === tab.name;
    const label = t(tab.labelKey);
    return (
      <Pressable
        key={tab.name}
        onPress={() => pressTab(tab.name)}
        style={styles.tab}
        android_ripple={{
          color: morphDock ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          borderless: true,
          radius: 28,
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
      >
        {morphDock ? (
          <View style={[styles.morphIconSlot, focused && styles.morphIconSlotOn]}>
            <Ionicons
              name={focused ? tab.iconOn : tab.icon}
              size={18}
              color={focused ? "#111111" : "#FFFFFF"}
            />
          </View>
        ) : (
          <>
            <View style={styles.iconSlot}>
              <Ionicons
                name={focused ? tab.iconOn : tab.icon}
                size={18}
                color={focused ? colors.fg : colors.muted}
              />
              {focused ? <View style={styles.activeDot} /> : <View style={styles.activeDotSpacer} />}
            </View>
            <Text
              style={[styles.label, focused ? styles.labelOn : styles.labelOff]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    );
  };

  if (tabBarHidden) {
    return null;
  }

  const centerIsMorphEntry = displayShell === "mysaloon";

  return (
    <View
      style={[styles.dockOuter, morphDock && styles.dockOuterMorph, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <View style={[styles.dock, morphDock && styles.dockMorph]}>
        <Animated.View
          style={[
            styles.sidesRow,
            morphDock && styles.sidesRowMorph,
            {
              opacity: sidesOpacity,
              transform: [{ translateY: sidesY }],
            },
          ]}
        >
          <View style={styles.sideGroup}>{visibleLeft.map(renderSideTab)}</View>
          <View style={styles.centerSpacer} />
          <View style={styles.sideGroup}>{visibleRight.map(renderSideTab)}</View>
        </Animated.View>

        <View style={[styles.centerAnchor, morphDock && styles.centerAnchorMorph]} pointerEvents="box-none">
          <Pressable
            onPress={onCenterPress}
            style={styles.centerWrap}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true, radius: 30 }}
            accessibilityRole="button"
            accessibilityLabel={centerIsMorphEntry ? t("nav.morphAi") : t("nav.mysaloon")}
          >
            <Animated.View style={{ transform: [{ scale: centerScale }] }}>
              <View style={styles.centerBtnShadow}>
                <View style={styles.centerBtn}>
                  {centerIsMorphEntry ? (
                    <Image
                      source={morfMarkWhite}
                      style={styles.centerLogo}
                      contentFit="contain"
                    />
                  ) : (
                    <Image
                      source={mysaloonIcon}
                      style={styles.centerAppIcon}
                      contentFit="cover"
                    />
                  )}
                </View>
              </View>
            </Animated.View>
            {morphDock ? null : (
              <Text style={[styles.label, styles.centerLabel]} numberOfLines={1}>
                {centerIsMorphEntry ? t("nav.morphAi") : t("nav.mysaloon")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RootTabsInner() {
  const { t } = useTranslation();
  const { switchingTo } = useAppShell();

  return (
    <View style={styles.root}>
      <TabBarVisibilityProvider>
        <MorphSessionProvider>
          <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
              headerShown: false,
              lazy: true,
              freezeOnBlur: true,
              tabBarStyle: FLOATING_TAB_BAR_STYLE,
              sceneStyle: { backgroundColor: "transparent" },
              animation: "fade",
            }}
          >
            <Tab.Screen name="Home">
              {({ navigation }) => (
                <HomeScreen
                  onOpenMap={() => navigation.navigate("Map")}
                  onOpenExplore={() => navigation.navigate("Explore")}
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="Map" component={MapScreen} />
            <Tab.Screen name="Explore">
              {() => <PlaceholderScreen title={t("nav.explore")} />}
            </Tab.Screen>
            <Tab.Screen name="Profile" component={ProfileStack} />

            <Tab.Screen name="MorphChat" component={MorphChatScreen} />
            <Tab.Screen name="MorphCare">
              {() => (
                <MorphPlaceholderScreen
                  title={t("placeholder.morphCareTitle")}
                  subtitle={t("placeholder.morphCareSub")}
                  icon="water-outline"
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="MorphIngredient">
              {() => (
                <MorphPlaceholderScreen
                  title={t("placeholder.morphIngredientTitle")}
                  subtitle={t("placeholder.morphIngredientSub")}
                  icon="flask-outline"
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="MorphTryOn" component={MorphStack} />
          </Tab.Navigator>
          <ShellSwitchOverlay visible={switchingTo != null} target={switchingTo} />
        </MorphSessionProvider>
      </TabBarVisibilityProvider>
    </View>
  );
}

export function RootTabs() {
  return (
    <AppShellProvider>
      <MorphAppearanceProvider>
        <RootTabsInner />
      </MorphAppearanceProvider>
    </AppShellProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dockOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: "transparent",
  },
  dockOuterMorph: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  dock: {
    minHeight: 56,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    justifyContent: "flex-end",
    paddingBottom: 6,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 14,
      },
    }),
  },
  dockMorph: {
    width: "100%",
    minHeight: 64,
    borderRadius: 36,
    backgroundColor: "#171717",
    borderWidth: 0,
    justifyContent: "center",
    paddingBottom: 8,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: "0 10px 28px rgba(0,0,0,0.28)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 16,
      },
    }),
  },
  sidesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
  },
  sidesRowMorph: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    minWidth: 0,
  },
  centerSpacer: {
    width: CENTER_SLOT,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  iconSlot: {
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  morphIconSlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  morphIconSlotOn: {
    backgroundColor: "#FFFFFF",
  },
  activeDot: {
    marginTop: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.fg,
  },
  activeDotSpacer: {
    marginTop: 2,
    width: 3,
    height: 3,
  },
  centerAnchor: {
    position: "absolute",
    top: -14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  centerAnchorMorph: {
    top: 4,
  },
  centerWrap: {
    width: CENTER_SLOT,
    alignItems: "center",
  },
  centerBtnShadow: {
    borderRadius: 22,
    ...Platform.select({
      web: { boxShadow: "0 6px 16px rgba(0,0,0,0.22)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
      },
    }),
  },
  centerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  centerLogo: {
    width: 22,
    height: 22,
  },
  centerAppIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  centerLabel: {
    marginTop: 3,
    color: colors.muted,
  },
  labelOn: {
    color: colors.fg,
  },
  labelOff: {
    color: colors.muted,
  },
});
