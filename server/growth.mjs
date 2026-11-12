// v1.78.0: "Điểm tích lũy" — 8 chỉ số cuộc sống của người dùng, cộng dần mỗi lần hoàn thành việc.
// notify = báo khi cộng điểm / lên cảnh giới; tips = gợi ý cải thiện hằng tuần (v1.80.0); thiếu = bật.
// Dữ liệu nằm ngay trong dữ liệu người dùng (workspace.growth): không thêm bảng hay cột nào vào cơ sở dữ liệu.
// Sổ cái chỉ-thêm: log = [{id, d:'YYYY-MM-DD', s:'task'|'habit'|'archive', k?:khóa chống cộng trùng, n?:tên việc, p:[8 số nguyên]}]
// p tính theo đơn vị nửa điểm (1 = 0,5 điểm) theo thứ tự 8 chỉ số; điểm từng chỉ số = tổng p của sổ cái.
// Lưu theo sổ cái (mỗi lần cộng là một dòng có id) để hai thiết bị cùng cộng điểm vẫn gộp được theo id.
export const GROWTH_AXIS_COUNT = 8;
export const GROWTH_LOG_MAX = 3000;
const GROWTH_SOURCES = ['task', 'habit', 'archive'];
const growthDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
export function validGrowth(g) {
  if (g === undefined) return true;
  if (!g || typeof g !== 'object' || Array.isArray(g)) return false;
  if (
    !Object.keys(g).every((k) =>
      ['v', 'hero', 'name', 'since', 'log', 'notify', 'tips'].includes(k),
    )
  )
    return false;
  if (g.v !== 1 || !['nam', 'nu'].includes(g.hero) || !growthDate(g.since))
    return false;
  if (
    g.name !== undefined &&
    (typeof g.name !== 'string' || g.name.length > 30)
  )
    return false;
  if (g.notify !== undefined && typeof g.notify !== 'boolean') return false;
  if (g.tips !== undefined && typeof g.tips !== 'boolean') return false;
  if (!Array.isArray(g.log) || g.log.length > GROWTH_LOG_MAX) return false;
  const seen = new Set();
  return g.log.every(
    (e) =>
      !!e &&
      typeof e === 'object' &&
      !Array.isArray(e) &&
      Object.keys(e).every((k) =>
        ['id', 'd', 's', 'k', 'n', 'p'].includes(k),
      ) &&
      typeof e.id === 'string' &&
      /^[A-Za-z0-9_-]{1,99}$/.test(e.id) &&
      !seen.has(e.id) &&
      !!seen.add(e.id) &&
      growthDate(e.d) &&
      GROWTH_SOURCES.includes(e.s) &&
      (e.k === undefined || (typeof e.k === 'string' && e.k.length <= 120)) &&
      (e.n === undefined || (typeof e.n === 'string' && e.n.length <= 120)) &&
      Array.isArray(e.p) &&
      e.p.length === GROWTH_AXIS_COUNT &&
      e.p.every((x) => Number.isInteger(x) && x >= 0 && x <= 1000000) &&
      e.p.some((x) => x > 0),
  );
}
