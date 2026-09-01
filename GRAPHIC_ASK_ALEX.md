# Graphic assets needed from Alex

This list is intentionally minimal and visual-first — matching the ADHD-friendly design of Vita. These are the icons/SVG assets that need to be provided before the onboarding and other screens are finalized.

## 1. Onboarding Screen — 4 screen icons

Each screen in `src/screens/OnboardingScreen.tsx` has a `renderIcon()` placeholder that needs a proper SVG. Use the warm cream (`#F7F4EA`) / deep midnight blue (`#0B132B`) palette from the design tokens.

| Screen | Prompt | Example visual |
|--------|--------|----------------|
| **Step 1** — Capture instantanea | A large stylized `+` (plus) inside a circle, with a small microphone or pen icon inside the crossbar. Warm cream background, deep midnight blue accent. | `➕` placeholder currently used |
| **Step 2** — Lior compagno ADHD | Lior's orb: the animated emotional face from `src/screens/LiorScreen.tsx`. Simplified to a static emblem: a rounded orb with gentle gradient, perhaps with a subtle wave line inside to indicate voice/speech. Deep midnight blue with warm cream glow. | `🔮` placeholder currently used |
| **Step 3** — Micro-step fattibili | A task card visual that's breaking apart into 3 smaller subtasks. Think: a rounded rectangle with a checkmark, "splitting" into 3 smaller rectangles below it. Or: a single task list item with arrows pointing down to 3 micro-steps. Warm cream card with navy accent. | `📋` placeholder currently used |
| **Step 4** — Il tuo vault locale | An archive/chest icon: a simple geometric chest/box with a lock symbol. Could be the VaultScreen card style (`🗂` motif) adapted to a compact icon. Deep midnight blue with warm cream accent. | `🔒` placeholder currently used |

**File to modify:** `src/screens/OnboardingScreen.tsx` — the `renderIcon()` function currently returns text emojis (`➕`, `🔮`, `📋`, `🔒`). Replace with SVG imports once Alex provides them.

## 2. Lior orb animation — existing in LiorScreen

The orb animation in `src/screens/LiorScreen.tsx` (Task #2) is already implemented with `react-native-reanimated`. No new graphics needed for this — the orb is code-generated with colors from design tokens.

## 3. Voice settings UI icons (if applicable)

The VoiceSettingsScreen has TTS voice profile cards. If Alex wants to add profile-specific icons (Isabella = female, Diego = male), those can be simple silhouettes in the night-vault / day-canvas palette.

## 4. General icon style notes

- **Palette**: Use the design tokens from `src/design/tokens.ts`:
  - Dark mode: `bg: #0B132B`, `accent: #F7F4EA`
  - Light mode: `bg: #F7F4EA`, `accent: #0B132B`
- **Stroke width**: 2–3dp max — keep it tactile and uncluttered
- **Corners**: All icons should use `radius.lg` (24dp) or `radius.md` (16dp) — no sharp corners
- **File format**: SVG preferred, but high-quality PNG at 2× resolution is acceptable
- **Naming**: Follow the `iconName` convention used in OnboardingScreen: `capture`, `lior`, `breakdown`, `vault`

## 5. Where to deliver these

Once Alex has created the SVG assets, they should be placed in:
- `src/assets/icons/` (or `src/assets/graphic-assets/` if preferred)
- Imported in `src/screens/OnboardingScreen.tsx` replacing the `renderIcon()` text placeholders
- Referenced by their key name (`capture`, `lior`, `breakdown`, `vault`)

## Summary

**Minimum viable delivery from Alex**: 4 SVG icons (one per onboarding screen) in the warm-cream / deep-midnight-blue palette. These are the blockers for the onboarding being fully visual — without them, the screens show emoji placeholders.

**Nice-to-have**: Any additional iconography for voice profiles, TTS settings, or micro-step breakdown visuals.

---

*Generated for Alex terminal handoff. This file lives at `GRAPHIC_ASK_ALEX.md` and can be shared with the Alex terminal via `orc tell alex "review graphic ask list"` or similar.*