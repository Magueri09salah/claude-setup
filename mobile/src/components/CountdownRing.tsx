import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, font, type } from "../theme/tokens";

interface Props {
  /** 0→1 share of the cycle still to wait; the arc shrinks as it drops. */
  remainingFraction: number;
  /** Big line, e.g. "02:14:35". */
  value: string;
  /** Small line under it, e.g. "حتى البث". */
  caption: string;
  size?: number;
  color?: string;
}

// The live repeats every day, so a full ring = 24h of waiting and the arc
// empties as the next one approaches.
export function CountdownRing({
  remainingFraction,
  value,
  caption,
  size = 132,
  color = colors.lessons,
}: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceAlt}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remainingFraction)}
          // Start the arc at 12 o'clock instead of 3.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontFamily: font.extraBold, fontSize: 22, lineHeight: 30 },
  caption: { ...type.label, fontSize: 12, color: colors.textDim },
});
