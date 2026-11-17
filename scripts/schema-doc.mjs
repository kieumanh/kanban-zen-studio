// v2.48.0: sinh docs/luoc-do-hien-hanh.md (tài liệu lược đồ cơ sở dữ liệu hiện hành) từ chuỗi migration thật.
// Chạy: node scripts/schema-doc.mjs   (bài tests/schema-sync.mjs so tệp này với kết quả sinh lại: sửa tay sẽ bị báo lỗi).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  migrate,
  read,
  MIGRATIONS,
  BASE,
  DUPLICATES,
} from './schema-model.mjs';

export const DOC_PATH = 'docs/luoc-do-hien-hanh.md';
const code = (s) => '`' + s + '`';
const short = (f) => (f === 'gốc' ? 'gốc' : code(f));

export function renderDoc() {
  const { schema, origin } = migrate();
  const snapshot = JSON.parse(read('docs/d1-production-snapshot.json'));
  const L = [];
  L.push('# Lược đồ cơ sở dữ liệu hiện hành');
  L.push('');
  L.push(
    '> Tệp này được **sinh tự động** bởi `node scripts/schema-doc.mjs` từ `' +
      BASE +
      '` và chuỗi migration. Đừng sửa tay: `tests/schema-sync.mjs` sinh lại và so sánh.',
  );
  L.push('');
  L.push('## Quy tắc');
  L.push('');
  L.push(
    '1. **Nguồn sự thật của D1 là thư mục `migrations/`.** Các tệp trong đó đã áp dụng lên production và có dấu vết (mã băm) ở `migrations/production-receipt.json`; không sửa, không đổi tên, không xóa.',
  );
  L.push(
    '2. **`server/schema.sql`** là bản dựng sẵn toàn bộ lược đồ cho cơ sở dữ liệu mới và cho các bài kiểm tra. Nó phải luôn **giống hệt** kết quả của “lược đồ gốc + mọi migration” (kể cả thứ tự cột): `tests/schema-sync.mjs` kiểm điều này.',
  );
  L.push(
    '3. **Các tệp `server/migration-*.sql`** là lịch sử từ trước khi có thư mục `migrations/` (đều đã áp dụng lên production). Không còn dùng để triển khai, không sửa, không xóa (nhiều tài liệu và ghi chú phát hành cũ nhắc tới chúng). Hai tệp trong số đó chỉ là bản sao từng chữ của tệp trong `migrations/`.',
  );
  L.push(
    '4. **Thêm bảng hoặc cột** = tạo tệp SQL **mới** `migrations/NNNN_ten.sql` (chỉ cộng thêm: `CREATE … IF NOT EXISTS`, hoặc `ALTER TABLE … ADD COLUMN` có giá trị mặc định; không `DROP`, không đổi kiểu, không xóa dữ liệu). Sau đó: (a) cập nhật `server/schema.sql` cho khớp, cột mới nằm **cuối** bảng như `ALTER` tạo ra; (b) thêm tệp mới vào danh sách `MIGRATIONS` ở `scripts/schema-model.mjs`; (c) chạy `node scripts/schema-doc.mjs`; (d) áp dụng lên D1 bằng Wrangler hoặc Cloudflare API, cập nhật `migrations/production-receipt.json` sau khi xác nhận; (e) làm mới `docs/d1-production-snapshot.json`.',
  );
  L.push(
    '5. Lược đồ gốc (`' +
      BASE +
      '`) là bản dựng lại phần có trước mọi migration; **không sửa** khi thêm bảng hay cột.',
  );
  L.push('');
  L.push('## Chuỗi migration (theo thứ tự áp dụng)');
  L.push('');
  L.push('| # | Tệp | Thêm gì |');
  L.push('| --- | --- | --- |');
  MIGRATIONS.forEach((f, i) => {
    const added = [
      ...Object.keys(origin.tables)
        .filter((n) => origin.tables[n] === f)
        .map((n) => 'bảng ' + code(n)),
      ...Object.keys(origin.columns)
        .filter(
          (n) =>
            origin.columns[n] === f && origin.tables[n.split('.')[0]] !== f,
        )
        .map((n) => 'cột ' + code(n)),
      ...Object.keys(origin.indexes)
        .filter((n) => origin.indexes[n] === f)
        .map((n) => 'chỉ mục ' + code(n)),
      ...Object.keys(origin.triggers)
        .filter((n) => origin.triggers[n] === f)
        .map((n) => 'trigger ' + code(n)),
    ];
    L.push(
      '| ' +
        (i + 1) +
        ' | ' +
        code(f) +
        ' | ' +
        (added.join(', ') || '—') +
        ' |',
    );
  });
  L.push('');
  L.push(
    'Bản sao từng chữ: ' +
      DUPLICATES.map(([a, b]) => code(a) + ' ≡ ' + code(b)).join('; ') +
      '.',
  );
  L.push('');
  L.push('## Đối chiếu với D1 production');
  L.push('');
  L.push(
    'Ảnh chụp ngày ' +
      snapshot.takenOn +
      ' (`docs/d1-production-snapshot.json`, truy vấn chỉ-đọc, không đọc dữ liệu người dùng): ' +
      Object.keys(snapshot.tables).length +
      ' bảng ứng dụng, ' +
      snapshot.indexes.length +
      ' chỉ mục, ' +
      snapshot.triggers.length +
      ' trigger, **khớp từng cột (kiểu, bắt buộc, mặc định, khóa chính, thứ tự)** với `server/schema.sql`. Phát hiện duy nhất khi đối chiếu: cột `weekly_day` của `notification_preferences` nằm cuối bảng trên D1 (do `ALTER`), còn `schema.sql` cũ đặt giữa bảng; đã sửa `schema.sql` cho giống D1 (chỉ ảnh hưởng cơ sở dữ liệu mới, không đụng D1).',
  );
  L.push('');
  L.push(
    'Trên D1 còn có các bảng **ngoài ứng dụng** (không do mã của kho này tạo hay dùng; không được xóa hay sửa từ kho này):',
  );
  L.push('');
  for (const [n, why] of Object.entries(snapshot.outsideApp))
    L.push('- ' + code(n) + ': ' + why);
  L.push('');
  L.push('## Bảng');
  for (const [name, t] of Object.entries(schema.tables)) {
    L.push('');
    L.push('### ' + code(name) + ' — nguồn: ' + short(origin.tables[name]));
    L.push('');
    L.push('| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |');
    L.push('| --- | --- | --- | --- | --- | --- |');
    for (const c of t.columns)
      L.push(
        '| ' +
          code(c.name) +
          ' | ' +
          (c.type || '—') +
          ' | ' +
          (c.notnull ? 'có' : 'không') +
          ' | ' +
          (c.dflt === null ? '—' : code(c.dflt)) +
          ' | ' +
          (c.pk ? 'có (' + c.pk + ')' : '') +
          ' | ' +
          short(origin.columns[name + '.' + c.name]) +
          ' |',
      );
    const extra = [
      ...t.fks.map((f) => 'khóa ngoại ' + code(f)),
      ...t.checks.map((c) => 'ràng buộc ' + code('CHECK(' + c + ')')),
    ];
    if (extra.length) L.push('', extra.join('; ') + '.');
  }
  L.push('');
  L.push('## Chỉ mục');
  L.push('');
  L.push('| Chỉ mục | Bảng | Nguồn |');
  L.push('| --- | --- | --- |');
  for (const [n, i] of Object.entries(schema.indexes))
    L.push(
      '| ' +
        code(n) +
        ' | ' +
        code(i.table) +
        ' | ' +
        short(origin.indexes[n]) +
        ' |',
    );
  L.push('');
  L.push('## Trigger');
  L.push('');
  L.push('| Trigger | Bảng | Nguồn | Việc làm |');
  L.push('| --- | --- | --- | --- |');
  const what = {
    note_schedule_insert:
      'Dựng lại lịch nhắc ghi chú khi thêm dữ liệu không gian làm việc',
    note_schedule_update: 'Dựng lại lịch nhắc ghi chú khi dữ liệu thay đổi',
    note_schedule_delete: 'Xóa lịch nhắc khi xóa không gian làm việc',
  };
  for (const [n, tr] of Object.entries(schema.triggers))
    L.push(
      '| ' +
        code(n) +
        ' | ' +
        code(tr.table) +
        ' | ' +
        short(origin.triggers[n]) +
        ' | ' +
        (what[n] || '—') +
        ' |',
    );
  L.push('');
  return L.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('../' + DOC_PATH, import.meta.url), renderDoc());
  console.log('Đã ghi ' + DOC_PATH);
}
