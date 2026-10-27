# Code review — 27 October 2026

## Architecture

The browser loads ordered classic scripts from `dist/index.html`. They share workspace state and extend rendering/editing through wrappers. The Worker bundles six server modules and an explicit static asset manifest. D1 holds account/session/workspace metadata and report jobs; R2 holds uploaded objects. Workspace writes use revision-based compare-and-swap. Scheduled delivery uses per-account preferences and persisted jobs.

## Changes made

- Extracted the text asset route list into `scripts/assets.json` and validated duplicate routes, file paths and MIME types before generating a Worker.
- Centralized the generated Worker's version in `package.json`.
- Replaced unrestricted `export ` substitution with declaration-anchored module processing. The bundler intentionally supports only static imports and named declarations; generated server code is syntax checked before writing output. It is not a general JavaScript bundler.
- Added tests for preserved string/comment content, invalid manifests and missing HTML dependencies.
- Required JSON request bodies to be non-null objects. Arrays and primitives now fail with HTTP 400 before route handlers; malformed and oversized bodies are also covered.
- Removed an unused editor bookkeeping object. Earlier cleanup removed a dead schedule alias and temporary label reassignment.

## Validation

The complete automated suite covers login/session expiry, CSRF and origin checks, account isolation, workspace validation, revision conflicts and three-way merges, note history, file metadata/upload isolation and quotas, reminder scheduling and retries, shared-report permissions and expiry, and UI data transformations. New boundary tests cover JSON null/arrays/primitives, malformed JSON and size limits. Browser workflows passed at 390, 820 and 1440 pixels, including task saves, drag operations, notes, filters, project links and reload/sync behavior.

## Remaining maintenance risks

- The browser extension chain is order-dependent. Replacing it with explicit ES modules requires a dedicated migration and cross-view regression coverage; wrappers have not been deleted merely because a newer definition exists.
- CSS contains historical overrides. Removing them safely requires screenshots of open dialogs, dropdowns and responsive states, not just selector deduplication.
- Build module processing is deliberately constrained. A full module parser/bundler should replace it if the server begins using re-exports, default exports or complex module syntax.
- This review does not certify absence of vulnerabilities. No external penetration test, production load test, malware scanning of uploads, dependency supply-chain audit or full accessibility audit was performed.

No production credentials or user data were copied into this report. Production schema and existing notification preferences are unchanged by this cleanup.
