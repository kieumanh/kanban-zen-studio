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
