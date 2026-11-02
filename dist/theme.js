// v1.16.0: chế độ tối và tương phản cao. Chạy đồng bộ trong <head> (trước khi vẽ) để không chớp sáng-tối.
// Lưu lựa chọn trong localStorage (chỉ trên thiết bị này, không đồng bộ lên máy chủ):
//   zen-theme:    'system' (mặc định) | 'light' | 'dark'
//   zen-contrast: 'system' (mặc định) | 'normal' | 'high'
// 'system' theo `prefers-color-scheme` / `prefers-contrast` của hệ điều hành và tự cập nhật khi người dùng đổi.
(function () {
  var root = document.documentElement;
  var dark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var more = window.matchMedia ? matchMedia('(prefers-contrast: more)') : null;
  function read(key, allowed) {
    try {
      var value = localStorage.getItem(key);
      return allowed.indexOf(value) >= 0 ? value : 'system';
    } catch (e) {
      return 'system';
    }
  }
  function state() {
    var theme = read('zen-theme', ['light', 'dark']);
    var contrast = read('zen-contrast', ['normal', 'high']);
    return {
      theme: theme,
      contrast: contrast,
      dark: theme === 'dark' || (theme === 'system' && !!dark && dark.matches),
      high: contrast === 'high' || (contrast === 'system' && !!more && more.matches),
    };
  }
  function apply() {
    var s = state();
    root.setAttribute('data-theme', s.dark ? 'dark' : 'light');
    if (s.high) root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', s.dark ? '#151219' : '#f7f3fc');
    // v1.17.0: báo cho nút chuyển sáng/tối trên thanh trên cùng cập nhật biểu tượng (đổi từ Cài đặt, từ nút hoặc theo hệ thống).
    try {
      document.dispatchEvent(new CustomEvent('zen-theme', { detail: s }));
    } catch (e) {}
    return s;
  }
  function set(key, value) {
    try {
      if (value === 'system') localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {}
    return apply();
  }
  apply();
  if (dark && dark.addEventListener) dark.addEventListener('change', apply);
  if (more && more.addEventListener) more.addEventListener('change', apply);
  window.zenTheme = {
    state: state,
    apply: apply,
    setTheme: function (value) {
      return set('zen-theme', value);
    },
    setContrast: function (value) {
      return set('zen-contrast', value);
    },
  };
})();
