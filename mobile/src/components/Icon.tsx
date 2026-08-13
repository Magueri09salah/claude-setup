import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { StyleProp, TextStyle } from "react-native";
import { colors } from "../theme/tokens";

// ONE icon family for the whole app (MaterialCommunityIcons — best coverage for
// the driving domain). Screens reference SEMANTIC names, never raw glyph names,
// so the set can be swapped in one place. Never use emoji as a structural icon.
const MAP = {
  // navigation
  home: "home-variant",
  lessons: "book-open-variant",
  progress: "chart-line",
  settings: "cog",
  back: "chevron-right", // RTL: "back" points right
  forward: "chevron-left",
  close: "close",
  logout: "logout",
  refresh: "refresh",
  // features
  exam: "traffic-light",
  car: "car",
  trophy: "trophy",
  sign: "sign-caution",
  // Licence categories (Morocco): A = دراجة نارية, D = حافلة, C = شاحنة
  moto: "motorbike",
  bus: "bus",
  truck: "truck",
  // lives
  bell: "bell",
  broadcast: "broadcast",
  calendar: "calendar-clock",
  replay: "movie-open",
  satellite: "satellite-variant",
  // payments / premium
  lock: "lock",
  unlock: "lock-open-variant",
  card: "credit-card-outline",
  store: "storefront",
  star: "star",
  // state
  check: "check",
  checkCircle: "check-circle",
  closeCircle: "close-circle",
  alert: "alert-circle",
  // timer
  bolt: "lightning-bolt",
  clockFast: "clock-fast",
  clock: "clock-outline",
  timer: "timer-outline",
  // decorative road-sign wallpaper (ScreenBackground)
  signWarn: "sign-caution",
  signStop: "octagon-outline",
  signLight: "traffic-light-outline",
  signRoad: "road-variant",
  signCone: "traffic-cone",
  signDirection: "sign-direction",
  // image viewer
  rotate: "phone-rotate-landscape",
  zoomReset: "fit-to-screen-outline",
  zoom: "magnify-expand",
  // media
  video: "play-box-multiple",
  play: "play",
  pause: "pause",
  volume: "volume-high",
  document: "file-document-outline",
} as const;

export type IconName = keyof typeof MAP;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 20, color = colors.text, style }: Props) {
  return (
    <MaterialCommunityIcons
      name={MAP[name]}
      size={size}
      color={color}
      style={style}
    />
  );
}
