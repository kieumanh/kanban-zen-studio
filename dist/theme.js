// v1.16.0: chế độ tối và tương phản cao. Chạy đồng bộ trong <head> (trước khi vẽ) để không chớp sáng-tối.
// Lưu lựa chọn trong localStorage (chỉ trên thiết bị này, không đồng bộ lên máy chủ):
//   zen-theme:    'system' (mặc định) | 'light' | 'dark'
//   zen-contrast: 'system' (mặc định) | 'normal' | 'high'
//   zen-style:    'zen' (mặc định, phong cách Thiền) | 'giangho' (v1.86.0, phong cách Giang hồ → data-style="giangho")
//   zen-gh-words: (mặc định: bật lời lẽ giang hồ) | 'off' (v1.96.0, Giang hồ nhẹ: giữ họa tiết, chữ quen thuộc → data-gh-words="off")
//   zen-gh-fx:    (mặc định: bật) | 'off' (v1.97.0, tắt ấn son công thành và nén hương bế quan → data-gh-fx="off")
//   zen-gh-columns: (mặc định: tắt) | 'on' (v2.1.0, tên cột mặc định theo giang hồ khi hiển thị → data-gh-columns="on")
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
    var style = read('zen-style', ['giangho']) === 'giangho' ? 'giangho' : 'zen';
    var words = read('zen-gh-words', ['off']) !== 'off';
    var fx = read('zen-gh-fx', ['off']) !== 'off';
    var columns = read('zen-gh-columns', ['on']) === 'on';
    return {
      theme: theme,
      contrast: contrast,
      style: style,
      words: words,
      fx: fx,
      columns: columns,
      dark: theme === 'dark' || (theme === 'system' && !!dark && dark.matches),
      high: contrast === 'high' || (contrast === 'system' && !!more && more.matches),
    };
  }
  function apply() {
    var s = state();
    root.setAttribute('data-theme', s.dark ? 'dark' : 'light');
    if (s.high) root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');
    if (s.style === 'giangho') {
      root.setAttribute('data-style', 'giangho');
      preloadFonts();
    } else root.removeAttribute('data-style');
    if (s.style === 'giangho' && !s.words) root.setAttribute('data-gh-words', 'off');
    else root.removeAttribute('data-gh-words');
    if (s.style === 'giangho' && !s.fx) root.setAttribute('data-gh-fx', 'off');
    else root.removeAttribute('data-gh-fx');
    if (s.style === 'giangho' && s.columns) root.setAttribute('data-gh-columns', 'on');
    else root.removeAttribute('data-gh-columns');
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', s.style === 'giangho' ? (s.dark ? '#1c1814' : '#f3ecdf') : s.dark ? '#151219' : '#f7f3fc');
    // v1.17.0: báo cho nút chuyển sáng/tối trên thanh trên cùng cập nhật biểu tượng (đổi từ Cài đặt, từ nút hoặc theo hệ thống).
    try {
      document.dispatchEvent(new CustomEvent('zen-theme', { detail: s }));
    } catch (e) {}
    return s;
  }
  // v1.94.0 (Khinh Công): phong cách Giang hồ thì tải sớm phông Noto Serif đậm 600 (tiêu đề) song song với CSS, khỏi đợi trình duyệt
  // đọc xong giangho.css mới biết cần phông. Phong cách Thiền không tải.
  var fontsQueued = false;
  function preloadFonts() {
    if (fontsQueued || !document.head) return;
    fontsQueued = true;
    // v2.9.0 (Thư Pháp): thêm phông bút lông Potta One của tiêu đề.
    ['noto-serif-vietnamese-600.v1.woff2', 'noto-serif-latin-600.v1.woff2', 'potta-one-vietnamese-400.v1.woff2', 'potta-one-latin-400.v1.woff2'].forEach(function (name) {
      var link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = '/fonts/' + name;
      document.head.appendChild(link);
    });
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
    // v1.86.0: 'zen' xóa khóa (về mặc định), 'giangho' lưu lại.
    setStyle: function (value) {
      return set('zen-style', value === 'giangho' ? 'giangho' : 'system');
    },
    // v1.96.0 (Chú Giải): bật (mặc định, xóa khóa) / tắt lời lẽ giang hồ. Chỉ có tác dụng khi phong cách là Giang hồ.
    setWords: function (on) {
      return set('zen-gh-words', on ? 'system' : 'off');
    },
    // v1.97.0 (Ấn Son): bật (mặc định, xóa khóa) / tắt hiệu ứng ấn son, nén hương của Giang hồ.
    setFx: function (on) {
      return set('zen-gh-fx', on ? 'system' : 'off');
    },
    // v2.1.0 (Danh Trận): bật / tắt (mặc định, xóa khóa) tên cột mặc định theo giang hồ.
    setColumns: function (on) {
      return set('zen-gh-columns', on ? 'on' : 'system');
    },
  };
})();
