// v2.43.0 (CI Song Song): chạy một nhóm bài kiểm thử trình duyệt trong danh sách tests/browser-tests.txt.
//   node scripts/run-browser-tests.mjs --group 2 --of 5     chạy nhóm 2 trong 5 nhóm
//   node scripts/run-browser-tests.mjs --group 2 --of 5 --list   chỉ in tên các bài của nhóm
// Mọi bài trong danh sách thuộc đúng một nhóm. Mỗi nhóm chạy hết các bài của mình (không dừng ở bài đỏ đầu tiên),
// rồi báo bài nào đỏ và thoát mã 1 nếu có bất kỳ bài nào đỏ. Không có thử lại, không có bỏ qua.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_SECONDS = 12;

export function readBrowserTests(
  file = new URL('../tests/browser-tests.txt', import.meta.url),
) {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [path, seconds] = line.split(/\s+/);
      return { path, seconds: Number(seconds) || DEFAULT_SECONDS };
    });
}

// Chia đều theo thời gian ước tính: bài nặng trước, mỗi bài vào nhóm đang nhẹ nhất (hòa thì nhóm số nhỏ). Kết quả cố định theo danh sách.
export function splitIntoGroups(tests, groupCount) {
  if (!Number.isInteger(groupCount) || groupCount < 1)
    throw new Error('Số nhóm phải là số nguyên dương');
  const groups = Array.from({ length: groupCount }, () => ({
    load: 0,
    tests: [],
  }));
  const order = tests
    .map((test, index) => ({ ...test, index }))
    .sort((a, b) => b.seconds - a.seconds || a.index - b.index);
  for (const test of order) {
    const target = groups.reduce(
      (best, group) => (group.load < best.load ? group : best),
      groups[0],
    );
    target.tests.push(test);
    target.load += test.seconds;
  }
  return groups.map((group) => ({
    load: group.load,
    tests: group.tests.sort((a, b) => a.index - b.index).map((t) => t.path),
  }));
}

function option(name) {
  const at = process.argv.indexOf('--' + name);
  return at === -1 ? undefined : process.argv[at + 1];
}

function main() {
  const group = Number(option('group'));
  const of = Number(option('of'));
  if (
    !Number.isInteger(group) ||
    !Number.isInteger(of) ||
    group < 1 ||
    group > of
  ) {
    console.error(
      'Dùng: node scripts/run-browser-tests.mjs --group N --of M [--list]',
    );
    process.exit(2);
  }
  const mine = splitIntoGroups(readBrowserTests(), of)[group - 1].tests;
  if (process.argv.includes('--list')) {
    console.log(mine.join('\n'));
    return;
  }
  const github = Boolean(process.env.GITHUB_ACTIONS);
  const failed = [];
  const root = fileURLToPath(new URL('..', import.meta.url));
  console.log(
    'Nhóm ' +
      group +
      '/' +
      of +
      ': ' +
      mine.length +
      ' bài kiểm thử trình duyệt',
  );
  for (const test of mine) {
    if (github) console.log('::group::' + test);
    const started = Date.now();
    const result = spawnSync(process.execPath, [test], {
      cwd: root,
      stdio: 'inherit',
    });
    const seconds = Math.round((Date.now() - started) / 1000);
    if (github) console.log('::endgroup::');
    if (result.status === 0)
      console.log('PASS ' + test + ' (' + seconds + 's)');
    else {
      failed.push(test);
      console.log(
        (github ? '::error::' : '') +
          'FAIL ' +
          test +
          ' (' +
          seconds +
          's, mã ' +
          (result.status ?? result.signal) +
          ')',
      );
    }
  }
  console.log(
    failed.length
      ? 'Nhóm ' +
          group +
          '/' +
          of +
          ' có ' +
          failed.length +
          ' bài đỏ:\n  ' +
          failed.join('\n  ')
      : 'Nhóm ' + group + '/' + of + ': tất cả ' + mine.length + ' bài xanh',
  );
  process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
