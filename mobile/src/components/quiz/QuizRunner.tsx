import { router, useFocusEffect } from "expo-router";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { preloadInterstitial, showInterstitial } from "@/ads/interstitial";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
import { ImageViewer } from "@/components/ImageViewer";
import { ZoomableImage } from "@/components/ZoomableImage";
import { AnswerSlots } from "@/components/quiz/AnswerSlots";
import { AnswerZone } from "@/components/quiz/AnswerZone";
import { TimerPill } from "@/components/quiz/TimerPill";
import { TimerSheet } from "@/components/quiz/TimerSheet";
import { useQuizEngine, type QuizSource } from "@/quiz/useQuizEngine";
import { useResponsive } from "@/theme/useResponsive";
import { colors, font, radius, space, type } from "@/theme/tokens";
import { ScreenBackground } from "../ScreenBackground";

// Shared quiz UI for both a normal series and the random mock exam.
export function QuizRunner({ source }: { source: QuizSource }) {
  const quiz = useQuizEngine(source);
  const { phase, question, index, total, attemptId, paused, audioFinished } =
    quiz;

  const { isWide } = useResponsive();
  // Landscape on a notched phone puts the home indicator and the camera cutout
  // right where the ✓ button and the rail live — without these the column was
  // clipped at the bottom.
  const insets = useSafeAreaInsets();
  const [timerSheet, setTimerSheet] = useState(false);
  const [viewer, setViewer] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  // One reusable player for the whole quiz; swap the source per question.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(null);
      playerRef.current = player;
    } catch {
      playerRef.current = null;
    }
    return () => {
      playerRef.current = null;
      try {
        // pause() first: releasing alone does not reliably cut playback that is
        // already in flight, which left the question audio running after the
        // screen was gone.
        player?.pause();
        player?.remove();
      } catch {
        // already released
      }
    };
  }, []);

  // Leaving the screen (back, or anything pushed on top) must silence it, even
  // while the component stays mounted in the navigator.
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          playerRef.current?.pause();
        } catch {
          // ignore
        }
      };
    }, []),
  );

  // Autoplay the current question's audio from its LOCAL path, and tell the
  // engine when it ends — the countdown only starts after the reading.
  useEffect(() => {
    const player = playerRef.current;
    // No audio at all: nothing to wait for, start the timer immediately.
    if (!player || !question?.audioPath) {
      audioFinished();
      return;
    }
    try {
      player.replace({ uri: question.audioPath });
      player.seekTo(0);
      player.play();
    } catch {
      // The quiz must not stall on a missing or corrupt file.
      audioFinished();
    }
  }, [question?.id, question?.audioPath, audioFinished]);

  // expo-audio has no "ended" callback on the imperative player, so poll the
  // status while a question is being read. Cheap: it stops as soon as the
  // reading is done, and the interval is idle for the rest of the question.
  useEffect(() => {
    if (phase !== "playing" || !quiz.waitingForAudio) return;
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) {
        audioFinished();
        return;
      }
      try {
        const { currentTime, duration, playing } = player;
        // duration is 0 until the file is loaded — don't call it finished then.
        if (duration > 0 && !playing && currentTime >= duration - 0.15) {
          audioFinished();
        }
      } catch {
        audioFinished();
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, quiz.waitingForAudio, question?.id, audioFinished]);

  const replay = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // ignore
    }
  };

  // Fetch the end-of-series ad now, while the candidate is still answering.
  // Loading one takes a few seconds; asking for it at the finish line would
  // mean either a stall or no ad at all.
  useEffect(() => {
    preloadInterstitial();
  }, []);

  // When finished, hand off to results — behind the ad.
  useEffect(() => {
    if (phase !== "finished" || !attemptId) return;
    let alive = true;
    // showInterstitial never rejects and never waits long when nothing is
    // ready, so the result is at most a short beat behind the last answer.
    void showInterstitial().then(() => {
      // Guard the navigation, not the ad: the user can back out while the ad
      // is up, and replacing the route after that would drag them into a
      // results screen they had already left.
      if (alive) router.replace(`/results?attemptId=${attemptId}`);
    });
    return () => {
      alive = false;
    };
  }, [phase, attemptId]);

  if (phase === "empty") {
    return (
      <ScreenBackground style={styles.centered}>
        <Text style={styles.emptyTitle}>لا توجد أسئلة محمّلة</Text>
        <Text style={styles.emptyText}>
          عد إلى الرئيسية واضغط "تحديث" عند توفر الإنترنت لتحميل الأسئلة.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>رجوع</Text>
        </Pressable>
      </ScreenBackground>
    );
  }

  if (phase === "finished" || !question) {
    // Used to flash by. Now the ad sits in front of the results, so this can
    // hold for a beat and needs to look like work, not like a hang.
    return (
      <ScreenBackground style={styles.centered}>
        <ActivityIndicator color={colors.series} />
      </ScreenBackground>
    );
  }

  const overlays = (
    <>
      <TimerSheet visible={timerSheet} onClose={() => setTimerSheet(false)} />
      <ImageViewer
        uri={question.imagePath}
        visible={viewer}
        onClose={() => setViewer(false)}
      />
    </>
  );

  /* ---------------------------- LANDSCAPE ----------------------------
     Three bands, exactly like the exam terminal the owner referenced:
     a left rail of non-answer controls · header + picture · answer column.
     Everything is sized from the space that is actually available, so nothing
     can spill off the screen the way fixed heights did.                     */
  if (isWide) {
    return (
      <ScreenBackground style={styles.screen}>
        <View
          style={[
            styles.landscape,
            {
              paddingTop: Math.max(insets.top, space.sm),
              paddingBottom: Math.max(insets.bottom, space.sm),
              paddingLeft: Math.max(insets.left, space.sm),
              paddingRight: Math.max(insets.right, space.sm),
            },
          ]}
        >
          <View style={styles.rail}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={styles.railButton}
              accessibilityLabel="خروج"
            >
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
            {/* Pause freezes the countdown only, so it has nothing to do when
                the candidate turned the timer off. */}
            {quiz.timed && (
              <Pressable
                onPress={quiz.togglePause}
                hitSlop={8}
                style={[styles.railButton, paused && styles.railButtonOn]}
                accessibilityLabel={paused ? "استئناف" : "إيقاف مؤقت"}
              >
                <Icon
                  name={paused ? "play" : "pause"}
                  size={22}
                  color={paused ? colors.onAccent : colors.text}
                />
              </Pressable>
            )}
            <Pressable
              onPress={replay}
              hitSlop={8}
              style={styles.railButton}
              accessibilityLabel="إعادة الصوت"
            >
              <Icon name="volume" size={22} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => setTimerSheet(true)}
              hitSlop={8}
              style={styles.railButton}
              accessibilityLabel="إعدادات المؤقت"
            >
              <Icon name="timer" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.middle}>
            <View style={styles.headerStrip}>
              <TimerPill
                seconds={quiz.timeLeft}
                total={quiz.questionSeconds}
                off={!quiz.timed}
                onPress={() => setTimerSheet(true)}
              />
              {quiz.timed && quiz.waitingForAudio && (
                <Icon name="volume" size={15} color={colors.textDim} />
              )}
              <Text style={styles.stripTitle} numberOfLines={1}>
                {source.title}
              </Text>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {index + 1} / {total}
                </Text>
              </View>
            </View>

            <View style={styles.stage}>
              {question.imagePath ? (
                <>
                  <ZoomableImage
                    uri={question.imagePath}
                    resetKey={question.id}
                    style={styles.fill}
                  />
                  <Pressable
                    onPress={() => setViewer(true)}
                    hitSlop={8}
                    style={styles.zoomBadge}
                    accessibilityRole="button"
                    accessibilityLabel="عرض الصورة بملء الشاشة"
                  >
                    <Icon name="zoom" size={16} color={colors.text} />
                  </Pressable>
                </>
              ) : (
                <View style={[styles.fill, styles.imagePlaceholder]}>
                  <Text style={styles.placeholderText}>لا توجد صورة</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.answerColumn}>
            <AnswerSlots
              answersCount={question.answersCount}
              selected={quiz.selected}
              compact
            />
            <AnswerZone
              answersCount={question.answersCount}
              selected={quiz.selected}
              onToggle={quiz.toggle}
              onConfirm={quiz.confirm}
              onSkip={quiz.skip}
              vertical
            />
          </View>
        </View>
        {overlays}
      </ScreenBackground>
    );
  }

  /* ----------------------------- PORTRAIT ----------------------------- */
  return (
    <ScreenBackground style={styles.screen}>
      <View
        style={[styles.topBar, { marginTop: Math.max(insets.top, space.md) }]}
      >
        {/* Three zones, the two outer ones the SAME width (flex: 1), so the
            badge between them lands on the true screen centre. The previous
            version stretched it absolutely across the whole row and centred it
            there, which put it underneath the control pills — they reach past
            the middle, so they were drawn straight through it (owner report
            2026-09-16). */}
        <View style={styles.topSide}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <BrandLogo size={34} />

        {/* Icon only. Carrying their Arabic labels these two pills measured
            about 200pt together, and that — not the badge — is what left no
            room in the middle. The icons say the same thing; the words move to
            accessibilityLabel, so a screen reader still announces them. */}
        <View style={[styles.topSide, styles.topActions]}>
          {quiz.timed && (
            <Pressable
              onPress={quiz.togglePause}
              hitSlop={10}
              style={[styles.pill, paused && styles.pillActive]}
              accessibilityRole="button"
              accessibilityLabel={paused ? "استئناف" : "إيقاف مؤقت"}
            >
              <Icon
                name={paused ? "play" : "pause"}
                size={18}
                color={paused ? colors.onAccent : colors.text}
              />
            </Pressable>
          )}
          <Pressable
            onPress={replay}
            hitSlop={10}
            style={styles.pill}
            accessibilityRole="button"
            accessibilityLabel="إعادة الاستماع"
          >
            <Icon name="volume" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.rule} />

      <View style={styles.statusRow}>
        <TimerPill
          seconds={quiz.timeLeft}
          total={quiz.questionSeconds}
          off={!quiz.timed}
          onPress={() => setTimerSheet(true)}
        />
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {index + 1} / {total}
          </Text>
        </View>
      </View>

      {/* A frozen clock looks broken unless you say why it is frozen. Only
          relevant while there IS a clock. It explains the timer, so it belongs
          INSIDE the status band — above the rule, not below it. */}
      {quiz.timed && quiz.waitingForAudio && (
        <View style={styles.hintRow}>
          <Icon name="volume" size={13} color={colors.textDim} />
          <Text style={styles.hintText}>يبدأ العد بعد انتهاء قراءة السؤال</Text>
        </View>
      )}

      <View style={styles.rule} />

      {/* Series name only — the counter already sits in the status row above,
          and printing it twice just added noise. */}
      <View style={styles.caption}>
        <Text style={styles.captionTitle} numberOfLines={1}>
          {source.title}
        </Text>
      </View>

      <View style={styles.rule} />

      <View style={styles.imageWrap}>
        {question.imagePath ? (
          <>
            <ZoomableImage
              uri={question.imagePath}
              resetKey={question.id}
              style={styles.fill}
            />
            <Pressable
              onPress={() => setViewer(true)}
              hitSlop={8}
              style={styles.zoomBadge}
              accessibilityRole="button"
              accessibilityLabel="عرض الصورة بملء الشاشة"
            >
              <Icon name="zoom" size={16} color={colors.text} />
            </Pressable>
          </>
        ) : (
          <View style={[styles.fill, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>لا توجد صورة</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.answerArea,
          // The app draws edge to edge, so the system navigation bar was
          // sitting ON TOP of the number row and the checkmark column
          // (owner report 2026-09-15).
          { paddingBottom: Math.max(insets.bottom, space.sm) + space.sm },
        ]}
      >
        <AnswerSlots
          answersCount={question.answersCount}
          selected={quiz.selected}
        />
        <AnswerZone
          answersCount={question.answersCount}
          selected={quiz.selected}
          onToggle={quiz.toggle}
          onConfirm={quiz.confirm}
          onSkip={quiz.skip}
        />
      </View>

      {overlays}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: space.md,
  },

  /* ---------------- landscape ---------------- */
  landscape: { flex: 1, flexDirection: "row", gap: space.sm },
  // Non-answer controls, out of the way of the picture.
  rail: {
    width: 52,
    justifyContent: "flex-start",
    gap: space.sm,
  },
  railButton: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  railButtonOn: { backgroundColor: colors.lessons },
  middle: { flex: 1, gap: space.sm },
  headerStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 40,
  },
  stripTitle: {
    flex: 1,
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
  },
  // The picture takes every point the header and rail do not.
  stage: { flex: 1 },
  fill: { flex: 1, width: "100%" },
  answerColumn: { width: 150, gap: space.sm },

  /* ---------------- portrait ---------------- */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: space.lg,
  },
  // The two shoulders of the row. Equal width is the whole point: it is what
  // makes the badge between them sit on the screen centre rather than in the
  // middle of whatever space the buttons happened to leave.
  topSide: { flex: 1, flexDirection: "row", alignItems: "center" },
  // Separates the three header bands (owner decision 2026-09-15). Full-bleed,
  // like the picture under it, so the header reads as one block.
  rule: { height: 1, backgroundColor: colors.divider },
  // Row direction comes from topSide; this only pushes the buttons out to the
  // far edge so the gap opens up next to the badge.
  topActions: { justifyContent: "flex-end", gap: space.sm },
  // Square now that the label is gone: a pill-shaped box around a lone icon is
  // just a circle with dead space on either side of it.
  pill: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: colors.lessons },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  hintText: { ...type.label, fontSize: 12, color: colors.textDim },
  // Controls/counter LEFT, Arabic title right-aligned (ui-design §5).
  caption: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  captionCount: { fontFamily: font.bold, fontSize: 13, color: colors.textDim },
  captionTitle: {
    flex: 1,
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
  },
  // No fixed aspect ratio: a 3:4 box around a landscape photo left huge empty
  // bands. The picture now takes all the height that is going, and the framing
  // is gone so any remaining letterbox is invisible against the screen.
  // FULL-BLEED (owner decision 2026-09-15): no side margin and no corner
  // radius. Exam photos carry small Arabic text, so every point of width is a
  // point the candidate does not have to pinch for, and a rounded corner on a
  // screen-wide picture only clips it.
  imageWrap: {
    flex: 1,
    overflow: "hidden",
  },
  // Tucked right under the picture, so the eye goes photo -> numbers with no
  // gap and the row sits well above the system bar.
  answerArea: {
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },

  /* ---------------- shared ---------------- */
  chip: {
    paddingHorizontal: space.md,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontFamily: font.bold, fontSize: 14, color: colors.text },
  imagePlaceholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  placeholderText: { ...type.label, color: colors.textDim },
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
  emptyTitle: { ...type.title, color: colors.text, textAlign: "center" },
  emptyText: { ...type.body, color: colors.textDim, textAlign: "center" },
  emptyButton: {
    marginTop: space.md,
    paddingHorizontal: space.xl,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.series,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: { fontFamily: font.bold, fontSize: 16, color: colors.onAccent },
});
