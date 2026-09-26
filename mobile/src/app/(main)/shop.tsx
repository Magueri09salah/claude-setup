import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, mediaUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { BrandIcon } from "@/components/BrandIcon";
import { Icon } from "@/components/Icon";
import { ImagePager } from "@/components/ImagePager";
import { PressableScale } from "@/components/PressableScale";
import { ScreenBackground } from "@/components/ScreenBackground";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { gridBasis, useResponsive } from "@/theme/useResponsive";
import { useBottomInset } from "@/theme/useScreenInsets";

interface Product {
  id: number;
  title: string;
  description: string | null;
  price: number;
  /** Ordered; the first is the cover on the card, the rest page in the sheet. */
  imageUrls: string[];
}

interface Support {
  whatsappNumber: string | null;
  whatsappMessage: string;
  /**
   * Where product orders go. No fallback to the general contact number: null
   * means the owner has not set one, and the order button is disabled rather
   * than quietly sending the order to the wrong phone (owner 2026-09-24).
   */
  shopWhatsappNumber: string | null;
}

function priceLabel(price: number): string {
  return `${price.toLocaleString("ar-MA")} درهم`;
}

/**
 * المتجر — the shop. Pictures are signed, short-lived urls fetched fresh (like
 * the practical videos), NOT part of the offline bundle: products change often
 * and are not learning content. Buying is a WhatsApp conversation, so there is
 * no cart and no checkout.
 */
