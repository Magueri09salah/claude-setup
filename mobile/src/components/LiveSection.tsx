import { useEffect, useRef } from "react";
import {
  Animated,
  Linking,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import type { LivePlatformLink } from "../api/lives";
import { countdownTo, useLive, type Countdown } from "../lives/useLive";
import { colors, font, radius, shadow, space, type } from "../theme/tokens";
import { BrandIcon, brandColor, brandLabel } from "./BrandIcon";
import { CountdownRing } from "./CountdownRing";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function clockLabel(c: Countdown): string {
  return `${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;
}

/** "23:00" → "11:00 مساءً"-ish label the owner's audience reads naturally. */
function timeLabel(startTime: string): string {
  const [hh, mm] = startTime.split(":");
  return `${hh}:${mm}`;
}

const open = (url: string) => {
  void Linking.openURL(url).catch(() => undefined);
};

// Blinking is the whole point of the alert ("clignote when the live is ready"),
// so it runs only while it means something — on air, or in the last minutes
// before the start. A permanently blinking button is just noise.
function useBlink(active: boolean): Animated.Value {
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      value.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 0.35,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, value]);
  return value;
}

function PlatformButton({
  link,
  blinking,
}: {
  link: LivePlatformLink;
  blinking: boolean;
}) {
  const opacity = useBlink(blinking);
  const tint = brandColor(link.platform);

  return (
    <Animated.View style={[styles.buttonWrap, { opacity }]}>
      <PressableScale
        onPress={() => open(link.url)}
        style={[
          styles.button,
          blinking ? ({ borderColor: tint } as ViewStyle) : null,
        ]}
        accessibilityLabel={`مشاهدة البث على ${brandLabel(link.platform)}`}
      >
        <BrandIcon platform={link.platform} size={26} />
        <Text style={styles.buttonLabel}>{brandLabel(link.platform)}</Text>
      </PressableScale>
    </Animated.View>
  );
}

interface Props {
  /** Home shows a compact card; the lives page shows the full block. */
  variant?: "home" | "page";
}

export function LiveSection({ variant = "home" }: Props) {
  const { settings, countdown } = useLive();

  if (!settings?.enabled || settings.platforms.length === 0) return null;

  const c = countdown ?? countdownTo(settings.nextStartAt, Date.now());
  const alerting = settings.isLive || settings.startsSoon;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon
          name="broadcast"
          size={18}
          color={settings.isLive ? colors.danger : colors.lessons}
        />
        <Text style={styles.title}>البث المباشر</Text>
      </View>

      {settings.isLive ? (
        <View style={styles.liveNow}>
          <LiveDot />
          <Text style={styles.liveNowText}>البث مباشر الآن</Text>
        </View>
      ) : (
        <View style={styles.ringRow}>
          <CountdownRing
            remainingFraction={c.remainingFraction}
            value={clockLabel(c)}
            caption="حتى البث"
            size={variant === "page" ? 156 : 132}
          />
        </View>
      )}

      <Text style={styles.hint}>
        {settings.isLive
          ? "اختر المنصة التي تريد المشاهدة عليها"
          : `كل يوم على الساعة ${timeLabel(settings.startTime)} — اختر منصتك`}
      </Text>

      <View style={styles.grid}>
        {settings.platforms.map((link) => (
          <PlatformButton
            key={link.platform}
            link={link}
            blinking={alerting}
          />
        ))}
      </View>
    </View>
  );
}

function LiveDot() {
  const opacity = useBlink(true);
  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  // Controls/icons LEFT, Arabic text right-aligned (see ui-design §5).
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { ...type.title, fontSize: 17, color: colors.text },
  ringRow: { alignItems: "center" },
  liveNow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  liveNowText: { fontFamily: font.extraBold, fontSize: 15, color: colors.text },
  hint: { ...type.label, color: colors.textDim, textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  // Two per row on any phone width, without measuring.
  buttonWrap: { flexGrow: 1, flexBasis: "45%" },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.md,
    alignItems: "center",
    gap: space.xs,
  },
  buttonLabel: { ...type.label, fontSize: 13, color: colors.text },
});
