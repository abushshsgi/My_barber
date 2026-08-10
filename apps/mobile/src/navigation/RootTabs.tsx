import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { morfMarkWhite } from "../branding/morf-logo";
import { FLOATING_TAB_BAR_STYLE } from "../hooks/useHideTabBar";
import { AppShellProvider, useAppShell } from "../lib/AppShellContext";
import {
  TabBarVisibilityProvider,
  useTabBarHidden,
} from "../lib/TabBarVisibility";
import { MorphSessionProvider } from "../lib/morph-session";
import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
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
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOn: keyof typeof Ionicons.glyphMap;
};

/** Har doim 2 + markaz + 2 — katta ikonka o‘rtada qoladi. */
const MYSALOON_LEFT: TabDef[] = [
  { name: "Home", label: "Asosiy", icon: "home-outline", iconOn: "home" },
  { name: "Map", label: "Xarita", icon: "map-outline", iconOn: "map" },
];

const MYSALOON_RIGHT: TabDef[] = [
  { name: "Explore", label: "Explore", icon: "compass-outline", iconOn: "compass" },
  { name: "Profile", label: "Profil", icon: "person-outline", iconOn: "person" },
];

/** Tarkib — Morph home ichida; dockda emas (markaz siljimasin). */
const MORPH_LEFT: TabDef[] = [
  { name: "MorphChat", label: "Chatbot", icon: "chatbubble-ellipses-outline", iconOn: "chatbubble-ellipses" },
  { name: "MorphCare", label: "Parvarish", icon: "water-outline", iconOn: "water" },
];

const MORPH_RIGHT: TabDef[] = [
  { name: "MorphTryOn", label: "Try-on", icon: "sparkles-outline", iconOn: "sparkles" },
  { name: "Profile", label: "Profil", icon: "person-outline", iconOn: "person" },
];