export default function ShopScreen() {
  // Edge-to-edge: the last card would sit under Android's navigation
  // bar without this (owner report 2026-09-23).
  const paddingBottom = useBottomInset();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { columns } = useResponsive();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [support, setSupport] = useState<Support | null>(null);
  const [active, setActive] = useState<Product | null>(null);
  // Which picture the detail sheet is showing. Reset whenever the sheet opens
  // on a different product, or the second product would open on page 3.
  const [imageIndex, setImageIndex] = useState(0);
  const [pagerOpen, setPagerOpen] = useState(false);

  const openProduct = (product: Product) => {
    setImageIndex(0);
    setPagerOpen(false);
    setActive(product);
  };

  const shots = active?.imageUrls ?? [];
  const step = (delta: number) => {
    if (shots.length < 2) return;
    // Wraps both ways, so the arrows never dead-end on the first or last shot.
    setImageIndex((i) => (i + delta + shots.length) % shots.length);
  };

  const load = useCallback(() => {
    setFailed(false);
    api<{ products: Product[] }>("/content/products")
      .then((r) => setProducts(r.products))
      .catch(() => {
        setProducts(null);
        setFailed(true);
      });
  }, []);

  useEffect(() => {
    load();
    api<Support>("/content/support")
      .then(setSupport)
      .catch(() => setSupport(null));
  }, [load]);

  const order = (product: Product) => {
    // Guard, not a message: the button is disabled when there is no number, so
    // reaching here at all would be a bug.
    if (!support?.shopWhatsappNumber) return;
    const message = [
      `السلام عليكم، أريد شراء: ${product.title} (${priceLabel(product.price)}).`,
      user?.username ? `اسم المستخدم: ${user.username}` : "",
      user?.phone ? `رقم الهاتف: ${user.phone}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/${support.shopWhatsappNumber}?text=${encodeURIComponent(message)}`;
    void Linking.openURL(url).catch(() =>
      Alert.alert("تعذّر فتح واتساب", "تأكد من تثبيت تطبيق واتساب على هاتفك."),
    );
  };

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>المتجر</Text>
        </View>

        {products === null && !failed && (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={colors.lessons} />
          </View>
        )}

        {failed && (
          <View style={styles.centerBlock}>
            <Icon name="alert" size={28} color={colors.textDim} />
            <Text style={styles.stateText}>
              تعذّر تحميل المتجر — تحقق من اتصالك بالإنترنت.
            </Text>
            <PressableScale onPress={load} style={styles.retry}>
              <Icon name="refresh" size={16} color={colors.text} />
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </PressableScale>
          </View>
        )}

        {products?.length === 0 && (
          <View style={styles.centerBlock}>
            <Icon name="store" size={30} color={colors.textDim} />
            <Text style={styles.stateText}>لا توجد منتجات حالياً.</Text>
          </View>
        )}

        {/* flexBasis only, no flexGrow: an odd last product keeps the same
            width as the rest instead of stretching across the whole row
            (owner 2026-09-24). */}
        {products && products.length > 0 && (
          <View style={styles.grid}>
            {products.map((p) => (
              <View key={p.id} style={{ flexBasis: gridBasis(columns) }}>
                <PressableScale
                  onPress={() => openProduct(p)}
                  style={styles.card}
                  accessibilityLabel={`${p.title} — ${priceLabel(p.price)}`}
                >
                  <View style={styles.thumbWrap}>
                    {p.imageUrls[0] ? (
                      <Image
                        source={{ uri: mediaUrl(p.imageUrls[0]) ?? undefined }}
                        style={styles.thumb}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <Icon name="store" size={26} color={colors.lessons} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={styles.cardPrice}>{priceLabel(p.price)}</Text>
                </PressableScale>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={active !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActive(null)}
        // The app rotates freely; without this the sheet is portrait-only.
        supportedOrientations={["portrait", "landscape"]}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: space.lg + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setActive(null)} hitSlop={10}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {active?.title}
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.sheetBody}>
              {shots.length > 0 ? (
                <View>
                  {/* Tap to open the same set fullscreen, on this picture. */}
                  <Pressable
                    onPress={() => setPagerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="عرض الصورة بملء الشاشة"
                  >
                    <Image
                      source={{ uri: mediaUrl(shots[imageIndex]) ?? undefined }}
                      style={styles.bigImage}
                      contentFit="contain"
                      transition={150}
                    />
                    <View style={styles.zoomBadge}>
                      <Icon name="zoom" size={16} color={colors.text} />
                    </View>
                  </Pressable>
                  {/* Arrows only earn their place when there is somewhere to
                      go. Each chevron points OUTWARD, towards its own edge,
                      and the direction follows the Arabic reading order the
                      rest of the app uses: right steps back, left steps on —
                      the same sense as the back button in every header. */}
                  {shots.length > 1 && (
                    <>
                      <Pressable
                        onPress={() => step(1)}
                        hitSlop={8}
                        style={[styles.arrow, styles.arrowLeft]}
                        accessibilityRole="button"
                        accessibilityLabel="الصورة التالية"
                      >
                        <Icon name="forward" size={22} color={colors.text} />
                      </Pressable>
                      <Pressable
                        onPress={() => step(-1)}
                        hitSlop={8}
                        style={[styles.arrow, styles.arrowRight]}
                        accessibilityRole="button"
                        accessibilityLabel="الصورة السابقة"
                      >
                        <Icon name="back" size={22} color={colors.text} />
                      </Pressable>
                      <View style={styles.dots}>
                        {shots.map((url, i) => (
                          <View
                            key={url}
                            style={[styles.dot, i === imageIndex && styles.dotOn]}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </View>
              ) : (
                <View style={[styles.bigImage, styles.thumbFallback]}>
                  <Icon name="store" size={36} color={colors.lessons} />
                </View>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.bigPrice}>
                  {active ? priceLabel(active.price) : ""}
                </Text>
              </View>

              {active?.description ? (
                <Text style={styles.description}>{active.description}</Text>
              ) : null}
            </ScrollView>

            <PressableScale
              onPress={() => active && order(active)}
              disabled={!support?.shopWhatsappNumber}
              style={[
                styles.whatsapp,
                !support?.shopWhatsappNumber && styles.whatsappOff,
              ]}
            >
              <BrandIcon platform="WHATSAPP" size={22} color={colors.onAccent} />
              <Text style={styles.whatsappText}>اطلبه عبر واتساب</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Outside the detail sheet's Modal: nesting one Modal inside another is
          unreliable on iOS, where the inner one can refuse to appear. */}
      <ImagePager
        uris={shots.map((u) => mediaUrl(u) ?? u)}
        startIndex={imageIndex}
        visible={pagerOpen}
        onClose={() => setPagerOpen(false)}
      />
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
    maxWidth: 900,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingVertical: space.xxl,
  },
  stateText: { ...type.body, color: colors.textDim, textAlign: "center" },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.sm,
    paddingHorizontal: space.lg,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
  },
  retryText: { ...type.label, fontSize: 15, color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    gap: space.xs,
    ...shadow.card,
  },
  thumbWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  thumb: { width: "100%", height: "100%" },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  cardTitle: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    marginTop: space.xs,
  },
  cardPrice: {
    fontFamily: font.extraBold,
    fontSize: 15,
    color: colors.lessons,
    textAlign: "right",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
    maxHeight: "92%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: space.md },
  sheetTitle: { ...type.title, color: colors.text, flex: 1, textAlign: "right" },
  sheetBody: { gap: space.md },
  bigImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  // Centred vertically over the picture, inset from its edge.
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,25,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Plain left/right: this app does NOT flip its layout (no I18nManager.forceRTL
  // anywhere) — Arabic is handled with textAlign, so the visual sides are fixed.
  arrowLeft: { left: space.sm },
  arrowRight: { right: space.sm },
  dots: {
    position: "absolute",
    bottom: space.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotOn: { backgroundColor: colors.lessons },
  zoomBadge: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,25,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  priceRow: { alignItems: "flex-end" },
  bigPrice: { fontFamily: font.extraBold, fontSize: 22, color: colors.lessons },
  description: { ...type.body, color: colors.text, textAlign: "right" },
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
  // No order number set in the admin panel — same dimming as the courses
  // screen uses when no city is picked.
  whatsappOff: { opacity: 0.5 },
  whatsappText: { fontFamily: font.extraBold, fontSize: 17, color: colors.onAccent },
});
