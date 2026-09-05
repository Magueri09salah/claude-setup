import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuestionSeconds } from "../../quiz/timerPref";
import { colors, radius, shadow, space, type } from "../../theme/tokens";
import { Icon } from "../Icon";
import { TimerChoiceList } from "./TimerChoiceList";

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Opened by tapping the timer pill mid-quiz. Night Drive, not a stock dialog:
// asphalt sheet, lane-yellow accent, tap-outside to dismiss.
export function TimerSheet({ visible, onClose }: Props) {
  const [seconds, setSeconds] = useQuestionSeconds();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // Without this an iOS Modal is PORTRAIT-ONLY: opening it in landscape
      // forced the app upright, which re-rendered the quiz as portrait while
      // the device was still sideways — the two fought and it span forever.
      supportedOrientations={["portrait", "landscape"]}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps on the sheet itself so only the backdrop closes it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Scrollable: the sheet is nearly as tall as a rotated phone, so in
              landscape it has to be able to scroll rather than clip. */}
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.headerTexts}>
              <Text style={styles.title}>إعدادات المؤقت</Text>
              <Text style={styles.subtitle}>اختر المدة المناسبة لكل سؤال</Text>
            </View>
            <View style={styles.headerIcon}>
              <Icon name="timer" size={22} color={colors.lessons} />
            </View>
          </View>

          <TimerChoiceList value={seconds} onChange={setSeconds} />

          <View style={styles.note}>
            <Icon name="alert" size={15} color={colors.textDim} />
            <Text style={styles.noteText}>
              تُطبَّق المدة الجديدة ابتداءً من السؤال التالي.
            </Text>
          </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: space.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    // Never taller than the screen it sits on.
    maxHeight: "100%",
    ...shadow.card,
  },
  sheetContent: { padding: space.lg, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  headerTexts: { flex: 1, gap: 2 },
  title: { ...type.title, color: colors.text, textAlign: "right" },
  subtitle: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "right" },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,211,72,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: space.md,
  },
  noteText: { ...type.label, fontSize: 12, color: colors.textDim, flex: 1, textAlign: "right" },
});
