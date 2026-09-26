import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { idParam } from "./admin.schemas";

// المتجر — products the school sells. No cart and no stock: the candidate sees
// the pictures and the price and contacts the owner on WhatsApp. Mounted under
// the ADMIN role guard.
export const productsRouter = Router();

// Security checklist: whitelist mime types, cap the size, re-derive the
// extension server-side, never trust the client filename.
const ALLOWED_IMAGE: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Enough for a product from several angles; a bound multer can enforce. */
const MAX_IMAGES = 8;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES },
});

// Multipart fields arrive as strings, hence the coercion. NOT z.coerce.boolean()
// for the flag: that is `Boolean("false")` === true, which silently made every
// "hide this product" a no-op.
const boolField = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

const createSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().nonnegative().max(1_000_000),
  isActive: boolField.optional(),
});

const updateSchema = createSchema.partial();

/** Immutable keys: a replaced picture gets a new one so caches can't serve the old. */
async function storeImage(
  productId: number,
  file: Express.Multer.File,
): Promise<string> {
  const ext = ALLOWED_IMAGE[file.mimetype];
  if (!ext) throw new ApiError(415, "Unsupported image type — webp/png/jpg only");
  if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, "Image too large — max 5MB");
  let key = `shop/${productId}.${ext}`;
  for (let v = 2; await storage.exists(key); v++) {
    key = `shop/${productId}_v${v}.${ext}`;
  }
  await storage.put(key, file.buffer, file.mimetype);
  return key;
}

/**
 * Append files to a product's gallery, continuing its existing numbering so a
 * second upload never collides with the first.
 */
async function addImages(
  productId: number,
  files: Express.Multer.File[],
): Promise<void> {
  if (files.length === 0) return;
  const existing = await prisma.productImage.count({ where: { productId } });
  if (existing + files.length > MAX_IMAGES) {
    throw new ApiError(400, `الحد الأقصى ${MAX_IMAGES} صور لكل منتج`);
  }
  // Sequential, not Promise.all: storeImage probes for a free key, and running
  // the probes concurrently would hand two files the same one.
  let order = existing;
  for (const file of files) {
    order += 1;
    const key = await storeImage(productId, file);
    await prisma.productImage.create({ data: { productId, key, orderNum: order } });
  }
}

type ProductRow = {
  price: unknown;
  images: { id: number; key: string; orderNum: number }[];
};

async function withUrls<T extends ProductRow>(product: T) {
  const images = await Promise.all(
    [...product.images]
      .sort((a, b) => a.orderNum - b.orderNum || a.id - b.id)
      .map(async (img) => ({
        id: img.id,
        key: img.key,
        url: await storage.getSignedUrl(img.key),
      })),
  );
  return { ...product, price: Number(product.price), images };
}

const withImages = {
  images: { orderBy: { orderNum: "asc" } },
} as const;

productsRouter.get("/products", async (_req, res) => {
  const rows = await prisma.product.findMany({
    orderBy: [{ orderNum: "asc" }, { id: "asc" }],
    include: withImages,
  });
  res.json({ products: await Promise.all(rows.map(withUrls)) });
});

productsRouter.post("/products", upload.array("images", MAX_IMAGES), async (req, res) => {
  const input = createSchema.parse(req.body);
  const max = await prisma.product.aggregate({ _max: { orderNum: true } });

  const created = await prisma.product.create({
    data: {
      title: input.title,
      description: input.description?.length ? input.description : null,
      price: input.price,
      isActive: input.isActive ?? true,
      orderNum: (max._max.orderNum ?? 0) + 1,
    },
  });

  await addImages(created.id, (req.files as Express.Multer.File[]) ?? []);

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: created.id },
    include: withImages,
  });
  res.status(201).json({ product: await withUrls(product) });
});

// Text fields plus any NEW pictures. Uploading here appends to the gallery
// rather than replacing it — removing one is its own explicit call below, so a
// stray file input can never wipe the pictures already there.
productsRouter.patch("/products/:id", upload.array("images", MAX_IMAGES), async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Product not found");

  await addImages(id, (req.files as Express.Multer.File[]) ?? []);

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description.length ? input.description : null }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: withImages,
  });
  res.json({ product: await withUrls(product) });
});

productsRouter.delete("/products/:id/images/:imageId", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const imageId = idParam.parse(req.params.imageId);
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  // Checking the parent too: an id from another product must not be deletable
  // by guessing a number.
  if (!image || image.productId !== id) throw new ApiError(404, "Image not found");
  await prisma.productImage.delete({ where: { id: imageId } });
  res.status(204).end();
});

productsRouter.delete("/products/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Product not found");
  // ProductImage rows cascade with the product (see the schema).
  await prisma.product.delete({ where: { id } });
  res.status(204).end();
});
