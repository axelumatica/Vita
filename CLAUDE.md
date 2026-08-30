# Claude Code Rules for Vita

## Memory Optimization (NO AUTO-COMPACTING)
- READ ONLY one file at a time. Never scan entire directories or run recursive file searches.
- Reference `../old-vita-backup` ONLY when explicitly asked, reading individual lines or small files.
- Run lightweight compilation checks only (`cargo check` or `npx tsc --noEmit`).

## Tech Stack
- Frontend: Expo (React Native) + Reanimated 3 + Skia
- Backend: Rust (tokio, rusqlite, reqwest)
- API: OpenRouter free models ONLY (`meta-llama/llama-3.3-70b-instruct:free`, `cohere/north-mini-code:free`, or `openrouter/free`)

## Session Control
- Complete ONE task per session.
- Run light build check -> Commit code -> Stop.
