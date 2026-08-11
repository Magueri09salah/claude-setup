import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors } from "../../theme/tokens";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props {
  /** 0→1 share of the audio already played. */
  progress: number;
  /** Draw the border at all — inactive cards show nothing. */
  active: boolean;
  radius: number;
  strokeWidth?: number;
  color?: string;
  /** ms between progress updates; the fill eases over exactly this long. */
  stepMs?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

// The active sign card's border doubles as its audio scrubber: it draws itself
// around the card as the explanation plays, so the card shows how much is left
// without adding a separate progress bar (owner request 2026-08-07).
export function ProgressBorder({
  progress,
  active,
  radius,
  strokeWidth = 3,
  color = colors.lessons,
  stepMs = 100,
  style,
  children,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const anim = useRef(new Animated.Value(0)).current;

  // Status arrives in discrete ticks; easing between them over one tick turns
  // 10 updates/second into a continuous sweep.
  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }
    const target = Math.max(0, Math.min(1, progress));
    const animation = Animated.timing(anim, {
      toValue: target,
      duration: stepMs,
      useNativeDriver: false, // strokeDashoffset is not a native prop
    });
    animation.start();
    return () => animation.stop();
  }, [progress, active, anim, stepMs]);

  const inset = strokeWidth / 2;
  const w = Math.max(0, size.w - strokeWidth);
  const h = Math.max(0, size.h - strokeWidth);
  const r = Math.max(0, radius - inset);
  // Rounded-rect perimeter: the straight runs plus one full circle of corners.
  const perimeter =
    2 * Math.max(0, w - 2 * r) + 2 * Math.max(0, h - 2 * r) + 2 * Math.PI * r;

  return (
    <View
      style={style}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev.w === width && prev.h === height ? prev : { w: width, h: height },
        );
      }}
    >
      {children}
      {active && size.w > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Track: shows where the border will reach. */}
          <Rect
            x={inset}
            y={inset}
            width={w}
            height={h}
            rx={r}
            ry={r}
            fill="none"
            stroke={color}
            strokeOpacity={0.25}
            strokeWidth={strokeWidth}
          />
          <AnimatedRect
            x={inset}
            y={inset}
            width={w}
            height={h}
            rx={r}
            ry={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${perimeter} ${perimeter}`}
            strokeDashoffset={anim.interpolate({
              inputRange: [0, 1],
              outputRange: [perimeter, 0],
            })}
          />
        </Svg>
      )}
    </View>
  );
}
