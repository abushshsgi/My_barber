import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { colors } from "../theme/colors";
import { MorphStack } from "./MorphStack";
import { ProfileStack } from "./ProfileStack";

export type RootTabParamList = {
  Home: undefined;
  Map: undefined;
  MorphAI: undefined;
  Explore: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabDef = {
  name: keyof RootTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOn: keyof typeof Ionicons.glyphMap;
  center?: boolean;
};

const TABS: TabDef[] = [
  { name: "Home", label: "Asosiy", icon: "home-outline", iconOn: "home" },
  { name: "Map", label: "Xarita", icon: "map-outline", iconOn: "map" },
  { name: "MorphAI", label: "Morf AI", icon: "sparkles", iconOn: "sparkles", center: true },
  { name: "Explore", label: "Explore", icon: "compass-outline", iconOn: "compass" },
  { name: "Profile", label: "Profil", icon: "person-outline", iconOn: "person" },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.dockOuter, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = TABS.find((t) => t.name === route.name)!;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (tab.center) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.centerWrap}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
              >
                <View style={[styles.centerBtn, focused && styles.centerBtnOn]}>
                  <Ionicons name={tab.icon} size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.label, focused ? styles.labelOn : styles.labelOff]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
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
              <Text style={[styles.label, focused ? styles.labelOn : styles.labelOff]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RootTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
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
      <Tab.Screen name="MorphAI" component={MorphStack} />
      <Tab.Screen name="Explore">
        {() => <PlaceholderScreen title="Explore" />}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: colors.bg,
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
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 48,
    paddingVertical: 2,
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
    width: 64,
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
  centerBtnOn: {
    transform: [{ scale: 1.04 }],
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  labelOn: {
    color: colors.fg,
  },
  labelOff: {
    color: colors.muted,
  },
});
