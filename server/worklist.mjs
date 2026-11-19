// v2.63.0 (Liên Hoàn Lệnh): chuỗi việc ưu tiên xuyên dự án, nằm ngay trong dữ liệu người dùng (workspace.worklist).
// Không thêm bảng hay cột nào vào cơ sở dữ liệu và không đổi lược đồ: dữ liệu cũ không có khóa này vẫn hợp lệ.
// worklist = { v: 1, items: [{ t: id việc, a: 'YYYY-MM-DD' ngày ghi vào chuỗi, x?: 'YYYY-MM-DD' ngày gỡ khỏi chuỗi }] }
// Thứ tự trong items chính là thứ tự người dùng xếp. Dòng có x là việc đã bị gỡ khỏi chuỗi (giữ lại để làm báo cáo).
// Việc xong không đổi gì ở đây: giao diện tự ẩn việc đã ở cột Hoàn thành, còn ngày xong lấy từ doneAt của chính việc.
// Máy chủ chỉ kiểm hình dạng và giới hạn, không đối chiếu id việc với dữ liệu: xóa một việc không làm cả bộ dữ liệu bị từ chối,
// và hai thiết bị cùng ghi một việc vẫn lưu được (giao diện tự bỏ dòng trùng).
export const WORKLIST_MAX = 1000;
const worklistDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
export function validWorklist(w) {
  if (w === undefined) return true;
  if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
  if (!Object.keys(w).every((k) => ['v', 'items'].includes(k))) return false;
  if (w.v !== 1 || !Array.isArray(w.items) || w.items.length > WORKLIST_MAX)
    return false;
  return w.items.every(
    (e) =>
      !!e &&
      typeof e === 'object' &&
      !Array.isArray(e) &&
      Object.keys(e).every((k) => ['t', 'a', 'x'].includes(k)) &&
      typeof e.t === 'string' &&
      /^[A-Za-z0-9_-]{1,99}$/.test(e.t) &&
      worklistDate(e.a) &&
      (e.x === undefined || worklistDate(e.x)),
  );
}
