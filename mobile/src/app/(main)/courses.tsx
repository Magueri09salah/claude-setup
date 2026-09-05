import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { BrandIcon } from "@/components/BrandIcon";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { ScreenBackground } from "@/components/ScreenBackground";
import { filterCities } from "@/courses/cities";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { gridBasis, useResponsive } from "@/theme/useResponsive";

interface Support {
  whatsappNumber: string | null;
  whatsappMessage: string;
}

interface MyRequest {
  id: string;
  city: string;
  status: "PENDING" | "CONTACTED" | "ENROLLED" | "CANCELLED";
  createdAt: string;
}

const STATUS_LABEL: Record<MyRequest["status"], string> = {
  PENDING: "طلب مُرسل",
  CONTACTED: "تم التواصل",
  ENROLLED: "مسجّل",
  CANCELLED: "ملغى",
};

/**
 * "التسجيل في الدروس" — the candidate picks the city where they want to take
 * driving lessons, then contacts the school on WhatsApp. The request is also
 * recorded server-side so the owner sees the lead in the admin panel even when
 * the chat never gets sent.
 */
export default function CoursesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { columns } = useResponsive();
  const [support, setSupport] = useState<Support | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [mine, setMine] = useState<MyRequest[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<Support>("/content/support")
      .then(setSupport)
      .catch(() => setSupport({ whatsappNumber: null, whatsappMessage: "" }));
  }, []);

  // Re-read on focus: the admin may have moved the request forward while the
  // candidate was away in WhatsApp.
  const loadMine = useCallback(() => {
    api<{ requests: MyRequest[] }>("/course-requests/mine")
      .then((r) => setMine(r.requests))
      .catch(() => undefined); // offline is not an error on this screen
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadMine();
    }, [loadMine]),
  );

  const cities = useMemo(() => filterCities(query), [query]);
  const statusByCity = useMemo(
    () => new Map(mine.map((r) => [r.city, r.status])),
    [mine],
  );

  const send = async () => {
    if (!city) return;
    setSending(true);
    // Record the lead first, but never let a failure here block the chat —
    // WhatsApp is the channel that actually matters to the candidate.
    try {
      await api("/course-requests", { method: "POST", json: { city } });
      loadMine();
    } catch {
      // ignored on purpose (offline, server down…)
    }
    setSending(false);

    if (!support?.whatsappNumber) {
      Alert.alert(
        "رقم التواصل غير متوفر",
        "لم يُضبط رقم واتساب بعد. حاول لاحقاً أو تواصل مع مدرستك.",
      );
      return;
    }
    const message = [
      `السلام عليكم، أريد التسجيل في دروس السياقة بمدينة ${city}.`,
      user?.username ? `اسم المستخدم: ${user.username}` : "",
      user?.phone ? `رقم الهاتف: ${user.phone}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/${support.whatsappNumber}?text=${encodeURIComponent(message)}`;
    void Linking.openURL(url).catch(() =>
      Alert.alert("تعذّر فتح واتساب", "تأكد من تثبيت تطبيق واتساب على هاتفك."),
    );
  };

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>التسجيل في الدروس</Text>
        </View>

        <View style={styles.pitch}>
          <Icon name="school" size={30} color={colors.lessons} />
          <Text style={styles.pitchTitle}>دروس السياقة في مدينتك</Text>
          <Text style={styles.pitchText}>
            اختر المدينة التي تريد اجتياز دروس السياقة فيها، ثم تواصل معنا عبر
            واتساب وسنرشدك إلى أقرب مدرسة شريكة.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textDim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن مدينتك"
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="close" size={18} color={colors.textDim} />
            </Pressable>
          )}
        </View>

        {cities.length === 0 ? (
          <Text style={styles.empty}>لا توجد مدينة بهذا الاسم.</Text>
        ) : (
          <View style={styles.grid}>
            {cities.map((name) => {
              const selected = city === name;
              const status = statusByCity.get(name);
              return (
                <View
                  key={name}
                  style={[styles.cellWrap, { flexBasis: gridBasis(columns) }]}
                >
                  <PressableScale
                    onPress={() => setCity(name)}
                    style={[styles.cell, selected && styles.cellSelected]}
                    accessibilityLabel={`اختيار مدينة ${name}`}
                  >
                    <Icon
                      name={selected ? "checkCircle" : "mapPin"}
                      size={18}
                      color={selected ? colors.lessons : colors.textDim}
                    />
                    <View style={styles.cellTexts}>
                      <Text
                        style={[styles.cellText, selected && styles.cellTextSelected]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {status && (
                        <Text style={styles.cellStatus}>{STATUS_LABEL[status]}</Text>
                      )}
                    </View>
                  </PressableScale>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Docked, so the action is reachable without scrolling back past 80 cities. */}
      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
        <Text style={styles.footerCity} numberOfLines={1}>
          {city ? `المدينة المختارة: ${city}` : "اختر مدينتك أولاً"}
        </Text>
        <PressableScale
          onPress={() => void send()}
          disabled={!city || sending}
          style={[styles.whatsapp, (!city || sending) && styles.whatsappOff]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <>
              <BrandIcon platform="WHATSAPP" size={22} color={colors.onAccent} />
              <Text style={styles.whatsappText}>تواصل معنا عبر واتساب</Text>
            </>
          )}
        </PressableScale>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: space.lg,
    paddingTop: space.xxl,
    paddingBottom: space.xl,
    gap: space.md,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  pitch: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.lessons,
    padding: space.lg,
    gap: space.sm,
    ...shadow.card,
  },
  pitchTitle: { ...type.title, color: colors.text, textAlign: "right" },
  pitchText: { ...type.body, color: colors.textDim, textAlign: "right" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
  },
  empty: { ...type.body, color: colors.textDim, textAlign: "center", marginTop: space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cellWrap: { flexGrow: 1 },
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 54,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellSelected: {
    borderColor: colors.lessons,
    backgroundColor: colors.surfaceAlt,
  },
  cellTexts: { flex: 1 },
  cellText: { ...type.body, fontSize: 15, color: colors.text, textAlign: "right" },
  cellTextSelected: { fontFamily: font.bold, color: colors.lessons },
  cellStatus: { ...type.label, fontSize: 11, color: colors.success, textAlign: "right" },
  footer: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerCity: { ...type.label, color: colors.textDim, textAlign: "center" },
  whatsapp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    height: 56,
    borderRadius: radius.pill,
    // WhatsApp brand green — the button must look like what it opens.
    backgroundColor: "#25D366",
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    ...shadow.card,
  },
  whatsappOff: { opacity: 0.5 },
  whatsappText: { fontFamily: font.extraBold, fontSize: 17, color: colors.onAccent },
});
