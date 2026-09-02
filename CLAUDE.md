# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Vita

Vita is an ADHD-friendly personal AI companion app built with Expo (React Native). It provides a voice-first interface with an AI assistant called "Lior" that helps users capture thoughts, extract tasks, and maintain a local encrypted vault.

## Memory Optimization

- **READ ONLY one file at a time.** Never scan entire directories or run recursive file searches.
- Reference `../old-vita-backup` ONLY when explicitly asked, reading individual lines or small files.
- Run lightweight compilation checks only: `npx tsc --noEmit`
- **Build commands**: `npm start` (Metro), `npm run build:android` (EAS APK)

## Tech Stack

- **Framework**: Expo SDK 51 (React Native 0.74.5)
- **Language**: TypeScript 5.3
- **State**: Zustand 4 with persist middleware → stored in AsyncStorage as `vita-store`
- **Navigation**: React Navigation 6 (bottom tabs + native stack)
- **TTS**: expo-speech (system voices, offline)
- **Animations**: React Native Reanimated 3 (orb animations, pulse effects)
- **Design**: Custom token system (`src/design/tokens.ts`) — no external UI library
- **Storage**: AsyncStorage for persistence (encryption was dropped)
- **AI**: OpenRouter API integration (`src/ai/`) — fully wired into LiorScreen via `chat`, `extractTasks`, `breakdownTask`

## Architecture

### Entry Point
`App.tsx` → wraps everything in `SafeAreaView` + `NavigationRoot` with dark status bar.

### Navigation (`src/navigation/NavigationRoot.tsx`)
- `NavigationContainer` + `Stack.Navigator` (hidden header, slide animations)
- Inner `Tab.Navigator` with custom tab bar (5 tabs: Home, Diary, Lior, Tasks, Vault)
- Center tab (Lior) renders as a floating raised button with shadow
- `VoiceSettingsScreen` presented modally from Lior tab

### Screens (`src/screens/`)
| Screen | Purpose |
|---|---|
| `HomeScreen` | Dashboard: focus card, recent entries, system status, quick-capture demo |
| `LiorScreen` | AI companion interface: animated orb, listen button, scratchpad, extracted tasks |
| `TasksScreen` | Focus of the day, micro-steps, backlog accordion |
| `DiaryScreen` | Stream-of-consciousness entry, tags, add-to-vault |
| `VaultScreen` | Filterable list of all entries, bottom sheet detail view |
| `VoiceSettingsScreen` | TTS voice picker, OpenRouter model selector, low-stimulus toggle |

### State Store (`src/store/vita-store.ts`)
Single Zustand store with persist. Manages:
- `vaultEntries[]` — tasks, diary entries, voice notes, notes (typed: TASK/DIARY/VOICE/NOTE)
- `taskSteps[]` — micro-steps decomposed from a parent task
- `projectClusters[]` — AI-identified project groupings (future)
- `focusTaskId` — the one active focus task (max 1)
- Theme mode, Lior voice/model/persona, low-stimulus flag

All persisted to AsyncStorage key `vita-store`.

### Design System (`src/design/`)
- `tokens.ts` — full token set: Colors (dark/light), Radius, Spacing, Fonts, FontSize, LineHeight, Motion, Haptics
- `ThemeProvider.tsx` — React context exposing all tokens + `useTheme()` hook
- Palette: **Night Vault** (dark: deep midnight blue `#0B132B` + warm cream `#F7F4EA`) / **Day Canvas** (light: warm cream + deep midnight blue, inverted)
- Typography: Display → Inter/SF Pro, Body → Atkinson Hyperlegible, Mono → JetBrains Mono
- Motion: ease-in-out cubic-bezier, 180–260ms, 60fps floor

### Lior Persona (`src/store/vita-store.ts`, `defaultPersona`)
Italian-language ADHD coaching AI. Key rules baked into persona:
- Non-chatbot presence: "presenza abile", not a chatbot
- Task extraction only from explicit action verbs ("devo", "farò", "ricordami")
- Below 90% confidence → neutral note, no invented tasks
- One micro-action at a time, always break down to ≤2 min steps
- Declares when processing via Cloud Proxy (OpenRouter)

## Common Commands

```bash
npm start           # Start Metro dev server
npm run android     # Launch Android emulator with Expo
npm run build:android  # Build APK via EAS (preview profile → dev APK)
npm run typecheck   # TypeScript validation (tsc --noEmit)
```

## Session Control

- Complete **ONE task per session**.
- Run light build check → Commit code → Stop.

## Notes

- LiorScreen and VoiceSettingsScreen import from `src/ai/pipeline` and `src/ai/lior-models` — these files exist and implement OpenRouter integration.
- expo-av for audio recording is installed and wired to the UI via the voice-recording service.
- react-native-mmkv is installed for future encrypted storage upgrade (currently using AsyncStorage).
- The `target/` directory contains Rust build artifacts — likely a legacy or parallel project; do not reference it.

<!-- BEGIN ORCSPACE (managed) -->
## OrcSpace

You are running inside OrcSpace, an infinite canvas the user is watching live.
The `orc` command is already on your PATH and already authenticated — it talks
to the running app directly. There is no MCP server to configure.

**The other agents.** Every terminal on the canvas is addressable by its visible
name, and you can act on any of them:

```sh
orc whoami                                   # your own agent id, terminal & task
orc workers                                  # who else is open; * marks you
orc rename --to term-3 --name backend        # give one a name that means something
orc tell backend "run the tests and report"  # type into its terminal
```

Names beat ids: rename a sibling once, then address it by name everywhere.

**Coordinating with other agents.** For work you intend to *wait on*, use runs,
tasks and dispatches rather than `tell` — that is what gives you a completion
report instead of a guess.

```sh
orc status                                   # what is running right now
orc run-create --objective "..."             # open a run
orc task-create --spec "..." [--deps '["otask-1"]']
orc task-list --ready                        # what can be dispatched now
orc task-show <id>                           # view full specification and status
orc worker-start --task <id> --agent claude  # opens a terminal and briefs it
orc check --wait --types worker_done,escalation,ask   # block until a worker reports
orc reply <askId> "..."                      # unblock a worker that asked
orc gates                                    # check open decision gates
orc worker-release <dispatchId>              # account for a finished worker
```

If *you* were dispatched, your preamble named your task and dispatch ids. Report
exactly once when you finish, success or failure — a coordinator is blocked on it:

```sh
orc done --outcome succeeded --task-id <t> --dispatch-id <d> --body "what changed"
orc ask --question "..."     # blocks until the coordinator answers
orc escalate --body "..."    # you are stuck and need intervention
```

**Planner & Kanban Tasks.** The day planner and kanban board are live and synced.
You can pick tasks directly and report progress:

```sh
orc plan list                                # see all planner tasks
orc board list                               # list kanban tasks
orc board claim <id>                         # claim a task (moves to In Progress with your name)
orc board update <id> done                   # complete a task (moves to Done and checks off in Planner)
```

**The rest of the app** is the same CLI: `orc canvas`, `orc brain`, `orc plan`,
`orc board`, `orc terminal`, `orc git`, `orc journal`. Add `--json` for parseable
output. Prefer putting results on the canvas (a note, a task) over loose files —
the user is looking at the canvas, not at your scrollback.
<!-- END ORCSPACE (managed) -->
