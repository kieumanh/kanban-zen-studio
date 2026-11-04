// Sinh dist/dark.css và dist/contrast.css từ toàn bộ CSS nguồn (v1.16.0).
// Mỗi khai báo có màu (chữ, nền, viền, bóng) được ánh xạ sang bảng màu tối / tương phản cao và phát ra dưới bộ chọn có tiền tố
// `:root[data-theme=dark]` / `:root[data-contrast=high]`; khai báo `!important` của nguồn được giữ nguyên `!important` để thắng đúng như bản sáng.
// Dùng: node scripts/generate-themes.mjs [--check]   (--check: không ghi, chỉ báo lỗi nếu tệp sinh ra đã cũ)
import postcss from 'postcss';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Thứ tự nạp trong dist/index.html (dark.css và contrast.css nạp sau cùng nên không nằm trong danh sách nguồn).
export const SOURCES = [
  'style',
  'notes196',
  'workflow111',
  'dashboard',
  'tokens',
  'usability',
  'task-list',
  'experience',
  'habits',
  'studio-zen',
];

// ---- Màu: sRGB <-> OKLab/OKLCH --------------------------------------------------------------------------------------
const toLin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGam = (v) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
function rgbToOklch([r, g, b]) {
  const [R, G, B] = [r, g, b].map((v) => toLin(v / 255));
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), (Math.atan2(bb, a) * 180) / Math.PI];
}
function oklchToRgb([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((v) =>
    Math.round(
      Math.min(1, Math.max(0, toGam(Math.min(1, Math.max(0, v))))) * 255,
    ),
  );
}
// Giảm độ sắc cho tới khi nằm trong gam sRGB (giữ nguyên độ sáng và sắc độ).
function fit(L, C, h) {
  for (let i = 0; i < 12; i++) {
    const a = C * Math.cos((h * Math.PI) / 180);
    const b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) break;
    C *= 0.9;
  }
  return oklchToRgb([L, C, h]);
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---- Ánh xạ theo vai trò ---------------------------------------------------------------------------------------------
// role: 'text' | 'bg' | 'border'. Trả về [r,g,b] mới.
// Màu gần trung tính (trắng, xám nhạt) mất sắc độ khi đổi sáng-tối: gán lại sắc tím thương hiệu rất nhẹ để nền tối không ngả xanh/vàng.
const BRAND_HUE = 305;
const tint = (C, h, base) =>
  C < 0.02 ? [Math.max(C, base), BRAND_HUE] : [C, h];
const DARK = {
  text(L, C, h) {
    if (L >= 0.86) return [L, C, h]; // chữ sáng trên nền đậm (nút, huy hiệu): giữ
    const t = clamp((0.86 - L) / 0.86, 0, 1);
    const [c2, h2] = tint(C * 0.75, h, 0.018);
    return [0.74 + 0.22 * t, c2, h2];
  },
  bg(L, C, h) {
    if (L < 0.7) return [L, C, h]; // nền đậm / bão hòa (nút, thanh tiến độ): giữ để chữ trắng trên đó còn đạt
    let L2;
    let c;
    if (L >= 0.985)
      [L2, c] = [0.215, 0.016]; // trắng: bề mặt thẻ
    else if (L >= 0.95)
      [L2, c] = [lerp(0.205, 0.17, (0.985 - L) / 0.035), 0.015]; // nền trang
    else {
      const x = clamp((0.95 - L) / 0.25, 0, 1); // nền nhấn (tint): càng đậm ở bản sáng, càng sáng ở bản tối
      [L2, c] = [0.21 + x * 0.2, Math.max(C * 0.8, 0.018)];
    }
    const [c2, h2] = tint(c, h, 0.015);
    return [L2, c2, h2];
  },
  border(L, C, h) {
    const [c2, h2] = tint(C * 0.7, h, 0.02);
    if (L >= 0.8) return [0.3 + (1 - L) * 0.6, c2, h2];
    if (L >= 0.5) return [clamp(L + 0.04, 0.55, 0.8), C, h];
    return [0.78, c2, h2];
  },
};
// Tương phản cao: chữ/viền gần đen (hoặc trắng khi nền tối), nền phẳng.
const HC_LIGHT = {
  text(L, C, h) {
    if (L >= 0.86) return [L, C, h];
    return [0.12, 0, h];
  },
  bg(L, C, h) {
    if (L < 0.7) return [L, C, h];
    return [1, 0, h];
  },
  border(L, C, h) {
    if (L >= 0.5) return [0.2, C * 0.3, h];
    return [0.12, 0, h];
  },
};
const HC_DARK = {
  text(L, C, h) {
    if (L >= 0.86) return [L, C, h];
    return [0.97, 0, h];
  },
  bg(L, C, h) {
    if (L < 0.7) return [L, C, h];
    return [0.1, 0, h];
  },
  border(L, C, h) {
    return [0.85, 0, h];
  },
};

// ---- Phân tích giá trị ----------------------------------------------------------------------------------------------
const COLOR_RE =
  /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b/g;
function parseColor(token) {
  const lower = token.toLowerCase();
  if (lower === 'white') return { rgb: [255, 255, 255], a: 1 };
  if (lower === 'black') return { rgb: [0, 0, 0], a: 1 };
  if (lower[0] === '#') {
    let h = lower.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const nums = lower
    .match(/-?\d*\.?\d+%?/g)
    ?.map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)));
  if (!nums || nums.length < 3) return null;
  return {
    rgb: nums.slice(0, 3).map((v) => clamp(Math.round(v), 0, 255)),
    a: nums.length > 3 ? nums[3] : 1,
  };
}
const hex = (v) => v.toString(16).padStart(2, '0');
function format({ rgb, a }) {
  return a >= 0.999
    ? '#' + rgb.map(hex).join('')
    : `rgba(${rgb.join(',')},${+a.toFixed(3)})`;
}
const mapColor = (token, role, table) => {
  const c = parseColor(token);
  if (!c) return token;
  const [L, C, h] = rgbToOklch(c.rgb);
  const [L2, C2, h2] = table[role](L, C, h);
  const rgb = fit(clamp(L2, 0, 1), C2, h2);
  // Trắng/đen thuần giữ trung tính.
  return format({ rgb: C2 < 0.004 ? [rgb[0], rgb[0], rgb[0]] : rgb, a: c.a });
};

