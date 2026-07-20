// API base URL comes from mobile/.env (EXPO_PUBLIC_API_URL) — set it to your
// computer's LAN IP so Expo Go on a phone can reach the API. Never hardcode it.
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
