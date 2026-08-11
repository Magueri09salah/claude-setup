import type { IconName } from "./components/Icon";
import type { LicenceCategory } from "./db";

// Moroccan licence categories. B (car) is the app's default content; A/C/D are
// the extra sets the owner manages from the admin panel.
export const LICENCES: {
  value: LicenceCategory;
  label: string;
  short: string;
  icon: IconName;
}[] = [
  { value: "B", label: "سيارة", short: "B", icon: "car" },
  { value: "A", label: "دراجة نارية", short: "A", icon: "moto" },
  { value: "C", label: "شاحنة", short: "C", icon: "truck" },
  { value: "D", label: "حافلة", short: "D", icon: "bus" },
];

/** Screen title for each licence's series list. */
export const LICENCE_TITLE: Record<LicenceCategory, string> = {
  B: "سلاسل الامتحان",
  A: "سلاسل الدراجة النارية",
  C: "سلاسل الشاحنة",
  D: "سلاسل الحافلة",
};

export function licence(value: LicenceCategory) {
  return LICENCES.find((l) => l.value === value) ?? LICENCES[0]!;
}
