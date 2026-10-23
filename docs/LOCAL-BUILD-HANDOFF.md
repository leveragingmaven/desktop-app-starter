# MavenSync local build handoff

## Source of truth
- Repository: https://github.com/leveragingmaven/desktop-app-starter
- Work branch: `mavensync/boilerplate-extension`
- Original `main` branch is preserved.
- This project remains **Electron + React + TypeScript**. Do not migrate it to Express or rebuild the frontend.

## Verified by GitHub source inspection
- Original Electron main entrypoint: `src/main/index.ts`
- Existing preload API: `src/preload/preload.ts`
- Renderer API typing: `src/renderer/types/electron.d.ts`
- IPC channels: `src/shared/ipc/channels.ts`
- Existing local settings: `src/main/services/settings-store.ts`
- Existing OS-backed secret handling: `src/main/services/secret-store.ts`
- Screens: `src/renderer/screens-registry.ts`
- Original packaging: `electron.vite.config.mjs`, `electron-builder.yml`
- Existing project scripts: `npm run typecheck`, `npm test`, `npm run build`, `npm run build:win`

## Added on work branch
- `src/shared/deployment/target.ts`: validates optional `desktop` / `agency` target, defaults to desktop. This is a preparatory utility, not an active runtime selector.
- `src/shared/deployment/target.test.ts`: tests for the selector.
- `docs/AGENCY-ADAPTER-CONTRACT.md`: integration boundaries and prerequisites.
- `docs/MAVENSYNC-IMPLEMENTATION-PLAN.md`: scope and order of work.

## Critical discoveries
- The original project has **no** `src/renderer/api-bridge.ts`; that was from the AI Studio conversion, not this branch.
- Renderer uses the typed Electron preload `window.api` interface; preserve it.
- The existing secret store warns about a plaintext fallback on Linux when safeStorage encryption is unavailable. Do not advertise encryption as guaranteed on all platforms.
- Agency SSO endpoints, customer identity contract, and private PHP routes have not been supplied or validated. Do not invent them.

## Local acceptance checklist
1. Check out the work branch and install using the lockfile (`npm ci`).
2. Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
3. Launch the Electron app locally and visually verify existing screens, native dialogs, settings, theme changes, AI integration, and storage behavior.
4. Run `npm run build:win`; inspect installer/portable artifacts and test launch.
5. Obtain the actual Agency SSO/PHP contract before implementing authenticated web transport.
6. Confirm web builds do not import Electron/Node main-process code into browser bundles.
7. Test tenant isolation and secrets security on the real Agency environment, not a mock.
8. Document any failing or unverified checks.

## Stop conditions
- No wholesale architectural migrations.
- No replacing the original Anthropic SDK or forcing a provider.
- No separate Agency login.
- No customer data in public JSON or browser secrets.
- No direct changes to the `main` branch or other MavenSync products.
- Do not claim a successful Windows build without running it.

## What has *not* been done
No local dependency install, automated test run, Windows installer build, or live Agency integration has been verified through the GitHub-only editing workflow.
