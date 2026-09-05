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

**Lives bell (home header, owner decision 2026-07-29)** — 🔔 in a 40px `chipBg`
circle with a count badge (live now + scheduled) pinned to its start corner:
lane-yellow normally, `danger` red while something is LIVE, 2px `bg` ring so it
reads against the header. Tap → `/lives` page listing live-now (red pulsing
card) / قادمة (countdown chips) / إعادات (subdued). Badge hidden at zero; the
page has a friendly empty state. Bell + banner share ONE fetch via
`useUpcomingLives()` — never fetch the same feed twice on a screen.
Badge = UNSEEN only: opening the lives page marks the current ids seen (stored
in `meta.lives_seen_ids`), so the count clears on tap and re-appears only when a
genuinely new live is scheduled.

**Bottom tab bar (MANDATORY — owner decision 2026-07-29)** — the app's permanent
navigation: 4 tabs, always visible on the root screens — 🏠 الرئيسية · 📚 الدروس ·
📈 تقدّمي · ⚙️ الإعدادات. Bar = `surface` bg + 1px top `border`, height 68. Active
tab: lane-yellow (`lessons`) top indicator bar (26×3, radius 2) + yellow bold
label + full-opacity icon; inactive: `textDim` label, icon at 55% opacity.
Implemented as an Expo Router `(tabs)` group inside `(main)` — immersive pushed
screens (quiz, results, review, payment, lesson, exam) live in the parent Stack
so they render WITHOUT the bar. Tab roots therefore carry NO back button.

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

## 6. Admin panel (Mantine) — shadcn/ui look (owner decision, 2026-07-23)
The admin is its OWN neutral tool, NOT the Night Drive product palette. Match
shadcn/ui: zinc neutral scale (`gray` + `primary` both = zinc), near-black
primary (primaryShade light 9), hairline borders (separation by border, not
shadow — Card withBorder + no shadow), 8px radius, Tajawal font. Light sidebar
(#fafafa) with ghost nav items (muted → zinc-100 fill + near-black on hover/
active, no color accent). KPI stat cards atop data pages. RTL content, Tabler
icons. Every destructive action gets a confirm modal. No brand yellow in admin.

## 6b. Icons (owner decision 2026-07-29) — NO EMOJI as UI icons
Mobile uses ONE family: **MaterialCommunityIcons** via `@expo/vector-icons`,
always through the semantic wrapper `src/components/Icon.tsx`
(`<Icon name="exam" size={24} color={accent} />`). Screens reference SEMANTIC
names (exam, lessons, car, trophy, bell, lock, card, store, check, alert, play,
volume…), never raw glyph names — so the set can be swapped in one file.
Emoji are allowed ONLY inside sentence text (e.g. "أهلاً 👋") and push/share
copy, never as a button, tab, chip, or status icon. Colour icons with tokens;
pair every semantic colour with an icon (never colour alone).
Admin uses Tabler icons (`@tabler/icons-react`) — its own set, see §6.

**One exception — brand marks** (owner decision 2026-08-05): platform logos must
look like the real logo, and MaterialCommunityIcons has no TikTok mark. Brand
glyphs come from **FontAwesome6 brands** via `src/components/BrandIcon.tsx`
only (`<BrandIcon platform="TIKTOK" />`), which also owns each brand's official
colour and Arabic label. Brand glyphs are never used for UI actions, and no
other file may import a second icon family.

## 6c. Live section (owner decision 2026-08-05)
The live is a **standing daily appointment**, not a list of events: the owner
streams at the same wall-clock time on the same four profiles. Recipe
(`components/LiveSection.tsx`, used on home under the series and on `/lives`):
- **Countdown ring** (`CountdownRing.tsx`) — full ring = 24h of waiting, arc
  empties toward the next start; `HH:MM:SS` inside, caption under it.
- **Four platform buttons**, 2-per-row, brand icon + Arabic label; tap opens
  the profile with `Linking.openURL` (never an embedded player).
