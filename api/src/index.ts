import "dotenv/config";
import express from "express";
import { z } from "zod";

const env = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
  })
  .parse(process.env);

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
