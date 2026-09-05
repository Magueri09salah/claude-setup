import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { idParam } from "./admin.schemas";

// المتجر — products the school sells. No cart and no stock: the candidate sees
// the picture and the price and contacts the owner on WhatsApp. Mounted under
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
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

async function withUrl<T extends { imageKey: string | null; price: unknown }>(
  product: T,
) {
  return {
    ...product,
    price: Number(product.price),
    imageUrl: product.imageKey ? await storage.getSignedUrl(product.imageKey) : null,
  };
}

productsRouter.get("/products", async (_req, res) => {
  const rows = await prisma.product.findMany({
    orderBy: [{ orderNum: "asc" }, { id: "asc" }],
  });
  res.json({ products: await Promise.all(rows.map(withUrl)) });
});

productsRouter.post("/products", upload.single("image"), async (req, res) => {
  const input = createSchema.parse(req.body);
  const max = await prisma.product.aggregate({ _max: { orderNum: true } });

  const product = await prisma.product.create({
    data: {
      title: input.title,
      description: input.description?.length ? input.description : null,
      price: input.price,
      isActive: input.isActive ?? true,
      orderNum: (max._max.orderNum ?? 0) + 1,
    },
  });

  if (req.file) {
    const imageKey = await storeImage(product.id, req.file);
    const withImage = await prisma.product.update({
      where: { id: product.id },
      data: { imageKey },
    });
    res.status(201).json({ product: await withUrl(withImage) });
    return;
  }
  res.status(201).json({ product: await withUrl(product) });
});

productsRouter.patch("/products/:id", upload.single("image"), async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateSchema.parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Product not found");

  const imageKey = req.file ? await storeImage(id, req.file) : undefined;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description.length ? input.description : null }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(imageKey ? { imageKey } : {}),
    },
  });
  res.json({ product: await withUrl(product) });
});

productsRouter.delete("/products/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Product not found");
  await prisma.product.delete({ where: { id } });
  res.status(204).end();
});
