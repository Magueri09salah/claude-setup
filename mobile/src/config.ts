import Constants from "expo-constants";

// In development the API runs on the same machine as the Metro bundler, so we
// derive its host from the dev-server address. That way switching Wi-Fi (new
// LAN IP) keeps working without editing .env — the stale-IP trap.
function devApiUrl(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)
      ?.debuggerHost;
  const host = hostUri?.split(":")[0];
  // Only a LAN IP is usable: in tunnel mode the host is an exp.direct domain
  // that proxies Metro (8081) only — the API is NOT reachable through it, so
  // fall back to the configured URL there.
  const isLanIp = !!host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  return isLanIp ? `http://${host}:4000` : null;
}

const configured = process.env.EXPO_PUBLIC_API_URL;

// Dev: follow the Metro host. Production build: use the configured URL
// (EXPO_PUBLIC_API_URL from the EAS build profile).
export const API_URL: string = __DEV__
  ? (devApiUrl() ?? configured ?? "http://localhost:4000")
  : (configured ?? "http://localhost:4000");
