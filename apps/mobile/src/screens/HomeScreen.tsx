import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { HomeCategoryKey } from "../api/types";
import { HomeBanner } from "../components/home/HomeBanner";
import { HomeCategories } from "../components/home/HomeCategories";
import { HomeHeader } from "../components/home/HomeHeader";
import { LISTING_CARD_WIDTH, ListingCard } from "../components/home/ListingCard";
import { SectionHeader } from "../components/home/SectionHeader";
import { useHomeCatalog } from "../hooks/useHomeCatalog";
import { colors } from "../theme/colors";

type Props = {
  onOpenMap?: () => void;
  onOpenExplore?: () => void;
};

export function HomeScreen({ onOpenMap, onOpenExplore }: Props) {
  const insets = useSafeAreaInsets();
  const { topSalons, topBarbers, loading, error, refresh } = useHomeCatalog();
  const [category, setCategory] = useState<HomeCategoryKey>("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const filteredSalons = useMemo(() => {
    if (category === "all") return topSalons;
    const needle =
      category === "beauty" ? "Go'zallik" : category === "nails" ? "Manikyur" : "Barber";
    const matched = topSalons.filter((s) => s.categoryLabel === needle);
    return matched.length > 0 ? matched : topSalons;
  }, [category, topSalons]);

  const toggleFav = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.fg} />
        }
      >
        <HomeHeader locationLabel="O'zbekiston" onPressMap={onOpenMap} />

        <HomeBanner />

        <HomeCategories active={category} onChange={setCategory} />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retry}>
              <Text style={styles.retryText}>Qayta urinish</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && topSalons.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.fg} />
          </View>
        ) : null}

        {filteredSalons.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Top salonlar" onPressLink={onOpenExplore} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={LISTING_CARD_WIDTH + 12}
              contentContainerStyle={styles.hRow}
            >
              {filteredSalons.map((item) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  favorited={Boolean(favorites[item.id])}
                  onToggleFavorite={() => toggleFav(item.id)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {topBarbers.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Top ustalar" onPressLink={onOpenMap} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={LISTING_CARD_WIDTH + 12}
              contentContainerStyle={styles.hRow}
            >
              {topBarbers.map((item) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  favorited={Boolean(favorites[item.id])}
                  onToggleFavorite={() => toggleFav(item.id)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    gap: 20,
    paddingBottom: 24,
  },
  section: {
    gap: 0,
  },
  hRow: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  loader: {
    paddingVertical: 32,
    alignItems: "center",
  },
  errorBox: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.muted,
  },
  retry: {
    alignSelf: "flex-start",
    backgroundColor: colors.fg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
  },
});
