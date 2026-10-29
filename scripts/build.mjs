import {buildStaticAssets} from './static-build.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {stripModuleSyntax, validateAssets} from './build-utils.mjs';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(root+'package.json','utf8'));
const assets=JSON.parse(readFileSync(root+'scripts/assets.json','utf8'));
validateAssets(assets);
const files=Object.fromEntries(assets.map(([url,file,type])=>[url,{body:readFileSync(root+'dist/'+file,'utf8'),type}]));
const shell=Object.keys(files).filter(url=>url!=='/sw.js'&&!url.startsWith('/report'));
const shellVersion=createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,20);
files['/sw.js'].body=files['/sw.js'].body.replace('__SHELL_VERSION__',shellVersion).replace('__SHELL_ASSETS__',JSON.stringify(shell));
files['/bamboo.ogg']={body:readFileSync(root+'dist/bamboo.ogg.b64','utf8').trim(),type:'audio/ogg',binary:true};
files['/og-kanban.png']={body:readFileSync(root+'dist/og-kanban.png').toString('base64'),type:'image/png',binary:true};
const source=`// Generated with node scripts/build.mjs. Edit files in dist/ instead.\n${stripModuleSyntax(readFileSync(root+'server/task-workflow.mjs','utf8'))}\n${stripModuleSyntax(readFileSync(root+'server/api.mjs','utf8'))}\n${stripModuleSyntax(readFileSync(root+'server/report-sharing.mjs','utf8'))}\n${stripModuleSyntax(readFileSync(root+'server/resources.mjs','utf8'))}\n${stripModuleSyntax(readFileSync(root+'server/reports.mjs','utf8'))}\n${stripModuleSyntax(readFileSync(root+'server/storage.mjs','utf8'))}\nconst files=${JSON.stringify(files)};\nexport default {async scheduled(event,env,ctx){ctx.waitUntil(daily(env));},async fetch(request,env){const path=new URL(request.url).pathname;if(path.startsWith('/api/'))return api(request,env);if(path==='/health')return Response.json({ok:true,version:${JSON.stringify(version)}});if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});const file=files[path];if(!file)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:file.binary?Uint8Array.from(atob(file.body),c=>c.charCodeAt(0)):file.body,{headers:{'Content-Type':file.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; media-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"}});}};\n`;
new Script(source.slice(0,source.indexOf('\nexport default')));
writeFileSync(root+'worker.mjs',source);
console.log('Built Worker v'+version+': '+Buffer.byteLength(source)+' bytes');



buildStaticAssets(files,root,version,source);
