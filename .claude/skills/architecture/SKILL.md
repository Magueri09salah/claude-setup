---
name: architecture
description: Source of truth for the driving-app backend and data layer — full Prisma schema, API endpoint map, sync engine rules, and repo folder structure. Use before any work on /api, database models, migrations, manifest/sync logic, or when creating new endpoints or mobile SQLite tables.
---

# Architecture — Source of Truth

## Prisma schema (copy exactly; extend only via migration)

```prisma
enum Role { USER ADMIN }
enum PayMethod { ONLINE WAFACASH }
enum PayStatus { PENDING PAID FAILED EXPIRED }
enum BlockType { IMAGE TEXT LIST INFOBOX AUDIO }
enum Platform { YOUTUBE FACEBOOK TIKTOK INSTAGRAM }
enum LiveStatus { SCHEDULED LIVE ENDED CANCELLED }

model User { id String @id @default(uuid())  email String @unique  phone String? @unique
  passwordHash String  role Role @default(USER)  isPremium Boolean @default(false)
  premiumUntil DateTime?  createdAt DateTime @default(now())
  payments Payment[]  attempts Attempt[]  devices Device[] }

model Device { id String @id @default(uuid())  userId String  deviceId String
  pushToken String?  lastSeenAt DateTime
  user User @relation(fields:[userId], references:[id])
  @@unique([userId, deviceId]) }   // max 2 devices/user enforced in service layer

model Series { id Int @id @default(autoincrement())  title String  orderNum Int
  isPremium Boolean @default(true)  questions Question[] }

model Question { id Int @id @default(autoincrement())  seriesId Int  orderNum Int
  answersCount Int @default(4)  correctAnswers Json   // e.g. [2,3]
  imageKey String  audioKey String  updatedAt DateTime @updatedAt
  series Series @relation(fields:[seriesId], references:[id])
  @@unique([seriesId, orderNum]) }

model LessonCategory { id Int @id @default(autoincrement())  parentId Int?
  title String  iconKey String?  orderNum Int  isPremium Boolean @default(false)
  parent LessonCategory? @relation("Tree", fields:[parentId], references:[id])
  children LessonCategory[] @relation("Tree")  lessons Lesson[] }

model Lesson { id Int @id @default(autoincrement())  categoryId Int  title String
  orderNum Int  updatedAt DateTime @updatedAt
  category LessonCategory @relation(fields:[categoryId], references:[id])
  blocks LessonBlock[] }

model LessonBlock { id Int @id @default(autoincrement())  lessonId Int  orderNum Int
  type BlockType  payload Json  mediaKey String?
  lesson Lesson @relation(fields:[lessonId], references:[id]) }
  // payload: TEXT {text} · LIST {items[]} · INFOBOX {title,text,tone} · IMAGE/AUDIO {caption}

model Payment { id String @id @default(uuid())  userId String  method PayMethod
  amount Decimal  currency String @default("MAD")  status PayStatus @default(PENDING)
  wafacashCode String? @unique  payzoneRef String?  paidAt DateTime?
  expiresAt DateTime?  createdAt DateTime @default(now())
  user User @relation(fields:[userId], references:[id]) }

model Attempt { id String @id @default(uuid())  userId String  seriesId Int
  score Int  total Int @default(40)  passed Boolean  detailsJson Json
  finishedAt DateTime  user User @relation(fields:[userId], references:[id]) }

model ContentVersion { id Int @id @default(1)  version Int  updatedAt DateTime @updatedAt }

model LiveEvent { id String @id @default(uuid())  title String  description String?
  platform Platform  url String  scheduledAt DateTime  status LiveStatus @default(SCHEDULED)
  notifiedT15 Boolean @default(false)  notifiedAt0 Boolean @default(false)
  createdAt DateTime @default(now()) }
```

## API endpoint map

- Auth: POST `/auth/register` `/auth/login` `/auth/refresh` (JWT 15min + refresh 30d rotation)
- Content (JWT): GET `/content/manifest` (ETag from version+premiumStatus, support 304;
  filtered per user; premium items appear as locked teasers for free users, no media keys),
  GET `/content/series/:id/questions`, GET `/content/lessons/:id/blocks`,
  POST `/content/media-urls` (batch keys → signed URLs; reject premium keys for free users),
  POST `/attempts`
- Payments: POST `/payments/online/create`, POST `/payments/wafacash/create`,
  GET `/payments/:id/status`, POST `/webhooks/payzone`
- Lives: GET `/lives/upcoming` · Devices: POST `/devices/push-token`
- Admin (role guard): CRUD `/admin/{series,questions,categories,lessons,blocks,lives}`,
  POST `/admin/upload` (multipart→R2), POST `/admin/publish` (version++),
  POST `/admin/lives/:id/notify-now`, GET `/admin/users` `/admin/payments`
- Cron every minute: lives T-15 reminder push + T-0 "live now" push (Africa/Casablanca
  display, UTC storage); expire stale PENDING wafacash payments.

## Sync engine (mobile)

Triggers: cold start online · foreground (throttle 1h) · post-payment · manual button.
Flow: manifest w/ If-None-Match → 304 = done. Else: fetch rows updatedAt > last_sync;
prune local IDs absent from manifest; signed URLs in batches of 20; download via
expo-file-system with per-item `downloaded` flag (RESUMABLE); progress UI "45/120";
flip local content_version ONLY when all files are on disk. Silent-fail offline.

Mobile SQLite tables: series, questions (correct_answers JSON, image_path, audio_path),
lesson_categories, lessons, lesson_blocks (payload JSON, media_path), attempts
(details_json), meta (content_version, last_sync, premium).

## Media conventions
Question images WebP ~3:4 ≤150KB · audio MP3 mono 64kbps · R2 keys IMMUTABLE
(`questions/{seriesId}/{orderNum}.webp`; replacements get a new `_v2` key, update DB row).

## Repo layout
`/mobile/app` Expo Router routes: (auth)/login,register · (main)/index, series/…,
lessons/…, progress, payment/…, settings. `/mobile/src`: api, db, sync, quiz,
components, audio, auth. `/api/src`: modules/{auth,content,sync,payments,admin,users},
middleware, storage/r2.ts, prisma. `/admin/src/pages`: Dashboard, Series,
QuestionEditor, LessonCategories, LessonEditor, Lives, Users, Payments, Publish.
