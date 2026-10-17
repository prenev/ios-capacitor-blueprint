# Plate MCP server

Lets an AI app (Claude Desktop, Claude Code, Cursor, any MCP client) read your training, manage routines and review what you are doing wrong. Local stdio server, no network, no cloud.

## How data gets there
Plate is offline and keeps data on the phone, so the server works on a **backup file**:

1. Phone: **Stats ▸ ⚙︎ ▸ Export backup** → save to iCloud Drive (or AirDrop) → it lands on your Mac as `plate-backup-….json`.
2. Point the server at it (`PLATE_DATA=/path/to/file.json`, or the first CLI argument). Ask your AI things.
3. Routine changes the AI makes are written into that same file. Copy it back to the phone: **⚙︎ ▸ Import backup ▸ OK (Merge)**. Merge keeps your workouts, loads new/edited routines and applies routine deletions. Workouts are only ever read, never changed by the server.

This is a manual round trip, not live sync: the AI sees your data as of the last export.

## Setup
```bash
npm install
npm run mcp                       # runs over stdio; clients start it for you
```
Claude Code: the repo's `.mcp.json` already registers it (expects `./plate-backup.json` in the repo root; gitignored).
Claude Desktop (`claude_desktop_config.json`):
```json
{ "mcpServers": { "plate": { "command": "npx", "args": ["tsx", "/abs/path/ios-capacitor-blueprint/mcp/server.ts"], "env": { "PLATE_DATA": "/abs/path/plate-backup.json" } } } }
```

## Tools
Read: `get_summary`, `list_workouts`, `get_workout`, `list_exercises`, `get_exercise_progress` (records, e1RM trend, next overload target), `list_routines`, `get_routine_targets`.
Review: `analyze_training` (stalled lifts, skipped overload, weight too heavy for the rep range, untrained / low / excessive muscle volume, once-a-week frequency, push:pull and quad:hamstring balance, volume spikes, long sessions, consistency). Heuristics with evidence, not medical advice.
Write: `create_routine`, `update_routine`, `delete_routine`. Exercises resolve by id or name; ambiguous names return candidate ids.
Prompt: `review_my_training` (full review → proposed routine changes).
