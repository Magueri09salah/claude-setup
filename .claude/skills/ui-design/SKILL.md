---
name: ui-design
description: The app's complete design system — color tokens, Arabic typography, spacing, component recipes, motion, and RTL rules for a modern professional look. Use before creating or styling ANY mobile screen, component, or admin page, and when reviewing UI for consistency.
---

# Design System — "Tariq" (طريق)

Goal: feel like a modern 2026 product (Duolingo-level polish), not a dated utility app.
Clean, confident, Moroccan. Every screen must pass: would this look at home next to
Duolingo/Revolut? If not, simplify.

## 1. Design tokens (single source — put in `mobile/src/theme/tokens.ts`)

Identity: **"Night Drive"** (owner decision, 2026-07-22; replaced Duolingo).
The app is named طريق — "road" — so the design IS the road: asphalt ground,
lane-paint yellow as the SINGLE hero accent, signal green/red semantic only.

```ts
export const colors = {
  // Base — asphalt
  bg:        '#141519',   // screen background
  bgSoft:    '#1B1D23',   // gradient partner / elevated sections
  surface:   '#22242B',   // cards
  surfaceAlt:'#2A2D35',   // inputs / secondary rows / placeholders
  chipBg:    'rgba(255,255,255,0.10)', // subtle control fill (pills, chips)
  // Feature-area accents — used as card EDGE + icon tint, NOT full backgrounds
  exam:      '#4FA8F0',   // سلاسل الامتحان — headlight blue
  lessons:   '#FFD348',   // الدروس النظرية — lane-paint yellow (hero accent)
  series:    '#2FBF71',   // سلاسل الدروس — signal green
  success:   '#2FBF71',   // ✓ / pass / correct
  danger:    '#E5484D',   // ✗ / fail / wrong
  premium:   '#FFD348',   // 🔒 premium — painted gold
  // Ink on light accent fills (yellow/green/blue buttons)
  onAccent:  '#141519', onAccentDim:'rgba(20,21,25,0.65)',
  // Text on asphalt / dark surfaces
  text:      '#F2F3F5', textDim:'rgba(242,243,245,0.55)',
  border:    'rgba(255,255,255,0.07)',
};
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };
export const space  = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const shadow = { card: { shadowColor:'#000', shadowOpacity:0.35,
  shadowRadius:18, shadowOffset:{width:0,height:6}, elevation:6 } };
```

Rules: cards are dark `surface` with 1px `border` hairline and a **4px accent
edge on the icon (left) side** — the road-sign post. Accents fill a background
ONLY on primary buttons and the mock-exam card (lane yellow + `onAccent` ink).
Answer buttons: `surface` + hairline; SELECTED = lane-yellow fill + asphalt
numeral. Results tiles: `surface` + 2px green/red border + colored numeral
(never white-on-green fills). Primary buttons = lane yellow + `onAccent`.
StatusBar `light`. Signature: TimerPill = asphalt pill, lane-yellow digits,
flips to danger red + pulse under 10s.

Motion (design-eng, Reanimated): presses = spring scale 0.97 via
`PressableScale` (duration 200, no bounce) — never a bare style-swap. Answer
toggles are INSTANT (high-frequency = no animation). Results tiles stagger in
30ms apart (FadeInDown 250ms, ease-out cubic-bezier(0.23,1,0.32,1)). The one
celebration: lane-paint dashed line draws across results on the FIRST-ever pass
of a series. Nothing else animates.

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

**Buttons** — primary: accent bg, radius.pill, height 56, label 16/700 onAccent;
pressed: scale 0.97 (reanimated spring). Answer buttons (quiz): series green,
radius.md, numeral 34/800 onAccent; SELECTED state: white bg + green border 3px +
green numeral (clear toggle affordance). No per-question correction flash (see
quiz-engine skill) — corrections show only on the results grid.

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

## 5. RTL & accessibility (owner decision, 2026-07-22)
Do NOT use I18nManager.forceRTL or `direction:"rtl"` (unreliable in Expo Go on
iOS and it flips icons to the wrong side). The app's RTL convention is instead:
**LTR layout, icons/chips/affordances on the LEFT, Arabic text right-aligned
(`textAlign:"right"`) filling the rest.** Rows that pair text with a control put
the control FIRST in JSX (renders left) and the text block after. Back arrows
are `‹` on the left. Latin inputs (email/password) stay left-aligned LTR.
Touch targets ≥ 44px, answer buttons ≥ 56px · dim text only for meta, never for
primary content.

## 6. Admin panel (Mantine)
Light theme, primary = lane yellow (#FFD348, autoContrast dark ink), Tajawal for Arabic content previews, LTR UI is
fine (admin is technical) but content preview components render RTL. Data-dense
tables > cards. Every destructive action gets a confirm modal.

## 7. Consistency checklist (run mentally on every new screen)
tokens only (no hex literals in components) · one accent per surface · spacing from
the scale only · shadows only via shadow.card · every state designed: loading
(skeleton, not spinner), empty, error, offline, locked.
