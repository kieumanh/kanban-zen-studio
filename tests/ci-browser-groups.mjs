// v2.43.0 (CI Song Song): bài kiểm thử trình duyệt của CI chạy song song theo nhóm; bài này giữ cho việc chia nhóm không làm rơi bài nào
// và cổng triển khai vẫn đứng sau mọi bài.
//  1. Danh sách tests/browser-tests.txt: không trùng, mọi bài có thật, và mọi tests/*-browser.mjs đều nằm trong đó.
//  2. Chia nhóm: mỗi bài thuộc đúng một nhóm, không nhóm nào trống, thời gian ước tính lệch nhau không quá một bài nặng nhất, kết quả cố định.
//  3. Quy trình CI: ma trận nhóm khớp số "--of", bước chạy dùng scripts/run-browser-tests.mjs, bước triển khai chỉ nằm ở job deploy và
//     job đó đứng sau cả job build lẫn job browser; job browser và build không chạm vào khóa triển khai.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { readBrowserTests, splitIntoGroups } from '../scripts/run-browser-tests.mjs';

const listed = readBrowserTests();
const paths = listed.map((t) => t.path);
assert.equal(new Set(paths).size, paths.length, 'danh sách không có bài trùng');
for (const p of paths) assert.ok(existsSync(p), 'bài ghi trong danh sách phải có thật: ' + p);
const onDisk = readdirSync('tests')
  .filter((n) => n.endsWith('-browser.mjs'))
  .map((n) => 'tests/' + n);
const missing = onDisk.filter((p) => !paths.includes(p));
assert.deepEqual(missing, [], 'bài trình duyệt chưa nằm trong tests/browser-tests.txt (CI sẽ không chạy): ' + missing.join(', '));
console.log('PASS: danh sách ' + paths.length + ' bài trình duyệt khớp thư mục tests');

const workflow = readFileSync('.github/workflows/build-worker.yml', 'utf8');
const matrix = workflow.match(/group:\s*\[([0-9,\s]+)\]/);
assert.ok(matrix, 'job browser có ma trận group');
const groupIds = matrix[1].split(',').map((n) => Number(n.trim()));
const groupCount = groupIds.length;
assert.deepEqual(groupIds, Array.from({ length: groupCount }, (_, i) => i + 1), 'ma trận nhóm là 1..N liền nhau');
assert.ok(groupCount >= 2, 'có ít nhất 2 nhóm song song');
const runs = [...workflow.matchAll(/node scripts\/run-browser-tests\.mjs --group \$\{\{ matrix\.group \}\} --of (\d+)/g)];
assert.equal(runs.length, 1, 'đúng một bước chạy nhóm bài trình duyệt');
assert.equal(Number(runs[0][1]), groupCount, 'số "--of" khớp số nhóm trong ma trận');

const groups = splitIntoGroups(listed, groupCount);
const seen = groups.flatMap((g) => g.tests);
assert.equal(seen.length, paths.length, 'tổng số bài sau khi chia bằng danh sách');
assert.deepEqual([...seen].sort(), [...paths].sort(), 'mỗi bài thuộc đúng một nhóm');
for (const [i, g] of groups.entries()) assert.ok(g.tests.length > 0, 'nhóm ' + (i + 1) + ' không trống');
const heaviest = Math.max(...listed.map((t) => t.seconds));
const loads = groups.map((g) => g.load);
assert.ok(Math.max(...loads) - Math.min(...loads) <= heaviest, 'thời gian ước tính các nhóm lệch nhau không quá một bài nặng nhất: ' + loads);
assert.deepEqual(splitIntoGroups(listed, groupCount), groups, 'chia nhóm cố định giữa các lần chạy');
console.log('PASS: ' + groupCount + ' nhóm, mỗi bài đúng một nhóm, tải ước tính ' + loads.join(' / ') + ' giây');

// Tách các job theo dòng "  tên-job:" cấp một trong khối jobs.
const jobsAt = workflow.indexOf('\njobs:\n');
assert.ok(jobsAt > 0, 'có khối jobs');
const blocks = {};
let current = null;
for (const line of workflow.slice(jobsAt + 6).split('\n')) {
  const head = line.match(/^  ([a-z][a-z0-9-]*):\s*$/);
  if (head) {
    current = head[1];
    blocks[current] = [];
  } else if (current) blocks[current].push(line);
}
assert.deepEqual(Object.keys(blocks), ['build', 'browser', 'deploy'], 'ba job: build, browser, deploy');
const text = Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, v.join('\n')]));
assert.match(text.deploy, /needs:\s*\[build, browser\]/, 'deploy chỉ chạy khi cả build và browser xanh');
assert.doesNotMatch(text.build, /needs:/, 'build không phụ thuộc job nào (chạy song song với browser)');
assert.match(text.browser, /fail-fast:\s*false/, 'một nhóm đỏ không hủy các nhóm còn lại (thấy đủ bài đỏ trong một lượt)');
for (const key of ['build', 'browser']) {
  assert.doesNotMatch(text[key], /wrangler|CLOUDFLARE_API_TOKEN|verify-production|migrations apply/, 'job ' + key + ' không đụng triển khai hay khóa');
}
for (const step of ['Check Cloudflare deployment credentials', 'Record recovery point', 'Apply or verify versioned D1 migrations', 'Deploy verified Worker to Cloudflare', 'Verify active deployment and production health']) {
  assert.ok(text.deploy.includes(step), 'job deploy giữ bước "' + step + '"');
  assert.ok(!text.build.includes(step) && !text.browser.includes(step), 'bước "' + step + '" chỉ nằm ở job deploy');
}
assert.match(text.build, /npm test/, 'job build chạy npm test');
assert.match(text.build, /npm run lint && npm run format:check/, 'job build chạy lint và kiểm định dạng');
assert.match(text.deploy, /download-artifact/, 'deploy dùng đúng bản dựng đã kiểm ở job build');
assert.match(text.deploy, /test -f worker-api\.mjs && test -d public/, 'deploy kiểm bản dựng có đủ tệp trước khi đẩy lên');
assert.ok(!/node tests\/[a-z0-9-]+-browser\.mjs/.test(workflow), 'workflow không còn liệt kê từng bài trình duyệt (danh sách nằm ở tests/browser-tests.txt)');
console.log('PASS: quy trình CI — build, browser (ma trận ' + groupCount + ' nhóm), deploy đứng sau cả hai');
