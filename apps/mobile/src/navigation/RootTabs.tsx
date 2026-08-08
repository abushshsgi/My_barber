import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { morfMarkWhite } from "../branding/morf-logo";
import { FLOATING_TAB_BAR_STYLE } from "../hooks/useHideTabBar";
import { AppShellProvider, useAppShell } from "../lib/AppShellContext";
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

const MYSALOON_LEFT: TabDef[] = [
  { name: "Home", label: "Asosiy", icon: "home-outline", iconOn: "home" },
  { name: "Map", label: "Xarita", icon: "map-outline", iconOn: "map" },
];

const MYSALOON_RIGHT: TabDef[] = [
  { name: "Explore", label: "Explore", icon: "compass-outline", iconOn: "compass" },
  { name: "Profile", label: "Profil", icon: "person-outline", iconOn: "person" },
];

/** Studio dockda yo‘q — faqat Morph home ichida. */
const MORPH_LEFT: TabDef[] = [
  { name: "MorphChat", label: "Chatbot", icon: "chatbubble-ellipses-outline", iconOn: "chatbubble-ellipses" },
  { name: "MorphCare", label: "Parvarish", icon: "water-outline", iconOn: "water" },
  { name: "MorphIngredient", label: "Tarkib", icon: "flask-outline", iconOn: "flask" },
];

const MORPH_RIGHT: TabDef[] = [
  { name: "MorphTryOn", label: "Try-on", icon: "sparkles-outline", iconOn: "sparkles" },
  { name: "Profile", label: "Profil", icon: "person-outline", iconOn: "person" },
];

const mysaloonIcon = require("../../assets/icon.png");

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const { shell, rememberTab, setShell, switchToMorphTarget, switchToMysaloonTarget } = useAppShell();
  const compact = shell === "morph";
  const leftTabs = shell === "morph" ? MORPH_LEFT : MYSALOON_LEFT;
  const rightTabs = shell === "morph" ? MORPH_RIGHT : MYSALOON_RIGHT;
  const activeName = state.routes[state.index]?.name as keyof RootTabParamList | undefined;

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
    // Try-on tabi — stack paywall/results da qolib ketmasin, home ga qaytadi.
    if (name === "MorphTryOn") {
      navigation.navigate("MorphTryOn", { screen: "MorphHome" } as never);
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

  const onCenterPress = () => {
    void (async () => {
      if (shell === "mysaloon") {
        const target = await switchToMorphTarget();
        const tab = (target === "MorphStudio" ? "MorphTryOn" : target) as keyof RootTabParamList;
        if (tab === "MorphTryOn") {
          navigation.navigate("MorphTryOn", { screen: "MorphHome" } as never);
        } else {
          navigation.navigate(tab);
        }
      } else {
        const target = await switchToMysaloonTarget();
        navigation.navigate(target as keyof RootTabParamList);
      }
    })();
  };

  const renderSideTab = (tab: TabDef) => {
    const focused = activeName === tab.name;
    return (
      <Pressable
        key={tab.name}
        onPress={() => pressTab(tab.name)}
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
      >
        <View style={styles.iconSlot}>
          <Ionicons
            name={focused ? tab.iconOn : tab.icon}
            size={compact ? 20 : 22}
            color={focused ? colors.fg : colors.muted}
          />
          {focused ? <View style={styles.activeDot} /> : <View style={styles.activeDotSpacer} />}
        </View>
        <Text
          style={[
            styles.label,
            compact && styles.labelCompact,
            focused ? styles.labelOn : styles.labelOff,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.dockOuter, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={[styles.dock, compact && styles.dockCompact]}>
        {leftTabs.map(renderSideTab)}

        <Pressable
          onPress={onCenterPress}
          style={styles.centerWrap}
          accessibilityRole="button"
          accessibilityLabel={shell === "mysaloon" ? "Morf AI" : "MySaloon"}
        >
          <View style={styles.centerBtn}>
            {shell === "mysaloon" ? (
              <Image source={morfMarkWhite} style={styles.centerLogo} contentFit="contain" />
            ) : (
              <Image source={mysaloonIcon} style={styles.centerAppIcon} contentFit="cover" />
            )}
          </View>
          <Text style={[styles.label, compact && styles.labelCompact, styles.labelOff]} numberOfLines={1}>
            {shell === "mysaloon" ? "Morf AI" : "MySaloon"}
          </Text>
        </Pressable>

        {rightTabs.map(renderSideTab)}
      </View>
    </View>
  );
}

function RootTabsInner() {
  return (
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
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 62,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    ...Platform.select({
      web: { boxShadow: "0 8px 28px rgba(0,0,0,0.12)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 14,
      },
    }),
  },
  dockCompact: {
    paddingHorizontal: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 48,
    paddingVertical: 2,
    minWidth: 0,
  },
  iconSlot: {
    height: 28,
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
  centerWrap: {
    width: 58,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: -18,
    paddingBottom: 2,
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
    ...Platform.select({
      web: { boxShadow: "0 6px 18px rgba(0,0,0,0.22)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
      },
    }),
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
    letterSpacing: -0.1,
  },
  labelCompact: {
    fontSize: 9,
  },
  labelOn: {
    color: colors.fg,
  },
  labelOff: {
    color: colors.muted,
  },
});
