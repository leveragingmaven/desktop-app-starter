# Optional AI-gency adapter: integration contract (not yet implemented)

## Existing desktop behavior

The original Electron preload and IPC channels remain the working desktop transport. The build target defaults to `desktop`. No desktop code is replaced by Express, and no existing AI provider is removed.

`src/shared/deployment/target.ts` provides a small, validated target selector for future adapters. **It does not activate a web build or provide authentication.**

## Agency integration requirements

- Use the existing AI-gency SSO bridge. Do not introduce another login or assume endpoint names.
- Derive tenant/customer identity exclusively from a server-verified session, never from a browser-provided customer ID.
- Store secrets and customer data in private, authenticated PHP services with authorization on every operation.
- Do not expose secrets via frontend environment variables, browser storage, or publicly accessible JSON files.
- Map the supported subset of existing renderer operations to an authenticated HTTPS transport. Desktop-only file dialogs, filesystem paths, and OS APIs require explicit Agency alternatives or unsupported-operation responses.
- Support the established `/protools/` frontend and private `/php/` backend deployment layout, subject to verified deployment configuration.
- Ensure Electron preload and IPC behavior remains unchanged in desktop builds.

## Required before implementing live transport

1. Obtain and inspect the actual Agency SSO bridge, session/cookie behavior, and CSRF protections.
2. Obtain the existing PHP endpoint and storage contracts, including tenant isolation.
3. Decide which IPC operations are supported in web mode; reject unsupported ones explicitly.
4. Add an isolated Agency entrypoint/build only after confirming these contracts.
5. Test desktop builds and real Agency authentication, isolation, and credential handling independently.

Do not interpret the existence of this document or the target selector as a working Agency deployment.