const ROLE_BY_PROP = [
  [
    /^(color|caret-color|text-decoration-color|-webkit-text-fill-color|fill|stroke)$/,
    'text',
  ],
  [/^text-decoration$/, 'text'],
  [/^(background|background-color|background-image)$/, 'bg'],
  [
    /^(border|border-(top|right|bottom|left)(-color)?|border-color|border-block(-start|-end)?(-color)?|border-inline(-start|-end)?(-color)?|outline|outline-color|column-rule(-color)?)$/,
    'border',
  ],
];
// Biến tùy chỉnh: chỉ ánh xạ những biến đã liệt kê (còn lại — gradient thương hiệu, kích thước, họa tiết — giữ nguyên).
const ROLE_BY_VAR = {
  '--bg': 'bg',
  '--paper': 'bg',
  '--surface-base': 'bg',
  '--tint': 'bg',
  '--zen-done-bg': 'bg',
  '--zen-done-chip': 'bg',
  '--ink': 'text',
  '--muted': 'text',
  '--text-muted': 'text',
  '--text-primary': 'text',
  '--zen-text-accent': 'text',
  '--zen-text-muted': 'text',
  '--zen-placeholder': 'text',
  '--zen-done-ink': 'text',
  '--line': 'border',
  '--surface-border': 'border',
  '--zen-field-border': 'border',
  '--zen-done-border': 'border',
  '--zen-done-strike': 'border',
};
const roleOf = (prop) => {
  const p = prop.toLowerCase();
  if (p.startsWith('--')) return ROLE_BY_VAR[p] || null;
  for (const [re, role] of ROLE_BY_PROP) if (re.test(p)) return role;
  return null;
};

