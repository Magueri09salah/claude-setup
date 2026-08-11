import { env } from "../env";
import { LocalStorage } from "./local";
import { R2Storage } from "./r2";

// Security checklist: signed URLs expire after 15 minutes.
export const SIGNED_URL_TTL_SEC = 15 * 60;

export interface StorageService {
  readonly kind: "r2" | "local";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /**
   * Store a file already on disk, streaming it. Videos are hundreds of MB —
   * `put` would hold the whole thing in memory. The source file is consumed
   * (moved or streamed then deleted) by the implementation.
   */
  putFile(key: string, filePath: string, contentType: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string): Promise<string>;
}

function createStorage(): StorageService {
  if (
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET
  ) {
    return new R2Storage({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
    });
  }
  console.warn(
    "[storage] R2 env vars not set — falling back to local disk storage under api/uploads (dev only)",
  );
  return new LocalStorage();
}

export const storage: StorageService = createStorage();
