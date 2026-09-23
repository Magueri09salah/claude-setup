import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { LiveSection } from "@/components/LiveSection";
import { markLiveSeen, useLive } from "@/lives/useLive";
import { colors, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useBottomInset } from "@/theme/useScreenInsets";

export default function LivesScreen() {
  // Edge-to-edge: the last card would sit under Android's navigation
  // bar without this (owner report 2026-09-23).
  const paddingBottom = useBottomInset();
  const { settings, currentKey } = useLive();

  // Opening this page clears the bell badge for the current occurrence.
  useEffect(() => {
    if (currentKey) markLiveSeen(currentKey);
  }, [currentKey]);

  const configured = settings?.enabled && settings.platforms.length > 0;

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>البث المباشر</Text>
        </View>

        {configured ? (
          <>
            <LiveSection variant="page" />
            <Text style={styles.note}>
              يتم البث كل يوم في نفس الوقت. اضغط على منصتك المفضلة للانتقال إلى
              الحساب ومشاهدة البث مباشرة.
            </Text>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Icon name="satellite" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>لا يوجد بث مبرمج</Text>
            <Text style={styles.emptyText}>
              سنُشعرك فور برمجة البث المباشر.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  note: { ...type.body, color: colors.textDim, textAlign: "right" },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
    gap: space.sm,
    ...shadow.card,
  },
  emptyTitle: { ...type.title, color: colors.text, textAlign: "center" },
  emptyText: { ...type.body, color: colors.textDim, textAlign: "center" },
});
