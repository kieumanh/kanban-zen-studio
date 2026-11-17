// v2.48.0: mô hình hóa lược đồ cơ sở dữ liệu để (1) sinh tài liệu "lược đồ hiện hành" và (2) kiểm tra server/schema.sql khớp chuỗi migration.
// Dùng node:sqlite (SQLite thật, cùng lõi với D1) nên cú pháp trigger, json_each, ALTER… chạy đúng như trên D1.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
export const read = (path) => readFileSync(new URL(path, root), 'utf8');

// Thứ tự áp dụng lịch sử. Hai tệp trong migrations/ (đã áp dụng lên D1, có dấu vết ở production-receipt.json) trùng từng chữ với hai tệp cùng nghĩa ở server/.
export const BASE = 'tests/fixtures/schema-base-v1.sql';
export const MIGRATIONS = [
  'server/migration-1.3.sql',
  'server/migration-1.4.sql',
  'server/migration-1.4.1.sql',
  'server/migration-1.8.0.sql',
  'server/migration-note-versions.sql',
  'server/migration-notification-receipts.sql',
  'server/migration-reminder-schedule.sql',
  'server/migration-weekly-day.sql',
  'migrations/0002_remember_device.sql',
  'migrations/0001_workspace_entities.sql',
];
// Các tệp ở server/ chỉ là bản sao lịch sử của tệp trong migrations/ (cùng nội dung).
export const DUPLICATES = [
  [
    'server/migration-remember-device.sql',
    'migrations/0002_remember_device.sql',
  ],
  [
    'server/migration-workspace-v2.sql',
    'migrations/0001_workspace_entities.sql',
  ],
];

export const open = (...sqlTexts) => {
  const db = new DatabaseSync(':memory:');
  for (const text of sqlTexts) db.exec(text);
  return db;
};
const norm = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim();

// Mô tả lược đồ: bảng (cột theo thứ tự, khóa ngoại), chỉ mục, trigger.
export function describe(db) {
  const master = db
    .prepare(
      "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name",
    )
    .all();
  const tables = {},
    indexes = {},
    triggers = {};
  for (const m of master) {
    if (m.type === 'table') {
      tables[m.name] = {
        columns: db
          .prepare('PRAGMA table_info("' + m.name + '")')
          .all()
          .map((c) => ({
            name: c.name,
            type: c.type,
            notnull: c.notnull,
            dflt: c.dflt_value === null ? null : String(c.dflt_value),
            pk: c.pk,
          })),
        fks: db
          .prepare('PRAGMA foreign_key_list("' + m.name + '")')
          .all()
          .map((f) => f.from + '→' + f.table + '.' + f.to + ' ' + f.on_delete),
        // CHECK và ràng buộc UNIQUE không hiện trong table_info: giữ lại phần ràng buộc trong câu CREATE (chuẩn hóa khoảng trắng).
        checks: [
          ...norm(m.sql).matchAll(/CHECK\s*\(([^)]*(?:\([^)]*\))*[^)]*)\)/gi),
        ]
          .map((x) => norm(x[1]))
          .sort(),
      };
    } else if (m.type === 'index')
      indexes[m.name] = {
        table: m.tbl_name,
        sql: norm(m.sql).replace(
          /^CREATE (UNIQUE )?INDEX (IF NOT EXISTS )?/i,
          'CREATE $1INDEX ',
        ),
      };
    else if (m.type === 'trigger')
      triggers[m.name] = {
        table: m.tbl_name,
        sql: norm(m.sql).replace(
          /^CREATE TRIGGER (IF NOT EXISTS )?/i,
          'CREATE TRIGGER ',
        ),
      };
  }
  return { tables, indexes, triggers };
}

// Áp dụng gốc rồi từng migration theo thứ tự, ghi lại migration nào đã thêm bảng, cột, chỉ mục, trigger nào.
export function migrate() {
  const db = open(read(BASE));
  const origin = { tables: {}, columns: {}, indexes: {}, triggers: {} };
  let before = describe(db);
  for (const name of Object.keys(before.tables)) {
    origin.tables[name] = 'gốc';
    for (const c of before.tables[name].columns)
      origin.columns[name + '.' + c.name] = 'gốc';
  }
  for (const name of Object.keys(before.indexes)) origin.indexes[name] = 'gốc';
  for (const name of Object.keys(before.triggers))
    origin.triggers[name] = 'gốc';
  for (const file of MIGRATIONS) {
    db.exec(read(file));
    const after = describe(db);
    for (const name of Object.keys(after.tables)) {
      if (!before.tables[name]) origin.tables[name] = file;
      for (const c of after.tables[name].columns)
        if (!before.tables[name]?.columns.some((x) => x.name === c.name))
          origin.columns[name + '.' + c.name] = file;
    }
    for (const name of Object.keys(after.indexes))
      if (!before.indexes[name]) origin.indexes[name] = file;
    for (const name of Object.keys(after.triggers))
      if (!before.triggers[name]) origin.triggers[name] = file;
    before = after;
  }
  return { db, schema: before, origin };
}

// So hai mô tả lược đồ, trả về danh sách khác biệt đọc được (rỗng nếu giống hệt, kể cả thứ tự cột).
export function diff(a, b, labelA, labelB) {
  const out = [];
  const names = (x, y) =>
    [...new Set([...Object.keys(x), ...Object.keys(y)])].sort();
  for (const n of names(a.tables, b.tables)) {
    const x = a.tables[n],
      y = b.tables[n];
    if (!x || !y) out.push('bảng ' + n + ' chỉ có ở ' + (x ? labelA : labelB));
    else {
      const sx = JSON.stringify(x),
        sy = JSON.stringify(y);
      if (sx !== sy)
        out.push(
          'bảng ' +
            n +
            ' khác nhau:\n  ' +
            labelA +
            ': ' +
            x.columns.map(sig).join(' | ') +
            ' ' +
            x.fks.join(',') +
            ' ' +
            x.checks.join(',') +
            '\n  ' +
            labelB +
            ': ' +
            y.columns.map(sig).join(' | ') +
            ' ' +
            y.fks.join(',') +
            ' ' +
            y.checks.join(','),
        );
    }
  }
  for (const kind of ['indexes', 'triggers']) {
    for (const n of names(a[kind], b[kind])) {
      const x = a[kind][n],
        y = b[kind][n];
      if (!x || !y)
        out.push(
          (kind === 'indexes' ? 'chỉ mục ' : 'trigger ') +
            n +
            ' chỉ có ở ' +
            (x ? labelA : labelB),
        );
      else if (x.table !== y.table || x.sql !== y.sql)
        out.push(
          (kind === 'indexes' ? 'chỉ mục ' : 'trigger ') +
            n +
            ' khác nhau:\n  ' +
            labelA +
            ': ' +
            x.sql +
            '\n  ' +
            labelB +
            ': ' +
            y.sql,
        );
    }
  }
  return out;
}
export const sig = (c) =>
  c.name +
  ':' +
  c.type +
  ':' +
  c.notnull +
  ':' +
  (c.dflt === null ? 'NULL' : c.dflt) +
  ':' +
  c.pk;
