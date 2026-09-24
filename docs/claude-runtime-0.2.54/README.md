# claude.ai artifact runtime, contract 0.2.54

These are the platform's type definitions for the runtime capabilities Atlas uses inside a
published claude.ai artifact (`window.claude.use(name)`): `sample`, `db`, `user`, `downloads`,
plus the built-in `permissions`. They are the authoritative call contract (BUILD_SPEC.md 10.2).

They are kept here for reference only. They are not compiled: the app declares its own minimal
typed interfaces in `src/lib/runtime/claude.ts`, which must stay consistent with these files.

If a later contract version changes a call shape, update both this folder and `src/lib/runtime/claude.ts`.