const CENTER_SLOT = 64;
const mysaloonIcon = require("../../assets/icon.png");

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const tabBarHidden = useTabBarHidden();
  const { shell, rememberTab, setShell, switchToMorphTarget, switchToMysaloonTarget } =
    useAppShell();
  const activeName = state.routes[state.index]?.name as keyof RootTabParamList | undefined;
  const switchingRef = useRef(false);
  const [displayShell, setDisplayShell] = useState(shell);
  const sidesY = useRef(new Animated.Value(0)).current;
  const sidesOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setDisplayShell(shell);
  }, [shell]);

  useEffect(() => {
    if (!activeName) return;
    const isMorphTab =
      activeName === "MorphChat" ||
      activeName === "MorphCare" ||
      activeName === "MorphIngredient" ||
      activeName === "MorphTryOn";
    if (isMorphTab && shell !== "morph") {
      setShell("morph");
      rememberTab("morph", activeName);
      return;
    }
    if (shell === "morph") {
      rememberTab("morph", activeName);
    } else if (
      activeName === "Home" ||
      activeName === "Map" ||
      activeName === "Explore" ||
      activeName === "Profile"
    ) {
      rememberTab("mysaloon", activeName);
    }
  }, [activeName, rememberTab, setShell, shell]);

  const pressTab = (name: keyof RootTabParamList) => {
    if (switchingRef.current) return;
    if (name === "MorphTryOn") {
      navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
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

  const runShellSwitch = (toMorph: boolean) => {
    if (switchingRef.current) return;
    switchingRef.current = true;

    Animated.parallel([
      Animated.timing(sidesY, {
        toValue: 28,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sidesOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      void (async () => {
        try {
          if (toMorph) {
            const target = await switchToMorphTarget();
            setDisplayShell("morph");
            const tab = (
              target === "MorphStudio" ? "MorphTryOn" : target
            ) as keyof RootTabParamList;
            if (tab === "MorphTryOn") {
              navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
            } else {
              navigation.navigate(tab);
            }
          } else {
            const target = await switchToMysaloonTarget();
            setDisplayShell("mysaloon");
            navigation.navigate(target as keyof RootTabParamList);
          }
        } finally {
          sidesY.setValue(36);
          sidesOpacity.setValue(0);
          Animated.parallel([
            Animated.timing(sidesY, {
              toValue: 0,
              duration: 420,
              useNativeDriver: true,
            }),
            Animated.timing(sidesOpacity, {
              toValue: 1,
              duration: 380,
              useNativeDriver: true,
            }),
          ]).start(() => {
            switchingRef.current = false;
          });
        }
      })();
    });
  };

  const onCenterPress = () => {
    runShellSwitch(shell === "mysaloon");
  };

  const visibleLeft = displayShell === "morph" ? MORPH_LEFT : MYSALOON_LEFT;
  const visibleRight = displayShell === "morph" ? MORPH_RIGHT : MYSALOON_RIGHT;

  const renderSideTab = (tab: TabDef) => {
    const focused = activeName === tab.name;
    return (
      <Pressable
        key={tab.name}
        onPress={() => pressTab(tab.name)}
        style={styles.tab}
        android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true, radius: 28 }}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
      >
        <View style={styles.iconSlot}>
          <Ionicons
            name={focused ? tab.iconOn : tab.icon}
            size={22}
            color={focused ? colors.fg : colors.muted}
          />
          {focused ? <View style={styles.activeDot} /> : <View style={styles.activeDotSpacer} />}
        </View>
        <Text
          style={[styles.label, focused ? styles.labelOn : styles.labelOff]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  if (tabBarHidden) {
    return null;
  }

  const centerIsMorphEntry = displayShell === "mysaloon";

  return (
    <View style={[styles.dockOuter, { paddingBottom: bottomPad }]} pointerEvents="box-none">
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

        {/* Markaz — shell almashtirilganda joyidan siljimaydi */}
        <View style={styles.centerAnchor} pointerEvents="box-none">
          <Pressable
            onPress={onCenterPress}
            style={styles.centerWrap}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true, radius: 30 }}
            accessibilityRole="button"
            accessibilityLabel={centerIsMorphEntry ? "Morf AI" : "MySaloon"}
          >
            <View style={styles.centerBtnShadow}>
              <View style={styles.centerBtn}>
                {centerIsMorphEntry ? (
                  <Image source={morfMarkWhite} style={styles.centerLogo} contentFit="contain" />
                ) : (
                  <Image source={mysaloonIcon} style={styles.centerAppIcon} contentFit="cover" />
                )}
              </View>
            </View>
            <Text style={[styles.label, styles.centerLabel]} numberOfLines={1}>
              {centerIsMorphEntry ? "Morf AI" : "MySaloon"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RootTabsInner() {
  return (
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
            {() => <PlaceholderScreen title="Explore" />}
          </Tab.Screen>
          <Tab.Screen name="Profile" component={ProfileStack} />

          <Tab.Screen name="MorphChat">
            {() => (
              <MorphPlaceholderScreen
                title="AI Chatbot"
                subtitle="Tez orada — soch, parvarish va uslub bo‘yicha AI yordamchi."
                icon="chatbubble-ellipses-outline"
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="MorphCare">
            {() => (
              <MorphPlaceholderScreen
                title="Parvarish"
                subtitle="Shaxsiy soch parvarishi rejasi tez orada."
                icon="water-outline"
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="MorphIngredient">
            {() => (
              <MorphPlaceholderScreen
                title="Tarkib"
                subtitle="Kosmetika tarkibini AI bilan tekshirish tez orada."
                icon="flask-outline"
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="MorphTryOn" component={MorphStack} />
        </Tab.Navigator>
      </MorphSessionProvider>
    </TabBarVisibilityProvider>
  );
}

export function RootTabs() {
  return (
    <AppShellProvider>
      <RootTabsInner />
    </AppShellProvider>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: "transparent",
  },
  dock: {
    minHeight: 64,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    justifyContent: "flex-end",
    paddingBottom: 8,
    paddingTop: 10,
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
  sidesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
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
    gap: 3,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  iconSlot: {
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    marginTop: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.fg,
  },
  activeDotSpacer: {
    marginTop: 3,
    width: 4,
    height: 4,
  },
  centerAnchor: {
    position: "absolute",
    top: -18,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  centerWrap: {
    width: CENTER_SLOT,
    alignItems: "center",
  },
  centerBtnShadow: {
    borderRadius: 26,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  centerLogo: {
    width: 26,
    height: 26,
  },
  centerAppIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  centerLabel: {
    marginTop: 4,
    color: colors.muted,
  },
  labelOn: {
    color: colors.fg,
  },
  labelOff: {
    color: colors.muted,
  },
});
