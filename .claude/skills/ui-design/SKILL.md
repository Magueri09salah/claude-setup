---
name: ui-design
description: The app's complete design system — color tokens, Arabic typography, spacing, component recipes, motion, and RTL rules for a modern professional look. Use before creating or styling ANY mobile screen, component, or admin page, and when reviewing UI for consistency.
---

# Design System — "Tariq" (طريق)

Goal: feel like a modern 2026 product (Duolingo-level polish), not a dated utility app.
Clean, confident, Moroccan. Every screen must pass: would this look at home next to
Duolingo/Revolut? If not, simplify.

## 1. Design tokens (single source — put in `mobile/src/theme/tokens.ts`)

```ts
export const colors = {
  // Base — deep navy, but softer & layered (no flat #00F blue walls)
  bg:        '#0B1B3A',   // screen background
  bgSoft:    '#122650',   // elevated sections
  surface:   '#FFFFFF',   // cards
  surfaceAlt:'#F4F6FB',   // secondary cards / list rows
  // Brand accents (one accent per feature area — never mix on one card)
  exam:      '#E64545',   // سلاسل الامتحان
  lessons:   '#F5A623',   // الدروس النظرية
  series:    '#2F80ED',   // سلاسل الدروس / answer buttons
  success:   '#27AE60',   // ✓ / pass / correct
  danger:    '#EB5757',   // ✗ / fail / wrong
  premium:   '#8E5BE8',   // 🔒 premium / upsell
  // Text
  textOnDark:'#FFFFFF', textOnDarkDim:'rgba(255,255,255,0.64)',
  text:      '#101828', textDim:'#667085',
  border:    'rgba(16,24,40,0.08)',
};
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
export const space  = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const shadow = { card: { shadowColor:'#0B1B3A', shadowOpacity:0.10,
  shadowRadius:16, shadowOffset:{width:0,height:6}, elevation:5 } };
```

Background treatment: vertical gradient `bg → bgSoft` + the road-sign pattern
watermark at 5% opacity max (subtle texture, never competing with content).

## 2. Typography (Arabic-first)

Font: **Tajawal** (via expo-google-fonts). Weights 400/500/700/800.
```
display  28/800   screen titles (القائمة الرئيسية)
title    20/700   card titles, section headers
body     16/400   lesson text (lineHeight 26 — Arabic needs air)
label    14/500   captions, chips, meta
numeral  34/800   answer buttons, scores, timer
```
Rules: text always start-aligned (RTL-aware, never hardcode left/right) ·
never justify Arabic body text · numerals use Latin digits (matches exam style).

## 3. Component recipes

**Card** — surface white, radius.lg, padding space.lg, shadow.card. Feature cards
(home) = accent background + white icon chip (44px, radius.md, 20% white overlay)
+ title 20/800 white + subtitle 13/400 white 75% + chevron. Height ~112px.

**Buttons** — primary: accent bg, radius.pill, height 56, label 16/700; pressed:
scale 0.97 (reanimated spring). Answer buttons (quiz): series blue, radius.md,
numeral 34/800 white; SELECTED state: white bg + blue border 3px + blue numeral
(clear toggle affordance). Correct flash: success bg; wrong flash: danger bg.

**Quiz screen** — top bar minimal (44px icons); status row: timer pill (dark,
amber text, turns danger + gentle pulse under 10s), series chip, counter chip;
image full-width fixed 3:4 with radius.md and 1px border; answer zone bottom:
✗ column (danger, 15% tint bg, icon only) — number grid — ✓ column (success).
Columns full-height of the grid, radius.md, min touch 56px everywhere.

**Results** — hero: big score `34/40` numeral 48/800 + animated circular progress
ring (success if ≥32, danger otherwise) + verdict chip ناجح ✅ / راسب ❌.
Review list: rows with q number, mini status dot, chevron; correct rows success
10% tint, wrong rows danger 10% tint.

**Locked premium** — card at 40% saturation + 🔒 badge (premium color) + CTA chip
"افتح المحتوى الكامل". Never hide premium items from free users — tease them.

**Lesson blocks** — TEXT: body on surface card · LIST: check bullets (success) ·
INFOBOX: tinted card (tone: info=series/warn=lessons/danger) with 4px start border
· IMAGE: full-width radius.md + caption label · AUDIO: play pill with progress.

**Live banner (home)** — LIVE: danger bg, white text, pulsing dot ● + "لايف الآن";
scheduled: surface card, 📅 + countdown chip; replay: 🎬 + subdued style.

## 4. Motion (react-native-reanimated — subtle, fast)
Press scale 0.97 spring · screen transitions default Expo Router · answer feedback:
120ms color fade, no bounces · score ring: 800ms ease-out on results mount ·
timer pulse only under 10s. NOTHING animates longer than 800ms. No confetti except
first-ever pass of a series (one time, it earns it).

## 5. RTL & accessibility
I18nManager.forceRTL(true) at app entry (document the required restart) · use
start/end paddings & flex only, NEVER left/right · icons that imply direction
(chevrons, arrows) must flip · touch targets ≥ 44px, answer buttons ≥ 56px ·
contrast: textOnDarkDim only for meta, never for primary content.

## 6. Admin panel (Mantine)
Light theme, primary = series blue, Tajawal for Arabic content previews, LTR UI is
fine (admin is technical) but content preview components render RTL. Data-dense
tables > cards. Every destructive action gets a confirm modal.

## 7. Consistency checklist (run mentally on every new screen)
tokens only (no hex literals in components) · one accent per surface · spacing from
the scale only · shadows only via shadow.card · every state designed: loading
(skeleton, not spinner), empty, error, offline, locked.
