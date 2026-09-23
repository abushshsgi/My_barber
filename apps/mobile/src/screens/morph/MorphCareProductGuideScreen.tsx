import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { fetchCareProduct, type CareProduct } from "../../api/care";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { setRoutineTaskDone } from "../../lib/morph-my-products";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareProductGuide">;

interface StepItem {
  number: number;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function getStepsForCategory(category?: string, usageText?: string): StepItem[] {
  const cat = (category || "").toLowerCase();
  if (cat.includes("shampoo") || cat.includes("shampun")) {
    return [
      {
        number: 1,
        title: "Iliq suv bilan ho'llash",
        desc: "Sochni va bosh terisini iliq suv bilan to'liq namlang. Qaynoq suvdan saqlaning.",
        icon: "water-outline",
      },
      {
        number: 2,
        title: "Bosh terisiga massaj qilish",
        desc: "Kichik miqdorda kaftingizda ko'pirtirib, barmoq uchlari bilan bosh terisini 2 daqiqa massaj qiling.",
        icon: "hand-left-outline",
      },
      {
        number: 3,
        title: "Yaxshilab chayish",
        desc: "Iliq suv bilan qoldiq qolmasdan yaxshilab yuving va sochiq bilan muloyim quriting.",
        icon: "sparkles-outline",
      },
    ];
  }
  if (cat.includes("mask") || cat.includes("niqob")) {
    return [
      {
        number: 1,
        title: "Toza nam sochga surtish",
        desc: "Yuvilgandan so'ng ortiqcha namlikni sochiq bilan shimdiring va ildizdan 2-3 sm qoldirib surting.",
        icon: "leaf-outline",
      },
      {
        number: 2,
        title: "Taymer bo'yicha kutish",
        desc: usageText || "Niqobning faol moddalari chuqur singishi uchun 3-5 daqiqa kuting.",
        icon: "timer-outline",
      },
      {
        number: 3,
        title: "Iliq suv bilan yuvish",
        desc: "Iliq suv bilan sochlaringiz ipakdek silliq bo'lguncha chayib tashlang.",
        icon: "checkmark-circle-outline",
      },
    ];
  }
  if (cat.includes("oil") || cat.includes("serum") || cat.includes("yog")) {
    return [
      {
        number: 1,
        title: "2-3 tomchi dozalash",
        desc: "Kaftingizga 2-3 tomchi tomizib, kaftlaringizni bir-biriga ishqab iliting.",
        icon: "color-wand-outline",
      },
      {
        number: 2,
        title: "Soch uchlariga surtish",
        desc: "Sochning o'rta qismi va uchlariga bir tekis taqsimlang, ildizga surtmang.",
        icon: "finger-print-outline",
      },
      {
        number: 3,
        title: "Shakllantirish",
        desc: "Sochni taroq bilan tarab, odatdagidek quritishingiz yoki shakl berishingiz mumkin.",
        icon: "sparkles-outline",
      },
    ];
  }
  return [
    {
      number: 1,
      title: "Tayyorlash va purkash",
      desc: "Idishni chayqang va sochingizga 15-20 sm masofadan bir tekisda seping.",
      icon: "color-wand-outline",
    },
    {
      number: 2,
      title: "Singishini kutish",
      desc: usageText || "Barmoqlar yordamida soch bo'ylab yengil taqsimlang va 2 daqiqa kuting.",
      icon: "timer-outline",
    },
    {
      number: 3,
      title: "Natijani his qilish",
      desc: "Sochlar yumshoq, yaltiroq va himoyalangan holatga keladi.",
      icon: "checkmark-circle-outline",
    },
  ];
}

const TimerBackdrop = memo(function TimerBackdrop({
  running,
  scale,
}: {
  running: boolean;
  scale: Animated.Value;
}) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
      <LinearGradient
        colors={running ? ["#111111", "#737373"] : ["#09090B", "#27272A"]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

export function MorphCareProductGuideScreen({ navigation, route }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = route.params || {};

  const [product, setProduct] = useState<CareProduct | null>(null);
  const initialMinutes = params.durationMinutes || 2;
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (params.productId) {
      void fetchCareProduct(params.productId)
        .then((data) => setProduct(data))
        .catch(() => {});
    }
  }, [params.productId]);

  const leftRef = useRef(timeLeft);
  leftRef.current = timeLeft;

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const next = leftRef.current - 1;
      if (next <= 0) {
        leftRef.current = 0;
        setTimeLeft(0);
        setIsRunning(false);
        setIsCompleted(true);
        Alert.alert("Vaqt tugadi! 🎉", "Mahsulotni qo'llash bosqichi muvaffaqiyatli yakunlandi.");
        return;
      }
      leftRef.current = next;
      setTimeLeft(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isRunning, pulseAnim]);

