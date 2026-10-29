import {mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function buildStaticAssets(files,root,version,source){
 const out=root+'public/';rmSync(out,{recursive:true,force:true});mkdirSync(out+'static',{recursive:true});
 const mapping={};
 for(const [url,file] of Object.entries(files)){
  if(!/\.(js|css)$/.test(url)||url==='/sw.js')continue;
  const digest=createHash('sha256').update(file.body).digest('hex').slice(0,16);
  mapping[url]='/static/'+url.slice(1).replace(/(\.[^.]+)$/,'.'+digest+'$1');
 }
 const write=(url,body)=>writeFileSync(out+(url==='/'?'index.html':url.slice(1)),body);
 for(const [url,file]of Object.entries(files)){
  if(url==='/sw.js')continue;
  let body=file.binary?Buffer.from(file.body,'base64'):file.body;
  if(file.type.startsWith('text/html'))for(const [plain,hashed] of Object.entries(mapping))body=body.replaceAll('"'+plain+'"','"'+hashed+'"');
  write(url,body);
  if(mapping[url])write(mapping[url],body);
 }
 const shell=Object.keys(files).filter(u=>u!=='/sw.js'&&!u.startsWith('/report')&&!files[u].binary).concat(Object.values(mapping).filter(u=>!u.includes('/report.')));
 const swSource=files['/sw.js'].body.replace(/const SHELL_CACHE=.*?;/,"const SHELL_CACHE='zen-shell-"+createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,20)+"';").replace(/const SHELL_ASSETS=.*?;/,'const SHELL_ASSETS='+JSON.stringify(shell)+';');
 write('/sw.js',swSource);
 writeFileSync(out+'_headers',String.raw`/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; media-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
/static/*
  Cache-Control: public, max-age=31536000, immutable
/sw.js
  Cache-Control: no-cache
`);
 const prefix=source.slice(0,source.lastIndexOf('\nconst files='));
 writeFileSync(root+'worker-api.mjs',prefix+'\nexport default {async scheduled(event,env,ctx){ctx.waitUntil(daily(env));},async fetch(request,env){const path=new URL(request.url).pathname;if(path.startsWith("/api/"))return api(request,env);if(path==="/health")return Response.json({ok:true,version:'+JSON.stringify(version)+'});return env.ASSETS.fetch(request);}};\n');
 console.log('Static Assets: '+Object.keys(mapping).length+' fingerprinted JS/CSS files; production Worker has no embedded assets.');
}
