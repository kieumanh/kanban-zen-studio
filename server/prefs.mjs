// v2.75.0 (Theo Chân): tùy chọn nhỏ đi theo tài khoản, nằm ngay trong dữ liệu người dùng (workspace.prefs).
// Không thêm bảng hay cột nào vào cơ sở dữ liệu và không đổi lược đồ: dữ liệu cũ không có khóa này vẫn hợp lệ.
// prefs = { tab?: tên tab đang xem ở trang Tu vi, usage?: true | false (công tắc “Chỉ số ẩn danh” ở Cài đặt) }
// Chỉ ghi khi người dùng tự đổi, nên người dùng cũ không bị thêm gì cho tới khi họ chọn. Máy chủ chỉ kiểm hình dạng và giá trị cho phép.
export const PREF_TABS = ['today', 'octa', 'story', 'gods', 'store', 'all'];
export function validPrefs(p) {
  if (p === undefined) return true;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  if (!Object.keys(p).every((k) => ['tab', 'usage'].includes(k))) return false;
  return (
    (p.tab === undefined || PREF_TABS.includes(p.tab)) &&
    (p.usage === undefined || typeof p.usage === 'boolean')
  );
}