function mapValue(prop, value, table) {
  const role = roleOf(prop);
  if (!role) return value;
  return value.replace(COLOR_RE, (token) => mapColor(token, role, table));
}

function contextOf(node) {
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && /keyframes|font-face|property/.test(p.name))
      return null;
  }
  return true;
}

function prefixSelector(selector, prefix) {
  const s = selector.trim();
  if (/^(:root|html)\b/.test(s)) return s.replace(/^(:root|html)/, prefix.root);
  return `${prefix.root} ${s}`;
}

function build(table, prefix, title) {
  const out = postcss.root();
  out.append(
    postcss.comment({
      text: ` ${title}\n   Sinh tự động bằng scripts/generate-themes.mjs từ ${SOURCES.length} tệp CSS nguồn. KHÔNG sửa tay: sửa bộ sinh rồi chạy "node scripts/generate-themes.mjs". `,
    }),
  );
  let rules = 0;
  let decls = 0;
  for (const name of SOURCES) {
    const css = readFileSync(root + `dist/${name}.css`, 'utf8');
    const tree = postcss.parse(css, { from: `dist/${name}.css` });
    const copy = (container, target) => {
      container.each((node) => {
        if (
          node.type === 'atrule' &&
          node.nodes &&
          !/keyframes|font-face|property/.test(node.name)
        ) {
          const at = postcss.atRule({ name: node.name, params: node.params });
          copy(node, at);
          if (at.nodes?.length) target.append(at);
        } else if (node.type === 'rule' && contextOf(node)) {
          const changed = [];
          node.each((d) => {
            if (d.type !== 'decl') return;
            const next = mapValue(d.prop, d.value, table);
            if (next !== d.value)
              changed.push(
                postcss.decl({
                  prop: d.prop,
                  value: next,
                  important: d.important,
                }),
              );
          });
          if (!changed.length) return;
          // `:root{--x:...}` ghi đè biến phải thắng bản sáng: tiền tố ở bộ chọn đã tăng độ ưu tiên.
          const rule = postcss.rule({
            selectors: node.selectors.map((s) => prefixSelector(s, prefix)),
          });
          rule.append(changed);
          target.append(rule);
          rules++;
          decls += changed.length;
        }
      });
    };
    copy(tree, out);
  }
  return {
    css: out.toString().replace(/\n{3,}/g, '\n\n') + '\n',
    rules,
    decls,
  };
}

// Ghi đè thủ công cho vài chỗ màu do người dùng chọn (biến CSS đặt từ dữ liệu) mà bộ ánh xạ không thấy được.
const DARK_EXTRA = `
/* Biểu tượng dự án trong ô chọn dự án: màu do người dùng chọn, làm sáng thêm để đạt tương phản trên nền tối. */
:root[data-theme=dark] .task-project-current-icon,
:root[data-theme=dark] .task-project-choice-icon {
  color: color-mix(in srgb, var(--project-choice-color, #7950c8) 50%, white);
}
/* v1.16.2 — Gantt: lưới, nhãn thứ, đường kẻ và mũi tên là thuộc tính SVG viết cứng màu sáng trong gantt.js; gắn lớp để đổi sang nền tối. */
:root[data-theme=dark] .work-chart-track {
  stroke: #2e2835;
}
:root[data-theme=dark] .gantt-svg > text {
  fill: #ece3f4;
}
:root[data-theme=dark] .gantt-svg .gantt-day {
  fill: #1b181f;
}
:root[data-theme=dark] .gantt-svg .gantt-day-off {
  fill: #25202b;
}
:root[data-theme=dark] .gantt-svg .gantt-dow {
  fill: #b5a8c2;
}
:root[data-theme=dark] .gantt-svg .gantt-col-line {
  stroke: #332c3b;
}
:root[data-theme=dark] .gantt-svg .gantt-row-line {
  stroke: #2b2531;
}
:root[data-theme=dark] .gantt-svg .gantt-arrow-head {
  fill: #c3a6e3;
}
:root[data-theme=dark] .gantt-svg .gantt-edge {
  stroke: #c3a6e3;
}
:root[data-theme=dark] .gantt-svg .gantt-today-line {
  stroke: #e58fb3;
}
`;

