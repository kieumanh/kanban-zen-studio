import { readFileSync, appendFileSync } from 'node:fs';
const expected = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)),
).version;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const commit = process.env.EXPECTED_COMMIT;
if (!account || !token || !commit)
  throw new Error('Missing deployment verification credentials or commit');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastError;
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const response = await fetch(
      'https://api.cloudflare.com/client/v4/accounts/' +
        account +
        '/workers/scripts/kanban-zen-studio/deployments',
      {
        headers: { Authorization: 'Bearer ' + token },
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = await response.json();
    if (!response.ok || !data.success)
      throw new Error('Cannot read active Cloudflare deployment');
    const deployment = data.result.deployments[0];
    if (
      !deployment ||
      deployment.annotations?.['workers/message'] !==
        'GitHub Actions ' + commit ||
      deployment.versions.length !== 1 ||
      deployment.versions[0].percentage !== 100
    ) {
      throw new Error(
        'Active deployment does not match verified commit at 100% traffic',
      );
    }
    const healthResponse = await fetch(
      'https://kanban.huongthiennature.com/health?deployment=' +
        encodeURIComponent(commit),
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      },
    );
    const health = await healthResponse.json();
    if (
      !healthResponse.ok ||
      health.ok !== true ||
      health.version !== expected
    ) {
      throw new Error(
        'Production health/version mismatch; expected ' + expected,
      );
    }
    const page = await fetch('https://kanban.huongthiennature.com/', {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (
      !page.ok ||
      !(page.headers.get('content-type') || '').includes('text/html')
    )
      throw new Error('Production homepage unavailable');
    const html = await page.text();
    const path = html.match(/src="(\/static\/[^"]+\.js)"/)?.[1];
    if (!path) throw new Error('Missing fingerprinted production asset');
    const asset = await fetch('https://kanban.huongthiennature.com' + path);
    if (
      !asset.ok ||
      !asset.headers.get('cache-control')?.includes('immutable') ||
      !asset.headers.get('etag')
    )
      throw new Error('Static asset cache headers missing');
    const conditional = await fetch(
      'https://kanban.huongthiennature.com' + path,
      { headers: { 'If-None-Match': asset.headers.get('etag') } },
    );
    if (conditional.status !== 304)
      throw new Error('Static asset ETag revalidation failed');
    const summary =
      'Production verified: v' +
      expected +
      '\nCommit: ' +
      commit +
      '\nDeployment: ' +
      deployment.id +
      '\nVersion: ' +
      deployment.versions[0].version_id +
      '\n';
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(
      'Verification attempt ' + (attempt + 1) + ': ' + error.message,
    );
    if (attempt < 11) await sleep(10000);
  }
}
throw lastError;
