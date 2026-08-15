import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_DOCK_CLEARANCE } from "../hooks/useHideTabBar";
import type { HomeCategoryKey, HomeListing } from "../api/types";
import { HomeBanner } from "../components/home/HomeBanner";
import { HomeCategories } from "../components/home/HomeCategories";
import { HomeHeader } from "../components/home/HomeHeader";
import { ListingCard } from "../components/home/ListingCard";
import { SectionHeader } from "../components/home/SectionHeader";
import { useHomeCatalog } from "../hooks/useHomeCatalog";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { CARD_GAP, H_PAD, useHomeLayout } from "../theme/layout";
import { colors } from "../theme/colors";

type Props = {
  onOpenMap?: () => void;
  onOpenExplore?: () => void;
};

const MemoCard = memo(ListingCard);

export function HomeScreen({ onOpenMap, onOpenExplore }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cardW, cardImageW, fs } = useHomeLayout();
  const { topSalons, topBarbers, locationLabel, loading, error, refresh } = useHomeCatalog();
  const [category, setCategory] = useState<HomeCategoryKey>("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const openListing = useCallback(
    (item: HomeListing) => {
      if (item.id.startsWith("barber-")) return;
      navigation.navigate("SalonDetail", {
        salonId: item.id,
        distanceKm: item.distanceKm,
      });
    },
    [navigation],
  );

  const filteredSalons = useMemo(() => {
    if (category === "all") return topSalons;
    const needle =
      category === "beauty" ? "Go'zallik" : category === "nails" ? "Manikyur" : "Barber";
    const matched = topSalons.filter((s) => s.categoryLabel === needle);
    return matched.length > 0 ? matched : topSalons;
  }, [category, topSalons]);

  const toggleFav = useCallback((id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const snap = cardW + CARD_GAP;

  const renderSalon = useCallback(
    ({ item }: { item: HomeListing }) => (
      <MemoCard
        item={item}
        cardWidth={cardW}
        imageWidth={cardImageW}
        favorited={Boolean(favorites[item.id])}
        onToggleFavorite={() => toggleFav(item.id)}
        onPress={() => openListing(item)}
      />
    ),
    [cardW, cardImageW, favorites, toggleFav, openListing],
  );

  const renderBarber = useCallback(
    ({ item }: { item: HomeListing }) => (
      <MemoCard
        item={item}
        cardWidth={cardW}
        imageWidth={cardImageW}
        favorited={Boolean(favorites[item.id])}
        onToggleFavorite={() => toggleFav(item.id)}
        onPress={() => openListing(item)}
      />
    ),
    [cardW, cardImageW, favorites, toggleFav, openListing],
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.fg} />
        }
        removeClippedSubviews
      >
        <HomeHeader locationLabel={locationLabel} onPressMap={onOpenMap} />

        <HomeBanner />

        <HomeCategories active={category} onChange={setCategory} />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { fontSize: fs(12) }]}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retry}>
              <Text style={[styles.retryText, { fontSize: fs(12) }]}>{t("common.retry")}</Text>
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
            <SectionHeader title={t("home.topSalons")} onPressLink={onOpenExplore} />
            <FlatList
              data={filteredSalons}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={renderSalon}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={snap}
              snapToAlignment="start"
              contentContainerStyle={styles.hRow}
              initialNumToRender={4}
              windowSize={5}
              maxToRenderPerBatch={4}
              removeClippedSubviews
              getItemLayout={(_, index) => ({
                length: snap,
                offset: snap * index,
                index,
              })}
            />
          </View>
        ) : null}

        {topBarbers.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t("home.topBarbers")} onPressLink={onOpenMap} />
            <FlatList
              data={topBarbers}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={renderBarber}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={snap}
              snapToAlignment="start"
              contentContainerStyle={styles.hRow}
              initialNumToRender={4}
              windowSize={5}
              maxToRenderPerBatch={4}
              removeClippedSubviews
              getItemLayout={(_, index) => ({
                length: snap,
                offset: snap * index,
                index,
              })}
            />
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
    gap: 16,
    paddingBottom: TAB_DOCK_CLEARANCE + 24,
  },
  section: {
    gap: 0,
  },
  hRow: {
    gap: CARD_GAP,
    paddingHorizontal: H_PAD,
    paddingBottom: 2,
  },
  loader: {
    paddingVertical: 28,
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
    fontWeight: "700",
    color: "#FFF",
  },
});
