# Kanban Production deployment

Push application changes to main, or run "Verify and deploy Kanban Production" manually in GitHub Actions.

Pipeline: install tools (npm ci) -> lint and format check -> build Worker -> application tests -> mobile/tablet/desktop checks -> credential preflight -> save recovery artifact -> apply or verify D1 migrations -> Wrangler deploy -> verify active deployment commit at 100% traffic, /health version and homepage.

Deployments are serialized. Failed tests stop deployment. A failed post-deployment check marks the run failed and requires investigation; it does not automatically roll back.

## One-time credential setup

In repository Settings > Secrets and variables > Actions, create repository secret CLOUDFLARE_API_TOKEN.
Use a Cloudflare API token with Editor access for existing Worker kanban-zen-studio in account 53ab746eeba03687cf19d683fab74b36.
Because wrangler.jsonc includes the existing custom domain, grant Workers Routes Write for zone huongthiennature.com if Wrangler needs to manage that connection.
Do not put the token in source files or chat. The account ID is configured in the workflow and is not a secret.
The ChatGPT Cloudflare connection does not automatically supply GitHub Actions credentials.

After saving the secret, rerun the failed workflow from Actions. Production is confirmed only when the final verification step succeeds.

## Existing resources

wrangler.jsonc targets the existing Worker, D1 DB, R2 FILES and five-minute cron.
Deployment uses --keep-vars. Existing Worker secret bindings such as RESEND_API_KEY and VAPID_PRIVATE are retained.
The pipeline has an "Apply or verify versioned D1 migrations" step. With the Actions secret CLOUDFLARE_D1_API_TOKEN it runs `wrangler d1 migrations apply kanban-zen-studio --remote`. Without it, scripts/verify-migration-receipt.mjs requires every file in migrations/ to match migrations/production-receipt.json and fails on any new or modified SQL file.
The pipeline does not modify stored user data or enable Zen AI.
Build and test commands run before deployment.

## Recovery

Each deploy saves production-recovery-RUN_ID as a GitHub Actions artifact for 30 days.
Its deployments.json records the previously active version IDs; source-commit.txt records the source commit of that run.
To recover, select the previously active version from that artifact in Cloudflare Workers > kanban-zen-studio > Deployments and roll back, then verify /health.
Do not retry an outdated run after a newer release; rerun the current main workflow.

## Operational files

- .github/workflows/build-worker.yml
- scripts/verify-production.mjs
- wrangler.jsonc