  const toggleTimer = useCallback(() => {
    if (timeLeft === 0) {
      setTimeLeft(totalSeconds);
      setIsCompleted(false);
    }
    setIsRunning((prev) => !prev);
  }, [timeLeft, totalSeconds]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setIsCompleted(false);
  }, [totalSeconds]);

  const adjustSeconds = useCallback((sec: number) => {
    setTimeLeft((prev) => Math.max(10, prev + sec));
    setTotalSeconds((prev) => Math.max(10, prev + sec));
  }, []);

  const handleMarkDone = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const taskId = `product_${params.productId || params.productTitle || "guide"}`;
    await setRoutineTaskDone(today, taskId, true);
    setIsCompleted(true);
    Alert.alert("Ajoyib! ✨", "Bugungi parvarish rejasi ro'yxatiga belgilandi.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  }, [params.productId, params.productTitle, navigation]);

  const title = product?.name || params.productTitle || "Soch parvarishi vositasi";
  const brand = product?.brand || params.brand || "Morf Care Pro";
  const category = product?.category || params.category || "spray";
  const image = product?.image_url || params.imageUrl || "";
  const heroSource = useMemo(() => (image ? { uri: image } : null), [image]);
  const usageText = product?.usage_uz || params.usageText;

  const steps =
    product?.usage_steps && product.usage_steps.length
      ? product.usage_steps.map((s, i) => ({
          number: i + 1,
          title: s.title,
          desc: s.desc,
          icon: (["water-outline", "hand-left-outline", "sparkles-outline", "checkmark-circle-outline"][
            i % 4
          ] || "sparkles-outline") as keyof typeof Ionicons.glyphMap,
        }))
      : getStepsForCategory(category, usageText);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - timeLeft) / totalSeconds) * 100));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#FFF0F4", "#FDE8EE", "#FCE2E9", "#09090B"]}
        locations={[0, 0.25, 0.55, 0.95]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.navBar, { paddingTop: safeTop(insets.top, 8) }]}>
        <NativeBackButton
          onPress={() => {
            const routes = navigation.getState?.()?.routes;
            if (routes && routes.length > 1) {
              navigation.goBack();
            } else {
              navigation.navigate("CareHome");
            }
          }}
          accessibilityLabel={t("common.back")}
        />

        <Text style={styles.navTitle} numberOfLines={1}>
          Qo'llash va Taymer
        </Text>

        <Pressable
          style={styles.navAction}
          onPress={resetTimer}
          accessibilityLabel="Reset"
          hitSlop={8}
        >
          <Ionicons name="refresh" size={18} color="#111" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: safeBottom(insets.bottom, 24),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Hero Card */}
        <View style={styles.heroCard}>
          {heroSource ? (
            <Image
              source={heroSource}
              style={styles.heroImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={image}
            />
          ) : (
            <View style={[styles.heroImg, { backgroundColor: "#E8E8E8" }]} />
          )}
          <View style={styles.heroInfo}>
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{category.toUpperCase()}</Text>
            </View>
            <Text style={styles.heroBrand}>{brand}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          </View>
        </View>

        {/* Live Timer Section */}
        <View style={styles.timerCard}>
          <Text style={styles.timerSubtitle}>Tavsiya etilgan ta'sir vaqti</Text>

          <View style={styles.timerCircle}>
            <TimerBackdrop running={isRunning} scale={pulseAnim} />
            <View pointerEvents="none" style={styles.timerLabel}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <Text style={styles.timerStateLabel}>
                {isRunning ? "Ta'sir qilmoqda..." : isCompleted ? "Bajarildi ✨" : "Tayyormisiz?"}
              </Text>
            </View>
          </View>

          {/* Quick adjust buttons */}
          <View style={styles.adjustRow}>
            <Pressable style={styles.adjustBtn} onPress={() => adjustSeconds(-30)}>
              <Text style={styles.adjustBtnText}>-30 soniya</Text>
            </Pressable>
            <Pressable style={styles.adjustBtn} onPress={() => adjustSeconds(30)}>
              <Text style={styles.adjustBtnText}>+30 soniya</Text>
            </Pressable>
          </View>

          {/* Controls */}
          <View style={styles.timerControls}>
            <Pressable
              style={[styles.mainActionBtn, isRunning ? styles.pauseBtn : styles.startBtn]}
              onPress={toggleTimer}
            >
              <Ionicons
                name={isRunning ? "pause" : "play"}
                size={22}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.mainActionBtnText}>
                {isRunning ? "Pauza" : timeLeft === 0 ? "Qaytadan boshlash" : "Boshlash"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Step by Step Instructions */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionHeader}>Bosqichma-bosqich qo'llash</Text>

          <View style={styles.stepsList}>
            {steps.map((item) => (
              <View key={item.number} style={styles.stepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>{item.number}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.desc}</Text>
                </View>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={item.icon} size={20} color="#111111" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Pro Tips */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Morf Barber Maslahati</Text>
            <Text style={styles.tipDesc}>
              {usageText || "Mahsulotni qo'llagandan keyin sochni qattiq siqmang. Tabiiy qurishiga yoki past haroratli fen bilan fenlashga ruxsat bering."}
            </Text>
          </View>
        </View>

        {/* Complete button */}
        <Pressable style={styles.completeBtn} onPress={handleMarkDone}>
          <LinearGradient
            colors={["#111111", "#111111"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.completeBtnInner}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.completeBtnText}>Parvarishni yakunlash</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: "#FAFAFA" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(12),
  },
  navAction: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  navTitle: {
    ...morphFont,
    fontSize: fontSize(17),
    fontWeight: "700",
    color: "#111827",
  },
  scroll: { flex: 1, minHeight: 0 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: moderateScale(24),
    padding: moderateScale(14),
    gap: moderateScale(14),
    marginTop: verticalScale(6),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroImg: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(18),
    backgroundColor: "#F3F4F6",
  },
  heroInfo: { flex: 1, gap: moderateScale(4) },
  catBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFE4E6",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(6),
  },
  catBadgeText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    color: "#111111",
    letterSpacing: 0.5,
  },
  heroBrand: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "#6B7280",
  },
  heroTitle: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "800",
    color: "#111827",
    lineHeight: fontSize(20),
  },
  timerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(28),
    padding: moderateScale(20),
    alignItems: "center",
    marginTop: verticalScale(16),
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  timerSubtitle: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: verticalScale(16),
  },
  timerCircle: {
    width: scale(170),
    height: scale(170),
    borderRadius: moderateScale(85),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  timerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    ...morphFont,
    fontSize: fontSize(36),
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  timerStateLabel: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: verticalScale(4),
  },
  adjustRow: {
    flexDirection: "row",
    gap: moderateScale(12),
    marginTop: verticalScale(18),
  },
  adjustBtn: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 999,
  },
  adjustBtnText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#4B5563",
  },
  timerControls: {
    flexDirection: "row",
    width: "100%",
    marginTop: verticalScale(18),
  },
  mainActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(18),
  },
  startBtn: {
    backgroundColor: "#09090B",
  },
  pauseBtn: {
    backgroundColor: "#111111",
  },
  mainActionBtnText: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepsSection: {
    marginTop: verticalScale(20),
    gap: moderateScale(12),
  },
  sectionHeader: {
    ...morphFont,
    fontSize: fontSize(17),
    fontWeight: "800",
    color: "#111827",
  },
  stepsList: {
    gap: moderateScale(10),
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(20),
    padding: moderateScale(14),
    gap: moderateScale(12),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  stepNumberBadge: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "800",
    color: "#111111",
  },
  stepContent: { flex: 1, gap: moderateScale(2) },
  stepTitle: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#111827",
  },
  stepDesc: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "#6B7280",
    lineHeight: fontSize(16),
  },
  stepIconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: moderateScale(20),
    padding: moderateScale(14),
    gap: moderateScale(12),
    marginTop: verticalScale(16),
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  tipTitle: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "700",
    color: "#1E40AF",
  },
  tipDesc: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "#3B82F6",
    lineHeight: fontSize(16),
    marginTop: verticalScale(2),
  },
  completeBtn: {
    marginTop: verticalScale(20),
    borderRadius: moderateScale(20),
    overflow: "hidden",
  },
  completeBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    gap: moderateScale(8),
  },
  completeBtnText: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
