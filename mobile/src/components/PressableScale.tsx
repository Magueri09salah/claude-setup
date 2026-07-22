import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Design-eng press feedback: RN's Pressable style-swap is an instant snap —
// there is no transition. This animates scale with a no-bounce spring
// (duration 200, dampingRatio 1) so every press visibly *moves*.
const SPRING = { duration: 200, dampingRatio: 1 } as const;

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}

export function PressableScale({
  style,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(pressedScale, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
    />
  );
}
