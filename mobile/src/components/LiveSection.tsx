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

const RING_HOME = 132;
const RING_PAGE = 156;
/** Height of one of the four buttons in the cluster. */
const QUADRANT = 104;
/** The opaque disc the ring sits on — a little wider, so it reads as a gap. */
const holeSize = (ring: number) => ({
  width: ring + 16,
  height: ring + 16,
  borderRadius: (ring + 16) / 2,
});

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

// Where a button sits in the 2×2 cluster. Its content hugs the OUTER corner so
// the countdown circle in the middle never sits on top of an icon or a label.
const CORNERS = ["tl", "tr", "bl", "br"] as const;
type Corner = (typeof CORNERS)[number];

function PlatformButton({
  link,
  blinking,
  corner,
}: {
  link: LivePlatformLink;
  blinking: boolean;
  /** Omitted = the plain flow layout used when there aren't exactly 4 links. */
  corner?: Corner;
}) {
  const opacity = useBlink(blinking);
  const tint = brandColor(link.platform);

  return (
    <Animated.View
      style={[corner ? styles.quadrantWrap : styles.buttonWrap, { opacity }]}
    >
      <PressableScale
        onPress={() => open(link.url)}
        style={[
          styles.button,
          corner ? styles.quadrant : null,
          corner ? styles[corner] : null,
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
  const ringSize = variant === "page" ? RING_PAGE : RING_HOME;
  // The sketch: the four platforms as a 2×2 block with the countdown sitting in
  // the middle of them. Only possible with all four — with fewer the circle
  // would cover a button, so those fall back to ring-above-buttons.
  const clustered = settings.platforms.length === 4;

  const centre = settings.isLive ? (
    <View style={[styles.centreHole, holeSize(ringSize), styles.liveHole]}>
      <LiveDot />
      <Text style={styles.liveHoleText}>مباشر الآن</Text>
    </View>
  ) : (
    <View style={[styles.centreHole, holeSize(ringSize)]}>
      <CountdownRing
        remainingFraction={c.remainingFraction}
        value={clockLabel(c)}
        caption="حتى البث"
        size={ringSize}
      />
    </View>
  );

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

      <Text style={styles.hint}>
        {settings.isLive
          ? "اختر المنصة التي تريد المشاهدة عليها"
          : `كل يوم على الساعة ${timeLabel(settings.startTime)} — اختر منصتك`}
      </Text>

      {clustered ? (
        <View style={styles.cluster}>
          {/* Two explicit rows of two. A wrapping grid put all four side by
              side on a tablet, and the circle then covered the middle pair. */}
          <View style={styles.clusterRows}>
            {[0, 1].map((row) => (
              <View key={row} style={styles.clusterRow}>
                {settings.platforms.slice(row * 2, row * 2 + 2).map((link, i) => (
                  <PlatformButton
                    key={link.platform}
                    link={link}
                    blinking={alerting}
                    corner={CORNERS[row * 2 + i]}
                  />
                ))}
              </View>
            ))}
          </View>
          {/* Overlaid, and opaque: it punches a circular hole out of the block
              and swallows taps, so nudging the clock never opens a platform. */}
          <View style={styles.centreLayer} pointerEvents="box-none">
            {centre}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.ringRow}>{centre}</View>
          <View style={styles.grid}>
            {settings.platforms.map((link) => (
              <PlatformButton key={link.platform} link={link} blinking={alerting} />
            ))}
          </View>
        </>
      )}
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
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

  // — 2×2 cluster with the countdown in the middle —
  // Two rows of QUADRANT-tall buttons always out-measure the disc, so the
  // circle never dictates the block's height. Width-capped: stretched across a
  // tablet the four buttons drift away from the circle in the middle.
  cluster: {
    justifyContent: "center",
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  clusterRows: { gap: space.sm },
  clusterRow: { flexDirection: "row", gap: space.sm },
  quadrantWrap: { flex: 1, height: QUADRANT },
  quadrant: {
    flex: 1,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    // Outer corners round, inner corners square, so the four read as one block
    // with the circle cut out of its centre.
    borderRadius: radius.sm,
  },
  tl: { alignItems: "flex-start", justifyContent: "flex-start", borderTopLeftRadius: radius.lg },
  tr: { alignItems: "flex-end", justifyContent: "flex-start", borderTopRightRadius: radius.lg },
  bl: { alignItems: "flex-start", justifyContent: "flex-end", borderBottomLeftRadius: radius.lg },
  br: { alignItems: "flex-end", justifyContent: "flex-end", borderBottomRightRadius: radius.lg },
  centreLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centreHole: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  liveHole: { gap: space.xs, borderWidth: 2, borderColor: colors.danger },
  liveHoleText: { fontFamily: font.extraBold, fontSize: 15, color: colors.danger },
});
