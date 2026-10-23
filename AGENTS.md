# AGENTS.md — Instructions for coding agents

This file is for any coding agent working in this repo: Codex, Cursor, Copilot, Gemini CLI, OpenCode, Hermes, Claude Code, or another tool. It is provider-agnostic.

The architecture, IPC, security, and style rules live in [CLAUDE.md](./CLAUDE.md). Read it in full before you write any code, and follow it. Its rules override generic best practices. The rules live in one file so they cannot drift. Change them in CLAUDE.md, not here.

## What this project is

This is a **reusable Electron desktop app template for coding agents**. It is not an in-app visual app builder. You do not generate features from inside the running app. You edit this repository using the scripts below, and the person you work with runs the result.

Stack: Electron 41, React 19, TypeScript 5.9 (strict), Tailwind CSS 4, electron-vite 5. Targets: Windows (NSIS), macOS (DMG), Linux (AppImage and deb).

## Verified workflow

Each command is a script in `package.json`. These steps were run on a fresh `git archive` copy of the template, not on a working repo.

1. **Install and set up** (once after clone):
   ```bash
   npm install
   npm run setup
   ```
2. **Generate a feature.** Pass the name as an argument:
   ```bash
   npm run new:feature -- Invoices
   ```
3. **Generate an IPC channel** (when needed), also with an argument:
   ```bash
   npm run new:ipc -- domain:action
   ```
4. **Typecheck, lint, and test.** A clean typecheck alone does not prove the feature works:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```
5. **Rebrand** (when turning the template into a named app):
   ```bash
   npm run rebrand -- --name "My App" --id com.me.myapp
   ```
   This updates `package.json`, `productName`, `electron-builder.yml`, the window title in `src/renderer/index.html`, and the README heading. It is safe to run again.
6. **Build for Windows:**
   ```bash
   npm run build:win
   ```
   The installer is written to `dist/`, named `<name>-<version>-x64-setup.exe`. Other targets: `build:mac`, `build:linux`, and `build:unpack` (an unpacked build).

Report what you ran and what passed. Do not claim a step worked unless you ran it.

## Generator behavior

- `npm run new:feature` and `npm run new:ipc` use `plop`, which is interactive. Passing the name as an argument avoids the prompt.
- Run without a name and without a terminal (non-interactive stdin, such as an agent's shell), the generator crashes with `ERR_USE_AFTER_CLOSE`. This is expected. Always pass the name.
- Pass arguments through npm with `--`, as in `npm run new:feature -- Invoices`.

## Known limitation: cold-start Vitest timeout

On a fresh copy or after a cold cache, `npm run test` can fail once with:

```
Failed to start forks worker ... Timeout waiting for worker to respond
```

This is a worker startup timeout, not an assertion failure. It was seen once on a fresh copy, and the retry passed 35 of 35 tests. Rerun the command once before you investigate. If it fails again, report the output to the user. Do not skip or weaken tests.
