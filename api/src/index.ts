import cors from "cors";
import express from "express";
import { env } from "./env";
import { errorHandler } from "./middleware/errors";
import { adminRouter } from "./modules/admin/admin.router";
import { authRouter } from "./modules/auth/auth.router";
import { attemptsRouter } from "./modules/content/attempts.router";
import { contentRouter } from "./modules/content/content.router";
import { courseRequestsRouter } from "./modules/courses/course-requests.router";
import path from "node:path";
import { startCron } from "./modules/lives/cron";
import { devicesRouter } from "./modules/lives/devices.router";
import { livesRouter } from "./modules/lives/lives.router";
import { mockPayRouter } from "./modules/payments/mockpay.router";
import { paymentsRouter } from "./modules/payments/payments.router";
import { paymentProvider } from "./modules/payments/providers";
import { webhookRouter } from "./modules/payments/webhook.router";
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
app.use("/attempts", attemptsRouter);
app.use("/course-requests", courseRequestsRouter);
app.use("/payments", paymentsRouter);
app.use("/webhooks", webhookRouter);
app.use("/lives", livesRouter);
app.use("/devices", devicesRouter);
// Static pages (privacy policy) — hostable on the domain.
app.use("/legal", express.static(path.resolve(process.cwd(), "public")));
if (storage.kind === "local") {
  app.use("/media/local", localMediaRouter);
}
// Dev-only fake gateway page (mock provider).
if (paymentProvider.kind === "mock") {
  app.use("/mock-pay", mockPayRouter);
}

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(
    `API listening on http://localhost:${env.PORT} (storage: ${storage.kind}, payments: ${paymentProvider.kind})`,
  );
  startCron();
});
