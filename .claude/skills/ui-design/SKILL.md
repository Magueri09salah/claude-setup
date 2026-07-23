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
// Identity: "Night Drive" (owner decision, 2026-07-22). The app is طريق —
// "road" — so the design IS the road: asphalt ground, lane-paint yellow as
// the single hero accent, signal green/red semantic only.
export const colors = {
  bg:        '#141519',   // asphalt screen background
  bgSoft:    '#1B1D23',   // gradient partner
  surface:   '#22242B',   // cards (dark, 1px hairline border)
  surfaceAlt:'#2A2D35',   // inputs / placeholders
  chipBg:    'rgba(255,255,255,0.10)',
  exam:      '#4FA8F0',   // headlight blue (edge/tint only)
  lessons:   '#FFD348',   // lane-paint yellow — hero accent
  series:    '#2FBF71',   // signal green (edge/tint only)
  success:   '#2FBF71',  danger: '#E5484D',  premium: '#FFD348',
  onAccent:  '#141519', onAccentDim:'rgba(20,21,25,0.65)', // ink on accent fills
  text:      '#F2F3F5', textDim:'rgba(242,243,245,0.55)',
  border:    'rgba(255,255,255,0.07)',
};
// Cards: dark surface + hairline + 4px accent edge on the icon (left) side.
// Accent fills ONLY on primary buttons / mock-exam card (yellow + onAccent ink).
// Motion: PressableScale spring 0.97 (200ms, no bounce); answer toggles INSTANT;
// results tiles = surface + 2px green/red ring + colored numeral, 30ms stagger.
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

## 5. RTL & accessibility (owner convention, 2026-07-22)
Do NOT use I18nManager.forceRTL or direction:"rtl" (broken in Expo Go iOS,
flips icons wrong). Convention: **LTR layout, icons/chips/controls LEFT, Arabic
text right-aligned (textAlign:"right")**; controls come FIRST in JSX. No
decorative chevrons on cards (back button ‹ only). Latin inputs stay LTR-left.
Touch targets ≥ 44px, answer buttons ≥ 56px · dim text only for meta.

## 6. Admin panel (Mantine)
Light theme, primary = series blue, Tajawal for Arabic content previews, LTR UI is
fine (admin is technical) but content preview components render RTL. Data-dense
tables > cards. Every destructive action gets a confirm modal.

## 7. Consistency checklist (run mentally on every new screen)
tokens only (no hex literals in components) · one accent per surface · spacing from
the scale only · shadows only via shadow.card · every state designed: loading
(skeleton, not spinner), empty, error, offline, locked.

## 8. Lessons section (M4) — required recipes

Apply ALL of these; lessons are the most content-heavy screens and must look as
polished as the quiz.

- **Category grid** (الدروس النظرية home): full-width white cards, radius.lg,
  shadow.card, each with a colored icon chip (56px, radius.md, tinted bg of the
  category's accent at 15%) + title 20/700 + optional subtitle label + start-side
  chevron (RTL-flipped). Vertical stack, space.md gap. NOT a cramped 2-col grid
  for top-level categories — one clear tap target per row.
- **Sub-category cards** (e.g. علامات المنع under التشوير): 2-column grid,
  square-ish cards, thumbnail image top (radius.md, cover), title label below
  centered. space.md gutters. Consistent image aspect so rows never jump.
- **Lesson page — sign grid** (owner decision 2026-07-22; replaced the block/
  article renderer). A lesson is a 2-column grid of **sign flashcards**, each =
  square sign image (white bg, contain) + a ▶/⏸ play badge (dark, top corner) +
  the Arabic name centered below. Tapping a card plays its audio from the LOCAL
  path; the active card gets a lane-yellow 2px border. A leaf sub-category with a
  single lesson opens straight to its sign grid (no intermediate lesson list).
- **Offline/empty**: if a lesson has no signs yet → friendly empty state card, not
  a blank screen.
- **Checklist**: tokens only, one accent per surface, tested in RTL with real
  Arabic sign names + working audio before calling it done.
