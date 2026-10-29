import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const receipt = JSON.parse(
  readFileSync('migrations/production-receipt.json', 'utf8'),
);
if (receipt.databaseId !== 'd8ebf96e-eb66-4e8b-9668-a3d6da1ec455')
  throw Error('Migration receipt targets another database');
const files = readdirSync('migrations')
  .filter((n) => n.endsWith('.sql'))
  .sort();
for (const file of files) {
  const digest = createHash('sha256')
    .update(readFileSync('migrations/' + file))
    .digest('hex');
  if (receipt.files[file] !== digest)
    throw Error(
      'Migration ' +
        file +
        ' has not been acknowledged as applied. Apply it with Wrangler or the connected Cloudflare API, then update the receipt after verification.',
    );
}
console.log(
  'Verified checksums for ' +
    files.length +
    ' migrations applied through the connected Cloudflare API on ' +
    receipt.appliedOn +
    '. Set CLOUDFLARE_D1_API_TOKEN to run future migrations automatically with Wrangler.',
);
