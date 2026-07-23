import type { Series } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";
import { storage } from "../src/storage";

// Smallest valid WebP (1x1, VP8L). Real question images come via admin upload.
const PLACEHOLDER_WEBP = Buffer.from(
  "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
  "base64",
);

// MPEG-1 Layer III, 128kbps, 44.1kHz, mono frames with silent payload.
function silentMp3(frames = 50): Buffer {
  const frame = Buffer.alloc(417);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0xc4;
  return Buffer.concat(Array.from({ length: frames }, () => frame));
}

async function main() {
  await prisma.contentVersion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, version: 1 },
  });

  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL ?? "admin@driving.local"
  ).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
  });

  const seriesSpecs = [
    { orderNum: 1, title: "السلسلة الأولى", isPremium: false },
    { orderNum: 2, title: "السلسلة الثانية", isPremium: true },
  ];
  const series: Series[] = [];
  for (const spec of seriesSpecs) {
    const existing = await prisma.series.findFirst({
      where: { orderNum: spec.orderNum },
    });
    series.push(existing ?? (await prisma.series.create({ data: spec })));
  }

  const questionSpecs = [
    { seriesIdx: 0, orderNum: 1, correctAnswers: [1] },
    { seriesIdx: 0, orderNum: 2, correctAnswers: [2, 3] },
    { seriesIdx: 0, orderNum: 3, correctAnswers: [4] },
    { seriesIdx: 1, orderNum: 1, correctAnswers: [1, 2] },
    { seriesIdx: 1, orderNum: 2, correctAnswers: [3] },
  ];
  const mp3 = silentMp3();
  for (const spec of questionSpecs) {
    const parent = series[spec.seriesIdx]!;
    const imageKey = `questions/${parent.id}/${spec.orderNum}.webp`;
    const audioKey = `questions/${parent.id}/${spec.orderNum}.mp3`;
    await storage.put(imageKey, PLACEHOLDER_WEBP, "image/webp");
    await storage.put(audioKey, mp3, "audio/mpeg");
    await prisma.question.upsert({
      where: {
        seriesId_orderNum: { seriesId: parent.id, orderNum: spec.orderNum },
      },
      update: { correctAnswers: spec.correctAnswers, imageKey, audioKey },
      create: {
        seriesId: parent.id,
        orderNum: spec.orderNum,
        answersCount: 4,
        correctAnswers: spec.correctAnswers,
        imageKey,
        audioKey,
      },
    });
  }

  // ---- M4: lesson categories + one lesson with all 5 block types ----
  let signage = await prisma.lessonCategory.findFirst({
    where: { title: "التشوير" },
  });
  signage ??= await prisma.lessonCategory.create({
    data: { title: "التشوير", orderNum: 1, isPremium: false },
  });
  let prohibition = await prisma.lessonCategory.findFirst({
    where: { title: "علامات المنع" },
  });
  prohibition ??= await prisma.lessonCategory.create({
    data: {
      title: "علامات المنع",
      parentId: signage.id,
      orderNum: 2,
      isPremium: false,
    },
  });

  // Teaser icons for both categories (visible even when locked).
  for (const cat of [signage, prohibition]) {
    const iconKey = `lessons/icons/${cat.id}.webp`;
    await storage.put(iconKey, PLACEHOLDER_WEBP, "image/webp");
    await prisma.lessonCategory.update({
      where: { id: cat.id },
      data: { iconKey },
    });
  }

  // A lesson = a grid of sign flashcards (image + name + audio).
  let lesson = await prisma.lesson.findFirst({
    where: { categoryId: prohibition.id },
  });
  lesson ??= await prisma.lesson.create({
    data: { categoryId: prohibition.id, title: "علامات المنع", orderNum: 1 },
  });
  const existingSigns = await prisma.lessonSign.count({
    where: { lessonId: lesson.id },
  });
  if (existingSigns === 0) {
    const signSpecs = [
      "ممنوع تجاوز 60 كلم",
      "ممنوع تجاوز 80 كلم",
      "ممنوع الانعطاف نحو اليمين",
      "ممنوع الوقوف",
    ];
    let slot = 1;
    const data = [];
    for (const [i, name] of signSpecs.entries()) {
      const imageKey = `lessons/${lesson.id}/${slot++}.webp`;
      const audioKey = `lessons/${lesson.id}/${slot++}.mp3`;
      await storage.put(imageKey, PLACEHOLDER_WEBP, "image/webp");
      await storage.put(audioKey, mp3, "audio/mpeg");
      data.push({ lessonId: lesson.id, orderNum: i + 1, name, imageKey, audioKey });
    }
    await prisma.lessonSign.createMany({ data });
    // Bump the content version so already-synced phones fetch the new lessons.
    await prisma.contentVersion.upsert({
      where: { id: 1 },
      update: { version: { increment: 1 } },
      create: { id: 1, version: 1 },
    });
  }

  const signCount = await prisma.lessonSign.count({ where: { lessonId: lesson.id } });
  console.log(
    `Seeded: admin ${adminEmail}, ${series.length} series, ${questionSpecs.length} questions, 2 categories + lesson "${lesson.title}" with ${signCount} signs (storage: ${storage.kind})`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
