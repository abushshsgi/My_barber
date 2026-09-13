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
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../lib/safe-area";
import * as NavigationBar from "expo-navigation-bar";
import { morfMarkWhite } from "../branding/morf-logo";
import { ComingSoonSalons } from "../components/ComingSoonSalons";
import { AppStatusBar } from "../components/ui/AppStatusBar";
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
import { colors } from "../theme/colors";
import { MorphCareStack } from "./MorphCareStack";
import { MorphIngredientStack } from "./MorphIngredientStack";
import { MorphStack } from "./MorphStack";
import { ProfileStack } from "./ProfileStack";
import {
  IS_SMALL_DEVICE,
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

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

const CENTER_SLOT = scale(48);
const CENTER_BTN = scale(IS_SMALL_DEVICE ? 34 : 36);
const TAB_ICON = scale(22);
const SWITCH_MIN_MS = 0;

/** Active / idle — oq dockda oq ikonka bo‘lmasin. */
const PILL_FG = "#1E1E1E";
const PILL_IDLE = "#6B7280";

/**
 * Home Bar (iPhone) yoki gesture bar (Samsung) ostida dok kesilmasligi uchun
 * minimal pastki chekka. Insets nolga teng bo'lgan Android'larda ham ishlaydi.
 */
const MIN_DOCK_BOTTOM = IS_SMALL_DEVICE ? 6 : 8;
const mysaloonIcon = require("../../assets/icon.png");

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

import { getFocusedRouteNameFromRoute, RouteProp } from "@react-navigation/native";

// ... (existing imports)

function getTabBarVisibility(route: RouteProp<RootTabParamList, keyof RootTabParamList>) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? "";
  // Yashirish kerak bo'lgan ichki stack sahifalari
  const hideOnScreens = [
    "MorphResults",
    "MorphPreview",
    "MorphStudio",
    "MorphHistory",
    "MorphPaywall",
    "MorphGuide",
    "MorphWelcome",
    "MorphHome",
    "CareProductDetail",
    "CareProductGuide",
    "CareWeather",
    "CareMyProducts",
    "PersonalInfo",
    "Settings",
    "Orders",
    "Security",
    "SecurityPassword",
    "SecuritySessions",
    "NotificationPrefs",
    "Notifications",
    "HelpCenter",
    "Subscriptions",
    "Referrals",
    "MorphAiSettings",
    "WalletGate",
    "WalletHome",
    "WalletTopUp",
    "WalletGift",
    "WalletGiftAmount",
    "WalletGifts",
    "WalletMore",
    "WalletQrPay",
    "WalletTransactions",
    "WalletRequisites",
    "WalletFreeze",
    "WalletFaq",
    "Login",
  ];
  if (hideOnScreens.includes(routeName)) return false;
  return true;
}

function CustomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHidden = useTabBarHidden();
  const { isAuthenticated } = useAuth();
  const {
    shell,
    ready,
    rememberTab,
    setShell,
    switchToMorphTarget,
    switchToMysaloonTarget,
  } = useAppShell();
  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;
  const activeName = focusedRoute.name as keyof RootTabParamList | undefined;
  const prevAuth = useRef(isAuthenticated);
  const switchingRef = useRef(false);
  const hydratedRef = useRef(false);
  const [displayShell, setDisplayShell] = useState(shell);
  const sidesY = useRef(new Animated.Value(0)).current;
  const sidesOpacity = useRef(new Animated.Value(1)).current;
  const centerScale = useRef(new Animated.Value(1)).current;
  const morphDock = displayShell === "morph";
  const bottomPad = Math.max(insets.bottom, MIN_DOCK_BOTTOM);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    try {
      // light = ochiq system nav + qora tugmalar (oq dock bilan mos).
      NavigationBar.setStyle("light");
    } catch (err) {
      console.warn("NavigationBar error", err);
    }
  }, [morphDock]);

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
      // Morph shellda back orqali Home/Map ga tushib qolmasin.
      if (shell === "morph") {
        void readLastMorphContentTab().then((target) => {
          navigateToShellTab(navigation, target);
        });
        return;
      }
      if (shell !== "mysaloon") setShell("mysaloon");
      setDisplayShell("mysaloon");
      rememberTab("mysaloon", activeName!);
      return;
    }

    if (isMorphTab(activeName)) {
      if (shell !== "morph") setShell("morph");
      setDisplayShell("morph");
      if (activeName !== "MorphChat") rememberTab("morph", activeName!);
      return;
    }

    if (activeName === "Profile") {
      setDisplayShell(shell);
      rememberTab(shell, "Profile");
    }
  }, [activeName, ready, rememberTab, setShell, shell, navigation]);

  // Ichki stack (Results/Paywall/Login…) — faqat asosiy tablarda dock.
  const nestHidden =
    (focusedRoute.name === "MorphTryOn" ||
      focusedRoute.name === "MorphCare" ||
      focusedRoute.name === "MorphIngredient" ||
      focusedRoute.name === "Profile") &&
    !getTabBarVisibility(focusedRoute as never);
  if (nestHidden || tabBarHidden) {
    return null;
  }

  const pressTab = (name: keyof RootTabParamList) => {
    if (switchingRef.current) return;
    LayoutAnimation.configureNext(
      LayoutAnimation.create(220, "easeInEaseOut", "opacity"),
    );
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
      const native = Platform.OS !== "web";
      Animated.parallel([
        Animated.timing(sidesY, {
          toValue: 28,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: native,
        }),
        Animated.timing(sidesOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: native,
        }),
        Animated.sequence([
          Animated.timing(centerScale, {
            toValue: 0.86,
            duration: 160,
            useNativeDriver: native,
          }),
          Animated.timing(centerScale, {
            toValue: 1.06,
            duration: 180,
            useNativeDriver: native,
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
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(sidesOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(centerScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => resolve());
    });

  const runShellSwitch = (toMorph: boolean) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    // Overlay/spinner yo‘q — darhol shell almashtirish.
    void (async () => {
      try {
        if (toMorph) {
          const target = await switchToMorphTarget();
          setDisplayShell("morph");
          navigateToShellTab(navigation, target);
        } else {
          const target = await switchToMysaloonTarget();
          setDisplayShell("mysaloon");
          navigateToShellTab(navigation, target);
        }
        sidesY.setValue(0);
        sidesOpacity.setValue(1);
        centerScale.setValue(1);
      } finally {
        switchingRef.current = false;
      }
    })();
  };

  const onCenterPress = () => {
    runShellSwitch(displayShell === "mysaloon");
  };

  const visibleLeft = displayShell === "morph" ? MORPH_LEFT : MYSALOON_LEFT;
  const visibleRight = displayShell === "morph" ? MORPH_RIGHT : MYSALOON_RIGHT;

  const renderSideTab = (tab: TabDef) => {
    const focused = activeName === tab.name;
    const label = t(tab.labelKey);
    const tint = focused ? PILL_FG : PILL_IDLE;
    return (
      <Pressable
        key={tab.name}
        onPress={() => pressTab(tab.name)}
        style={styles.tab}
        android_ripple={{
          color: "rgba(0,0,0,0.08)",
          borderless: true,
          radius: 28,
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
      >
        <Ionicons
          name={focused ? tab.iconOn : tab.icon}
          size={TAB_ICON}
          color={tint}
        />
        <Text
          style={[styles.tabLabel, focused && styles.tabLabelOn, { color: tint }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const centerIsMorphEntry = displayShell === "mysaloon";

  return (
    <View
      style={[styles.dockOuter, styles.dockOuterLight, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <View style={styles.dock}>
        <Animated.View
          style={[
            styles.sidesRow,
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

        <View style={styles.centerAnchor} pointerEvents="box-none">
          <Pressable
            onPress={onCenterPress}
            style={styles.centerWrap}
            android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true, radius: 28 }}
            accessibilityRole="button"
            accessibilityLabel={centerIsMorphEntry ? t("nav.morphAi") : t("nav.mysaloon")}
          >
            <Animated.View style={{ transform: [{ scale: centerScale }] }}>
              <View style={[styles.centerBtn, morphDock && styles.centerBtnOnWhite]}>
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
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ExploreTab() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: safeTop(insets.top, 16) }}>
      <ComingSoonSalons />
    </View>
  );
}


function RootTabsInner() {
  const { shell, ready } = useAppShell();
  const morphDock = shell === "morph";

  if (!ready) {
    return <View style={styles.root} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: "#FFFFFF" }]}>
      <AppStatusBar style="dark" />
      <TabBarVisibilityProvider>
        <MorphSessionProvider>
          <Tab.Navigator
            initialRouteName={shell === "mysaloon" ? "Home" : "MorphTryOn"}
            tabBar={(props) => <CustomTabBar {...props} />}
            backBehavior="none"
            screenOptions={{
              headerShown: false,
              lazy: false,
              freezeOnBlur: true,
              tabBarStyle: FLOATING_TAB_BAR_STYLE,
              sceneStyle: { backgroundColor: "#FFFFFF" },
              animation: "none",
            }}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Map" component={MapScreen} />
            <Tab.Screen name="Explore" component={ExploreTab} />
            <Tab.Screen
              name="Profile"
              component={ProfileStack}
              options={({ route }) => ({
                tabBarStyle: getTabBarVisibility(route)
                  ? FLOATING_TAB_BAR_STYLE
                  : { display: "none" },
              })}
            />

            <Tab.Screen name="MorphChat" component={MorphChatScreen} />
            <Tab.Screen
              name="MorphCare"
              component={MorphCareStack}
              options={({ route }) => ({
                tabBarStyle: getTabBarVisibility(route)
                  ? FLOATING_TAB_BAR_STYLE
                  : { display: "none" },
              })}
            />
            <Tab.Screen name="MorphIngredient" component={MorphIngredientStack} />
            <Tab.Screen
              name="MorphTryOn"
              component={MorphStack}
              options={({ route }) => ({
                tabBarStyle: getTabBarVisibility(route)
                  ? FLOATING_TAB_BAR_STYLE
                  : { display: "none" },
              })}
            />
          </Tab.Navigator>
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
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: "#FFFFFF",
  },
  dockOuterLight: {
    backgroundColor: "#FFFFFF",
  },
  dockOuterMorph: {
    paddingHorizontal: 0,
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
  },
  dock: {
    minHeight: verticalScale(52),
    borderRadius: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    paddingBottom: verticalScale(4),
    paddingTop: verticalScale(8),
  },
  dockMorph: {
    width: "100%",
    minHeight: verticalScale(52),
    borderRadius: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    paddingBottom: verticalScale(4),
    paddingTop: verticalScale(8),
  },
  sidesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(4),
  },
  sidesRowMorph: {
    alignItems: "center",
    paddingHorizontal: scale(6),
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  centerSpacer: {
    width: CENTER_SLOT,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: scale(2),
    minHeight: scale(44),
    gap: verticalScale(2),
  },
  tabLabel: {
    fontSize: fontSize(10),
    fontWeight: "600",
    letterSpacing: -0.15,
    maxWidth: "100%",
    textAlign: "center",
  },
  tabLabelOn: {
    fontWeight: "700",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: scale(36),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(6),
    borderRadius: 0,
    maxWidth: "100%",
  },
  pillIdle: {
    paddingHorizontal: scale(8),
  },
  pillLabel: {
    fontSize: fontSize(12),
    fontWeight: "700",
    letterSpacing: -0.2,
    maxWidth: scale(72),
  },
  centerAnchor: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  centerAnchorMorph: {},
  centerWrap: {
    width: CENTER_SLOT,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBtn: {
    width: CENTER_BTN,
    height: CENTER_BTN,
    borderRadius: CENTER_BTN / 2,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  centerBtnMorph: {
    backgroundColor: "#1E1E1E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  centerBtnOnWhite: {
    backgroundColor: "#1E1E1E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  centerLogo: {
    width: scale(18),
    height: scale(18),
  },
  centerAppIcon: {
    width: CENTER_BTN - scale(4),
    height: CENTER_BTN - scale(4),
    borderRadius: (CENTER_BTN - scale(4)) / 2,
  },
});
