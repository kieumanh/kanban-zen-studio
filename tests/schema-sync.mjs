// v2.48.0 (Lược Đồ Hiện Hành): server/schema.sql, chuỗi migration và D1 production không được lệch nhau.
//  1. “Lược đồ gốc + mọi migration theo thứ tự” = server/schema.sql: cùng bảng, cột (kiểu, bắt buộc, mặc định, khóa chính, thứ tự), khóa ngoại, CHECK, chỉ mục, trigger.
//  2. server/schema.sql = ảnh chụp D1 production (docs/d1-production-snapshot.json): cùng bảng, cột và thứ tự cột, chỉ mục, trigger.
//  3. docs/luoc-do-hien-hanh.md đúng bằng bản sinh lại từ chuỗi migration (không ai sửa tay hoặc quên sinh lại).
//  4. Sổ sách migration gọn gàng: mọi tệp trong migrations/ và server/migration-*.sql có trong danh sách MIGRATIONS (hoặc là bản sao từng chữ),
//     mọi tệp trong migrations/ đều có mã băm ở production-receipt.json và ngược lại; migrations/ chỉ cộng thêm (không DROP/DELETE/UPDATE/đổi tên/đổi kiểu).
//  5. Bài kiểm có răng: cố ý làm lệch lược đồ (thêm cột, đổi thứ tự cột, bớt chỉ mục) thì bộ so sánh phải báo.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { BASE, DUPLICATES, MIGRATIONS, describe, diff, migrate, open, read, sig } from '../scripts/schema-model.mjs';
import { DOC_PATH, renderDoc } from '../scripts/schema-doc.mjs';

const schemaSql = read('server/schema.sql');
const current = describe(open(schemaSql));
const { schema: migrated } = migrate();

// 1. Gốc + migration = schema.sql.
assert.deepEqual(diff(migrated, current, 'gốc + migration', 'schema.sql'), [], 'server/schema.sql phải giống hệt kết quả áp dụng ' + BASE + ' rồi mọi migration');
console.log('PASS: lược đồ gốc + ' + MIGRATIONS.length + ' migration = server/schema.sql (' + Object.keys(current.tables).length + ' bảng, ' + Object.keys(current.indexes).length + ' chỉ mục, ' + Object.keys(current.triggers).length + ' trigger, đúng thứ tự cột)');

// 2. schema.sql = D1 production (ảnh chụp).
const snapshot = JSON.parse(read('docs/d1-production-snapshot.json'));
const REFRESH = ' — sau khi áp dụng migration mới lên D1, hãy làm mới docs/d1-production-snapshot.json (xem docs/luoc-do-hien-hanh.md, quy tắc 4)';
assert.deepEqual(Object.keys(current.tables).sort(), Object.keys(snapshot.tables).sort(), 'tập bảng của schema.sql khác D1' + REFRESH);
for (const [name, table] of Object.entries(current.tables)) assert.equal(table.columns.map(sig).join('|'), snapshot.tables[name], 'cột của bảng ' + name + ' khác D1' + REFRESH);
assert.deepEqual(Object.keys(current.indexes).sort(), [...snapshot.indexes].sort(), 'tập chỉ mục khác D1' + REFRESH);
assert.deepEqual(Object.keys(current.triggers).sort(), [...snapshot.triggers].sort(), 'tập trigger khác D1' + REFRESH);
for (const outside of Object.keys(snapshot.outsideApp)) assert.ok(!current.tables[outside], 'bảng ngoài ứng dụng ' + outside + ' không được xuất hiện trong schema.sql');
console.log('PASS: server/schema.sql khớp ảnh chụp D1 production ngày ' + snapshot.takenOn + ' từng cột; ' + Object.keys(snapshot.outsideApp).length + ' bảng ngoài ứng dụng được ghi nhận, không bị đụng tới');

// 3. Tài liệu không lệch.
assert.equal(read(DOC_PATH), renderDoc(), DOC_PATH + ' đã cũ: chạy `node scripts/schema-doc.mjs` rồi commit');
console.log('PASS: ' + DOC_PATH + ' đúng bằng bản sinh lại từ chuỗi migration');

