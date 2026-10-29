import fs from 'node:fs/promises';
const html = 'dist/index.html',
  content = 'dist/content.js',
  keep = 'dist/keepplus.js',
  build = 'scripts/build.mjs',
  packageFile = 'package.json';
function change(s, a, b, file) {
  if (!s.includes(a))
    throw Error('Missing expected code ' + file + ': ' + a.slice(0, 100));
  return s.replace(a, b);
}
let s = await fs.readFile(content, 'utf8');
s = change(
  s,
  'return media+(n.sketch?',
  "const gallery=(n.images||[]).filter(id=>/^[a-zA-Z0-9_-]{1,100}$/.test(id)).slice(0,20).map(id=>'<img loading=\"lazy\" src=\"'+fileURL(id)+'\" alt=\"Ảnh trong ghi chú\">').join('');return media+(gallery?'<div class=\"note-inline-images\">'+gallery+'</div>':'')+(n.sketch?",
  content,
);
s = change(
  s,
  'n.fileId||=upload.id;save();',
  "if(file.type.startsWith('image/')){n.images||=[];if(n.images.length<20&&!n.images.includes(upload.id))n.images.push(upload.id);}else n.fileId||=upload.id;save();",
  content,
);
s = change(
  s,
  'r.files.map(f=>\`<a class="note-file" href="/api/assets/\${encodeURIComponent(f.id)}">\${svgIcon(\'attach\')}\${esc(f.name)} <small>\${formatSize(f.size)}</small></a>\`).join(\'\')',
  'r.files.map(f=>f.mime?.startsWith(\'image/\')||/\\.(png|jpe?g|webp|gif|avif)$/i.test(f.name)?\`<figure class="inline-note-image"><img src="/api/assets/\${encodeURIComponent(f.id)}?preview=1" loading="lazy" alt="\${esc(f.name)}"><figcaption>\${esc(f.name)}</figcaption></figure>\`:\`<a class="note-file" href="/api/assets/\${encodeURIComponent(f.id)}">\${svgIcon(\'attach\')}\${esc(f.name)} <small>\${formatSize(f.size)}</small></a>\`).join(\'\')',
  content,
);
await fs.writeFile(content, s);
s = await fs.readFile(html, 'utf8');
s = change(
  s,
  '</head>',
  '<link rel="stylesheet" href="/notes196.css"><script src="/notes196.js" defer></script></head>',
  html,
);
s = s.replaceAll('v1.9.5', 'v1.9.6');
await fs.writeFile(html, s);
s = await fs.readFile(build, 'utf8');
s = change(
  s,
  "['/keepplus.js','keepplus.js','text/javascript; charset=utf-8']",
  "['/keepplus.js','keepplus.js','text/javascript; charset=utf-8'],['/notes196.js','notes196.js','text/javascript; charset=utf-8'],['/notes196.css','notes196.css','text/css; charset=utf-8']",
  build,
);
s = s.replaceAll('1.9.5', '1.9.6');
await fs.writeFile(build, s);
s = await fs.readFile(packageFile, 'utf8');
s = change(s, '"version": "1.9.5"', '"version": "1.9.6"', packageFile);
await fs.writeFile(packageFile, s);
console.log('Zen Notes v1.9.6 patch applied');
