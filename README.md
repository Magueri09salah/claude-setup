# Moroccan Driving Education App

Driving-license exam prep app for Morocco (Arabic/Darija, RTL-first). Monorepo with three packages:

| Package | Stack | Purpose |
| --- | --- | --- |
| [api](api/) | Express + TypeScript + Prisma + PostgreSQL | Backend API |
| [admin](admin/) | React + Vite + TypeScript + Mantine | Web admin panel |
| [mobile](mobile/) | Expo (React Native) + TypeScript + Expo Router | Offline-first mobile app |

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ — only needed for `prisma migrate` in M1; the API skeleton boots without a database
- For mobile: Expo Go on a phone, or an Android/iOS emulator

## First-time setup

Each package has its own `node_modules` — install all three:

```sh
cd api && npm install
cd admin && npm install
cd mobile && npm install
```

Copy env templates (each package keeps a `.env.example` up to date):

```sh
cp api/.env.example api/.env
cp admin/.env.example admin/.env
cp mobile/.env.example mobile/.env
```

## Run

| What | Command | Where |
| --- | --- | --- |
| API dev server | `cd api && npm run dev` | http://localhost:4000/health |
| Admin panel | `cd admin && npm run dev` | http://localhost:5173 |
| Mobile (Expo) | `cd mobile && npx expo start` | QR code → Expo Go, or press `a`/`w` |
| DB migration | `cd api && npx prisma migrate dev` | needs `DATABASE_URL` in `api/.env` |
| Typecheck all | `npm run typecheck` | repo root |
