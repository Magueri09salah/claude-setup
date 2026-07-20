import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_TTL_SEC, type StorageService } from "./index";

export class R2Storage implements StorageService {
  readonly kind = "r2" as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(cfg: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    this.bucket = cfg.bucket;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        ((e as { name?: string }).name === "NotFound" ||
          (e as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode === 404)
      ) {
        return false;
      }
      throw e;
    }
  }

  getSignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: SIGNED_URL_TTL_SEC },
    );
  }
}
