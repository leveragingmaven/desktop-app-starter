# MavenSync Local Validation

Branch: `mavensync/boilerplate-extension`. Environment: Windows, Node v24.14.0, npm 11.17.0.

## Changes in this validation

- `scripts/dev.js`: quote the electron-vite binary path on Windows. The user profile path (`C:\Users\Martha Newell\...`) contains a space, and the unquoted path was split by `shell: true`, so `npm run dev` failed with `'C:\Users\Martha' is not recognized`. One-line fix.
- `src/main/services/fs-service.ts`: Windows short-name-safe path canonicalization in the filesystem allow-list (`canonicalRoot`, `canonicalizeAncestor`). Left uncommitted by an earlier crashed session; reviewed in this validation (see below).
- `src/main/services/__tests__/fs-service.test.ts`: 9 new tests covering Windows 8.3 short-name paths (allowed inside the root and rejected outside it), missing-parent writes, and allow-list escape attempts. A `windowsShortName` helper generates real 8.3 names; the short-name tests fail (not skip) if no short name can be produced.

## Review of the `fs-service.ts` change

- Probe result: on Windows, `fs.realpathSync` (JS) does not expand 8.3 short names, while `fs.realpathSync.native` and `fs.promises.realpath` do. The change pairs `realpathSync.native` for the root with `fsp.realpath` for the candidate, so both sides expand short names the same way.
- Against the committed HEAD version, 15 tests fail, including both short-name tests. This machine's temp path contains a short name (`MARTHA~1`), so HEAD rejects even userData reads. The change fixes that defect.
- Against the working-tree version, all 24 fs-service tests pass. The escape tests (`..` traversal, sibling-prefix, missing tree outside root) also pass on HEAD, so they guard against regression rather than proving the new logic.
- Limitation: the review is by code reading plus tests. No independent security review was done.

## Results

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` (final files) | Pass twice in a row: 4 files, 35 tests, exit 0. One earlier run reported a vitest worker startup timeout on `useSetting.test.ts` (an "Unhandled Error" with exit 1) with all 32 tests passing; not reproduced on the two reruns. Treat as a flaky environment issue, not a test failure. |
| `npm run build` | Pass |
| `npm run build:win` (final) | Pass, exit 0. `dist/desktop-app-starter-0.1.0-x64-setup.exe` and `dist/win-unpacked/Desktop App Starter.exe` regenerated. The first attempt failed with `EPERM` on `d3dcompiler_47.dll` because a packaged app from an earlier launch was still running; after stopping it, the build passed. |
| Packaged exe launch (earlier build) | Process started and stayed up about 20 s; stderr empty. Not re-run on the final build. |
| `npm run dev` (foreground, normal terminal-style run, 150 s) | Vite served on :5173; main process logged app, settings, secret store, theme, window state, and "Window created"; Vite reloaded optimized deps and kept running for the full window. Exit 124 was the `timeout` wrapper ending the run, not an app failure. |
| Feature generator (`new:feature`) | Pass in a temp copy: created `TestWidgetScreen.tsx` and `types.ts`, and registered the screen in `screens-registry.ts`. Generated code passes typecheck and lint. |
| IPC generator (`new:ipc`) | Pass in a temp copy: wired the `demo:echo` channel through channels, types, schema, handler, register, preload, and `electron.d.ts`. Tests in the temp copy pass. |
| Rebrand (`rebrand`) | Pass in a temp copy: updated `package.json` (name, productName), `electron-builder.yml` (appId, productName), the window title, and the README H1. The working starter was not modified. |

All generator and rebrand testing ran in `/tmp/gen-test`, not in the working starter.

## Interactive checks: NOT completed

- The five screens (Home, Explorer, AI, Components, Settings), dark and light themes, window controls, native file dialogs, and settings persistence were **not verified**. The dev server did not stay up long enough to drive the renderer, so no DOM or UI checks ran against the app.
- Requires manual verification: all of the above, plus the packaged build's window behavior and the installer (not installed or run).

## Not verified

- AI (Anthropic) functionality: no live API call and no key used.
- `npm run setup` and `npm run rebrand` were not run against the working starter. Only the temp-copy rebrand was run.
- The installer was built but not installed.

## Known issues

- The earlier `npm run dev` "exits" were caused by the tool environment, not the app. Background-launched processes were terminated when each tool call ended, so the dev server appeared to exit and was not reachable. A foreground run stays up. No application fix was needed.
- Electron logs `Network service crashed or was terminated, restarting service.` during startup in both the foreground run and earlier runs. It was not followed by a renderer failure in the logs; not investigated.
- The vitest worker startup timeout seen once (see Results).
- The `fs-service.ts` escape-path tests pass on HEAD too, so they do not prove the new logic on their own.

## Next steps

1. Diagnose the intermittent `npm run dev` exit.
2. Walk through the five screens, themes, window controls, dialogs, and settings persistence manually in dev and in the packaged build.
3. Install and run the `setup.exe` installer.

## User-reported results (manual, not automated)

Reported by the user after running the app in development mode. These are manual observations; no automated test covers them.

| Area | Reported result |
|---|---|
| Five screens (Home, Explorer, AI, Components, Settings) | All five opened. |
| Home buttons | Work. |
| Dialogs | Work. |
| Notifications | Work. |
| Theme controls | Work. |

Not yet reported by the user: window controls (minimize, maximize, close, restore size/position), settings persistence across restart, the packaged installer, and AI features. These remain unverified.

## Manual test instructions

Run these yourself. Automated checks do not cover them.

**Development mode**
1. Open a normal terminal in the project folder.
2. Run `npm run dev`. Wait for an Electron window titled for the app.
3. Leave the terminal open. Closing it stops the app.

**Five screens** (sidebar: Home, Explorer, AI, Components, Settings)
1. Click each screen and confirm it displays without errors.
2. Go back and forth between screens; the state of each should persist.
3. Open the DevTools console (Ctrl+Shift+I, if available) and check for red errors.

**Themes**
1. Switch between dark and light in Settings.
2. Confirm every screen updates, and the choice survives an app restart.

**Window controls**
1. Minimize, maximize/restore, and close the window using the title bar buttons.
2. Resize the window, close it, reopen it, and confirm the size and position are restored.

**Dialogs**
1. Trigger any file-open or confirmation dialog the app offers (for example, from Explorer).
2. Confirm it opens, and that Cancel and OK both behave as expected.

**Settings persistence**
1. Change a setting in Settings, close the app, and reopen it.
2. Confirm the setting is still applied.

**Packaged build and installer**
1. Run `npm run build:win`. It should finish without errors.
2. Run `dist/desktop-app-starter-0.1.0-x64-setup.exe` and complete the install.
3. Launch the installed app and repeat the five-screen, theme, and settings checks.
4. Uninstall from Windows Settings > Apps and confirm it is removed.