- **Blink** (opacity 1 ↔ 0.35, 550ms) only while on air or inside the 15-min
  reminder window — a permanently blinking control is noise, not an alert.
- Renders **nothing** until the owner has configured at least one link.
- Bell badge is not a count: it flags the one unseen occurrence, and clears
  when the lives page is opened.

## 6d. Media playback rule (owner-reported bug, 2026-08-05)
Any screen that plays audio MUST pair its player with `usePausedOnBlur` —
unmount cleanup alone is not enough, because a screen pushed on top stays
mounted and its sound kept playing.

**Quiz pause** (owner decision 2026-08-06): pause stops the countdown and the
audio, and *nothing else*. The question image stays on screen and the answer
buttons stay usable — do not veil or disable the question. (An earlier build
covered it to stop pause buying reading time; the owner overruled that.)

## 6e. Rotation & tablet mode (owner decision 2026-08-14)
The WHOLE app rotates — app.json `orientation: "default"` and nothing locks it.
So every screen must survive a wide viewport:
- Use `theme/useResponsive` for the breakpoint, never a local magic number.
  `isWide` (>=600pt) means landscape phone or tablet; `columns` gives 2/3/4.
- Card grids take their width from `gridBasis(columns)` at render time. A
  hard-coded `width: "47%"` becomes an absurdly wide card in landscape.
- Reading-width content (forms, the home menu) gets `maxWidth` + `alignSelf:
  "center"` rather than stretching across a tablet.
- The quiz switches to image-beside-controls when `isWide`; stacked, each half
  gets a sliver of a short screen and neither is usable.
- ImageViewer may force landscape, but on close it calls `unlockAsync()` —
  never re-locks portrait, which would leave the whole app stuck upright.
- EVERY `<Modal>` needs `supportedOrientations={["portrait","landscape"]}`.
  An iOS Modal is portrait-only by default: opening one in landscape forces the
  app upright, the screen re-renders as portrait while the device is still
  sideways, and the two fight — the screen spins without stopping.
- A sheet/modal must also survive a 393pt-tall landscape screen: give it
  `maxHeight: "100%"` and put its content in a ScrollView.
- Landscape needs REAL safe-area insets (`useSafeAreaInsets`, with a
  `SafeAreaProvider` at the root): rotated, the notch and home indicator sit
  BESIDE the content, so `padding` alone clips the edge controls.

## 7. Consistency checklist (run mentally on every new screen)
tokens only (no hex literals in components) · one accent per surface · spacing from
the scale only · shadows only via shadow.card · every state designed: loading
(skeleton, not spinner), empty, error, offline, locked ·
**card grids: every card the same height, whatever the text length** — cap the
title with `numberOfLines` AND reserve that many lines with `minHeight`, and
give the card `flex: 1` so it fills the row-stretched wrapper. Arabic titles
vary wildly in length; ragged card bottoms are the most common result.

## 7b. Lessons navigation — 3 pages (owner sketch 2026-08-07)
Exactly three levels, always, no shortcuts:
1. **الدروس النظرية** — categories as FULL-WIDTH rows (icon chip + title),
   e.g. التشوير الطرقي / المركبة / الوثائق. Not a grid.
2. **الدروس of a category** — 2-column PICTURE grid: the lesson's cover image
   on top, its name beneath (علامات المنع / علامة الإجبار …). This is what
   `Lesson.imageKey` exists for; fall back to a sign icon when it is empty.
   Never number these cards — the picture is the identity.
3. **العلامات** — the sign content, 2-column (image + name + audio). The
   playing card's border IS its progress bar: it draws itself around the card
   as the explanation plays (`ProgressBorder`, lane-yellow over a 25% track).
   No separate progress bar — the card already is the object being played.
A category with one lesson still shows level 2: navigation that sometimes skips
a level is worse than one extra tap.
Admin mirror: adding at EVERY level is a modal (category / lesson / sign) with
the same fields as before — never `window.prompt`, never an inline form buried
under a table.

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
