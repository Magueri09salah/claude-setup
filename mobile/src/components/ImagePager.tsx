import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius, space } from "../theme/tokens";
import { Icon } from "./Icon";

interface Props {
  /** Every picture, in display order. */
  uris: string[];
  /** Which one to open on. */
  startIndex: number;
  visible: boolean;
  onClose: () => void;
}

/**
 * Fullscreen pager for a set of pictures: swipe sideways to move between them
 * (owner request 2026-09-26).
 *
 * An absolutely positioned OVERLAY, not a Modal. It is opened from inside the
 * shop's detail sheet, which is itself a Modal — and a second Modal cannot be
 * stacked on a presented one on iOS. Rendered outside the sheet it silently
 * appeared behind it (owner report 2026-09-28: "I click the image and nothing
 * happens"); rendered inside it as a Modal, iOS may refuse to present it at
 * all. A plain absolute-fill View has neither problem, and its parent already
 * covers the screen.
 *
 * A paging ScrollView rather than the pinch-zoom ImageViewer: these are product
 * photos being browsed, not exam pictures with small print being examined, and
 * a horizontal swipe is the gesture people already expect from a gallery. The
 * two would also fight each other — a pan to zoom and a swipe to page are the
 * same finger movement.
 */
export function ImagePager({ uris, startIndex, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(startIndex);

  // Jump to the tapped picture when the pager opens. Without the width guard
  // the offset is computed before layout and lands on 0 every time.
  useEffect(() => {
    if (!visible || width === 0) return;
    setIndex(startIndex);
    // No animation: this is the opening position, not a movement.
    scroller.current?.scrollTo({ x: startIndex * width, animated: false });
  }, [visible, startIndex, width]);

  if (!visible || uris.length === 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Position on layout as well as in the effect. The effect can run
        // before the ScrollView has measured — especially on Android, where
        // this lives in a dialog window — and a scrollTo before layout is
        // silently dropped, landing on picture 1 whichever one was tapped.
        // Scrolling to the CURRENT index rather than startIndex also keeps
        // your place when the phone is rotated.
        onLayout={() =>
          scroller.current?.scrollTo({ x: index * width, animated: false })
        }
        // Rounding, not flooring: a swipe that settles a pixel short of the
        // boundary still counts as having arrived.
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {uris.map((uri) => (
          <View key={uri} style={{ width, height }}>
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit="contain"
              transition={150}
            />
          </View>
        ))}
      </ScrollView>

      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={[styles.close, { top: Math.max(insets.top, space.md) }]}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
      >
        <Icon name="close" size={24} color={colors.text} />
      </Pressable>

      {uris.length > 1 && (
        <View
          style={[
            styles.counter,
            { bottom: Math.max(insets.bottom, space.md) + space.md },
          ]}
        >
          <Text style={styles.counterText}>
            {index + 1} / {uris.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Plain black, not the Night Drive gradient: nothing should compete with the
  // picture in a fullscreen viewer.
  screen: { backgroundColor: "#000000" },
  // Explicit size, not flex. A page View sized only by the ScrollView's
  // cross-axis stretch plus an image at flex:1 is the same trap that made the
  // quiz answer buttons collapse to zero height: flex:1 means flexBasis 0 on
  // the main axis, which is vertical here.
  image: { width: "100%", height: "100%" },
  close: {
    position: "absolute",
    left: space.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,25,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,25,0.6)",
  },
  counterText: { fontFamily: font.bold, fontSize: 14, color: colors.text },
});
