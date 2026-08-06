import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { colors } from "../theme/colors";
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
  center?: boolean;
};

const TABS: TabDef[] = [
  { name: "Home", label: "Asosiy", icon: "home-outline" },
  { name: "Map", label: "Xarita", icon: "map-outline" },
  { name: "MorphAI", label: "Morf AI", icon: "sparkles", center: true },
  { name: "Explore", label: "Explore", icon: "compass-outline" },
  { name: "Profile", label: "Profil", icon: "person-outline" },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 6) }]}>
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
            <Pressable key={route.key} onPress={onPress} style={styles.centerWrap}>
              <View style={styles.centerBtn}>
                <Ionicons name={tab.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.label, focused ? styles.labelOn : styles.labelOff]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
              <Ionicons
                name={
                  focused
                    ? tab.icon === "home-outline"
                      ? "home"
                      : tab.icon === "person-outline"
                        ? "person"
                        : tab.icon === "map-outline"
                          ? "map"
                          : tab.icon
                    : tab.icon
                }
                size={18}
                color={focused ? "#FFFFFF" : colors.muted}
              />
            </View>
            <Text style={[styles.label, focused ? styles.labelOn : styles.labelOff]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
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
      <Tab.Screen name="MorphAI">
        {() => (
          <PlaceholderScreen
            title="Morf AI"
            subtitle="AI soch uslubi keyingi bosqichda ulanadi."
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Explore">
        {() => <PlaceholderScreen title="Explore" />}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: "rgba(244,244,244,0.96)",
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 44,
    paddingVertical: 3,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapOn: {
    backgroundColor: colors.fg,
  },
  centerWrap: {
    width: 58,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  centerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
  },
  labelOn: {
    color: colors.fg,
  },
  labelOff: {
    color: colors.muted,
  },
});
