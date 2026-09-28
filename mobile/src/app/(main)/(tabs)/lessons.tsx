import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import {
  listTopCategories,
  signProgressByCategory,
  type DownloadState,
} from "@/db/lessons";
import { openCategory } from "@/lessons/nav";
import { accentFor } from "@/theme/lessonAccents";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";
import { runSync } from "@/sync/engine";
import { useSyncStatus } from "@/sync/useSyncStatus";

// الدروس النظرية — level 1 of 3 (owner sketch 2026-08-07): the categories are
// FULL-WIDTH rows (التشوير الطرقي / المركبة / الوثائق). Level 2 is where the
// 2-column picture grid starts.
export default function LessonsHomeScreen() {
  // This tab stays mounted, so a plain read at render would leave it showing
  // "لا توجد دروس بعد" for ever while the first download was still
  // fetching the catalogue (owner decision 2026-09-28: the app opens straight
  // away and fills in as the files arrive).
  const sync = useSyncStatus();
  const [categories, setCategories] = useState(listTopCategories);
  const [progress, setProgress] = useState<Map<number, DownloadState>>(
    signProgressByCategory,
  );
  const [retryOffline, setRetryOffline] = useState(false);

  const readContent = useCallback(() => {
    setCategories(listTopCategories());
    setProgress(signProgressByCategory());
  }, []);

  useFocusEffect(readContent);

  useEffect(() => {
    readContent();
    if (sync.running) setRetryOffline(false);
  }, [sync, readContent]);

  // Resumes from the row: the engine skips every file already on disk.
  const retry = async () => {
    setRetryOffline(false);
    const result = await runSync();
    setRetryOffline(result === "offline");
  };

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.titleFlex]}>الدروس النظرية</Text>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>لا توجد دروس بعد</Text>
            <Text style={styles.emptyText}>
              اضغط "تحديث" في الشاشة الرئيسية عند توفر الإنترنت لتحميل الدروس.
            </Text>
          </View>
        ) : (
          categories.map((c) => {
            const locked = c.locked === 1;
            const accent = accentFor(c.order_num);
            // Same rule as a series card: the door stays shut until everything
            // behind it is on the phone.
            const p = progress.get(c.id);
            const incomplete =
              !locked && !!p && p.total > 0 && p.ready < p.total;
            const loading = incomplete && sync.running;
            return (
              <PressableScale
                key={c.id}
                disabled={loading}
                onPress={() =>
                  locked
                    ? router.push("/unlock")
                    : incomplete
                      ? void retry()
                      : openCategory(c.id)
                }
                style={[styles.row, (locked || incomplete) && styles.lockedRow]}
                accessibilityState={{ busy: loading, disabled: loading }}
              >
                <View style={[styles.chip, { backgroundColor: `${accent}26` }]}>
                  {loading ? (
                    <ActivityIndicator size="small" color={accent} />
                  ) : incomplete ? (
                    <Icon name="refresh" size={26} color={accent} />
                  ) : c.icon_path ? (
                    <Image source={{ uri: c.icon_path }} style={styles.chipImage} />
                  ) : (
                    <Icon name="sign" size={26} color={accent} />
                  )}
                </View>
                {locked && (
                  <View style={styles.lockChip}>
                    <Icon name="lock" size={13} color={colors.premium} />
                    <Text style={styles.lockChipText}>مقفل</Text>
                  </View>
                )}
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>{c.title}</Text>
                  {incomplete && p && (
                    <Text style={styles.rowMeta}>
                      {loading
                        ? `جاري التحميل… ${p.ready}/${p.total}`
                        : retryOffline
                          ? "لا يوجد اتصال — اضغط لإعادة المحاولة"
                          : `اضغط لإكمال التحميل · ${p.ready}/${p.total}`}
                    </Text>
                  )}
                  {incomplete && p && (
                    <View style={styles.track}>
                      {/* scaleX, not width: no layout pass per file */}
                      <View
                        style={[
                          styles.fill,
                          { transform: [{ scaleX: p.ready / p.total }] },
                        ]}
                      />
                    </View>
                  )}
                </View>
              </PressableScale>
            );
          })
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
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    ...shadow.card,
  },
  lockedRow: { opacity: 0.6 },
  chip: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chipImage: { width: 56, height: 56 },
  rowTexts: { flex: 1, gap: 2 },
  rowTitle: { ...type.title, color: colors.text, textAlign: "right" },
  rowMeta: { ...type.label, color: colors.textDim, textAlign: "right" },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    overflow: "hidden",
    marginTop: space.xs,
  },
  fill: {
    width: "100%",
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.lessons,
    transformOrigin: "left",
  },
  lockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: "rgba(255,211,72,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  lockChipText: { ...type.label, fontSize: 12, color: colors.premium },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
    gap: space.sm,
  },
  emptyTitle: { ...type.title, color: colors.text, textAlign: "center" },
  emptyText: { ...type.body, color: colors.textDim, textAlign: "center" },
});
