-- Cross-cutting app settings. First use: the WhatsApp number candidates contact
-- to request access, replacing the online payment flow.
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "whatsappNumber" TEXT,
    "whatsappMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppSettings" ("id", "updatedAt") VALUES (1, NOW());
