import {
  IconBus,
  IconCar,
  IconMotorbike,
  IconTruck,
  type Icon,
} from "@tabler/icons-react";
import type { LicenceCategory } from "./api/types";

// Moroccan licence categories. B first — it is the default and holds all the
// content that existed before categories were introduced.
export const LICENCES: {
  value: LicenceCategory;
  label: string;
  short: string;
  icon: Icon;
  color: string;
}[] = [
  { value: "B", label: "سيارة", short: "B", icon: IconCar, color: "blue" },
  { value: "A", label: "دراجة نارية", short: "A", icon: IconMotorbike, color: "grape" },
  { value: "C", label: "شاحنة", short: "C", icon: IconTruck, color: "orange" },
  { value: "D", label: "حافلة", short: "D", icon: IconBus, color: "teal" },
];

export function licence(value: LicenceCategory) {
  return LICENCES.find((l) => l.value === value) ?? LICENCES[0];
}

/** e.g. "سيارة (B)" — used in dropdowns and badges. */
export function licenceLabel(value: LicenceCategory): string {
  const l = licence(value);
  return `${l.label} (${l.short})`;
}
