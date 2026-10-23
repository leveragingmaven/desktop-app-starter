# MavenSync Boilerplate Extension Plan

This branch extends the existing Desktop App Starter. Do not migrate or replace Electron, its preload/IPC bridge, React frontend, or build system.

## Targets
- Desktop: retain Electron, native local storage, OS-encrypted credentials, and existing integrations.
- Agency: optional separate web transport for the existing AI-gency SSO and private PHP backend. Do not invent endpoints or expose customer credentials in browser storage.

## Implementation sequence
1. Verify baseline build, tests, and existing services.
2. Inventory bridge, settings, storage, and brand configuration.
3. Add only minimal target-specific interfaces without changing desktop behavior.
4. Integrate actual Agency SSO and tenant isolation only after obtaining its verified contract.
5. Validate desktop and Agency targets independently.

No existing MavenSync product repositories are modified. Keep the original project's license and attribution notices.
