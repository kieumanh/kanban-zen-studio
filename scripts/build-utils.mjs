// The server bundle accepts named declarations and static imports only.
// Anchoring to declarations keeps string literals and comments unchanged.
export function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[^;]+;\r?\n/gm, '')
    .replace(
      /^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm,
      '',
    );
}

export function validateAssets(assets) {
  const routes = new Set();
  for (const entry of assets) {
    if (!Array.isArray(entry) || entry.length !== 3)
      throw Error('Invalid asset entry');
    const [route, file, type] = entry;
    if (
      typeof route !== 'string' ||
      !route.startsWith('/') ||
      routes.has(route)
    ) {
      throw Error('Duplicate or invalid asset route: ' + route);
    }
    if (
      typeof file !== 'string' ||
      !/^[\w./-]+$/.test(file) ||
      file.includes('..') ||
      file.startsWith('/')
    ) {
      throw Error('Asset must be a file inside dist: ' + file);
    }
    if (typeof type !== 'string' || !type.trim())
      throw Error('Missing asset MIME type');
    routes.add(route);
  }
}

// v2.37.0 (Tải Theo Nhu Cầu): các nhóm tệp chỉ tải khi cần (đánh dấu trong dist/index.html). Service worker không lưu sẵn chúng lúc cài
// đặt; nhóm được lưu khi người dùng thật sự mở tới nó, và được giữ tươi qua các lần cập nhật nếu người đó đã từng dùng.
export function lazyGroups(html, files = {}) {
  const groups = {};
  const add = (group, url) =>
    (groups[group] ||= []).includes(url) ? 0 : groups[group].push(url);
  for (const m of html.matchAll(
    /<script type="zen\/lazy" data-lazy="([^"]+)" src="([^"]+)"><\/script>/g,
  ))
    add(m[1], m[2]);
  for (const m of html.matchAll(
    /<link rel="zen-lazy" data-lazy="([^"]+)" href="([^"]+)">/g,
  ))
    add(m[1], m[2]);
  for (const m of html.matchAll(
    /<script src="[^"]+" data-css="([^"]+)" data-need="([^"]+)"><\/script>/g,
  ))
    add(m[2], m[1]);
  // Phông chữ chỉ dùng cho giangho.css.
  for (const url of Object.keys(files))
    if (url.startsWith('/fonts/')) add('giangho', url);
  return groups;
}
