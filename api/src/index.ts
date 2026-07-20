import cors from "cors";
import express from "express";
import { env } from "./env";
import { errorHandler } from "./middleware/errors";
import { adminRouter } from "./modules/admin/admin.router";
import { authRouter } from "./modules/auth/auth.router";
import { contentRouter } from "./modules/content/content.router";
import { storage } from "./storage";
import { localMediaRouter } from "./storage/local";

const app = express();

app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, storage: storage.kind });
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/content", contentRouter);
if (storage.kind === "local") {
  app.use("/media/local", localMediaRouter);
}

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(
    `API listening on http://localhost:${env.PORT} (storage: ${storage.kind})`,
  );
});