export function generate() {
  const dark = build(
    DARK,
    { root: ':root[data-theme=dark]' },
    'v1.16.0 — chế độ tối (chọn bằng thuộc tính data-theme="dark" trên <html>, đặt bởi theme.js).',
  );
  const hcLight = build(
    HC_LIGHT,
    { root: ':root[data-contrast=high]' },
    'v1.16.0 — tương phản cao, nền sáng.',
  );
  const hcDark = build(
    HC_DARK,
    { root: ':root[data-theme=dark][data-contrast=high]' },
    'v1.16.0 — tương phản cao, nền tối.',
  );
  const strip = (css) => css.replace(/^\/\*[\s\S]*?\*\/\n+/, '');
  const contrast =
    '/* v1.16.0 — tương phản cao (chọn bằng data-contrast="high" trên <html>, đặt bởi theme.js; tự bật khi hệ điều hành yêu cầu prefers-contrast: more).\n   Sinh tự động bằng scripts/generate-themes.mjs. KHÔNG sửa tay. */\n' +
    strip(hcLight.css) +
    strip(hcDark.css) +
    `/* v1.16.2 — nút "Làm mới" ở Chế độ tập trung: quy tắc cũ (.focus-check-updates, nền trắng, chữ tím) đã bị quy tắc nút chính ghi đè ở chế độ thường, nhưng bản sao có tiền tố chủ đề lại nặng hơn nên thắng và làm nút trắng chữ trắng. Đặt lại nền nút chính. */\n:root[data-contrast=high] button.focus-check-updates,\n:root[data-contrast=high] button.focus-check-updates:hover,\n:root[data-theme=dark][data-contrast=high] button.focus-check-updates,\n:root[data-theme=dark][data-contrast=high] button.focus-check-updates:hover {\n  background: var(--zen-primary-gradient) !important;\n  color: #fff !important;\n}\n` +
    `/* Dấu focus dày, rõ ở cả hai nền. */\n:root[data-contrast=high] :focus-visible {\n  outline: 3px solid #000;\n  outline-offset: 2px;\n}\n:root[data-theme=dark][data-contrast=high] :focus-visible {\n  outline-color: #fff;\n}\n`;
  return {
    'dist/dark.css':
      dark.css +
      '\n:root[data-theme=dark] {\n  color-scheme: dark;\n}\n' +
      DARK_EXTRA,
    'dist/contrast.css': contrast,
    stats: {
      dark: [dark.rules, dark.decls],
      hcLight: [hcLight.rules, hcLight.decls],
      hcDark: [hcDark.rules, hcDark.decls],
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { stats, ...files } = generate();
  const check = process.argv.includes('--check');
  let stale = false;
  for (const [file, body] of Object.entries(files)) {
    if (check) {
      let current = '';
      try {
        current = readFileSync(root + file, 'utf8');
      } catch {}
      if (current !== body) {
        console.error(
          `${file} đã cũ: chạy "node scripts/generate-themes.mjs".`,
        );
        stale = true;
      }
    } else {
      writeFileSync(root + file, body);
      console.log(`${file}: ${(body.length / 1024).toFixed(0)} KB`);
    }
  }
  console.log('rules/declarations', JSON.stringify(stats));
  if (stale) process.exit(1);
}