// 4. Sổ sách migration.
const inMigrations = readdirSync(new URL('../migrations/', import.meta.url)).filter((n) => n.endsWith('.sql')).sort();
const legacy = readdirSync(new URL('../server/', import.meta.url)).filter((n) => /^migration-.*\.sql$/.test(n)).sort();
for (const f of inMigrations) assert.ok(MIGRATIONS.includes('migrations/' + f), 'migrations/' + f + ' chưa có trong MIGRATIONS ở scripts/schema-model.mjs');
for (const f of legacy) assert.ok(MIGRATIONS.includes('server/' + f) || DUPLICATES.some(([a]) => a === 'server/' + f), 'server/' + f + ' chưa được xếp vào MIGRATIONS hay DUPLICATES');
for (const f of MIGRATIONS) assert.ok(read(f).length > 0, f + ' không rỗng');
for (const [a, b] of DUPLICATES) assert.equal(read(a), read(b), a + ' phải trùng từng chữ với ' + b);
const receipt = JSON.parse(read('migrations/production-receipt.json'));
assert.deepEqual(Object.keys(receipt.files).sort(), inMigrations, 'production-receipt.json phải ghi đúng các tệp trong migrations/');
for (const f of inMigrations) assert.equal(createHash('sha256').update(read('migrations/' + f)).digest('hex'), receipt.files[f], 'mã băm của ' + f + ' khác production-receipt.json (tệp đã áp dụng không được sửa)');
// migrations/ chỉ được cộng thêm: không xóa hay đổi dữ liệu người dùng (nguyên tắc 1).
const stripComments = (s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
for (const f of inMigrations) {
  const text = stripComments(read('migrations/' + f));
  assert.doesNotMatch(text, /\b(DROP|DELETE|UPDATE|TRUNCATE|REPLACE\s+INTO)\b/i, 'migrations/' + f + ' không được xóa hay đổi dữ liệu');
  assert.doesNotMatch(text, /ALTER\s+TABLE\s+\S+\s+(RENAME|DROP|ALTER)\b/i, 'migrations/' + f + ' không được đổi tên, xóa hay đổi cột');
  for (const m of text.matchAll(/ADD\s+COLUMN\s+[^;]*/gi)) if (/NOT\s+NULL/i.test(m[0])) assert.match(m[0], /DEFAULT/i, 'cột NOT NULL thêm bằng ALTER phải có DEFAULT: ' + m[0]);
}
console.log('PASS: ' + inMigrations.length + ' tệp migrations/ khớp mã băm ở production-receipt.json, chỉ cộng thêm; ' + legacy.length + ' tệp server/migration-*.sql đều có trong sổ lịch sử');

// 5. Bài kiểm có răng.
const drift = (text) => diff(migrated, describe(open(text)), 'gốc + migration', 'bản lệch');
assert.ok(drift(schemaSql.replace('queued INTEGER NOT NULL DEFAULT 0,', 'queued INTEGER NOT NULL DEFAULT 0,extra TEXT,')).length > 0, 'phải báo khi thừa cột');
assert.ok(drift(schemaSql.replace('CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);', '')).length > 0, 'phải báo khi thiếu chỉ mục');
assert.ok(drift(schemaSql.replace('queued INTEGER NOT NULL DEFAULT 0,\n PRIMARY KEY', 'queued INTEGER NOT NULL DEFAULT 1,\n PRIMARY KEY')).length > 0, 'phải báo khi đổi mặc định');
assert.ok(drift(schemaSql.replace('repeat_alerts INTEGER NOT NULL DEFAULT 1,weekly_day INTEGER NOT NULL DEFAULT 0 CHECK(weekly_day BETWEEN 0 AND 6)', 'weekly_day INTEGER NOT NULL DEFAULT 0 CHECK(weekly_day BETWEEN 0 AND 6),repeat_alerts INTEGER NOT NULL DEFAULT 1')).length > 0, 'phải báo khi đổi thứ tự cột (lỗi thật từng có ở notification_preferences)');
assert.ok(drift(schemaSql.replace('CHECK(weekly_day BETWEEN 0 AND 6)', '')).length > 0, 'phải báo khi mất CHECK');
console.log('PASS: bộ so sánh bắt được cột thừa, chỉ mục thiếu, mặc định đổi, thứ tự cột đổi, mất CHECK');
