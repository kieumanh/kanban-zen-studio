const {app,BrowserWindow,session,net,dialog,shell}=require('electron');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {existsSync}=require('node:fs');
const ORIGIN='https://kanban.huongthiennature.com';
app.setAppUserModelId('com.huongthiennature.kanban');
if(!app.requestSingleInstanceLock())app.quit();
let win;
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
app.whenReady().then(async()=>{
 const ses=session.fromPartition('persist:kanban-zen');
 const root=path.resolve(__dirname,'../../public');
 await ses.protocol.handle('https',async request=>{
  const url=new URL(request.url);
  if(url.origin===ORIGIN&&!url.pathname.startsWith('/api/')&&['GET','HEAD'].includes(request.method)){
   let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('',{status:400});}
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root+path.sep))return new Response('',{status:403});
   if(existsSync(file))return net.fetch(pathToFileURL(file).toString());
   return new Response('Bundled resource not found',{status:404});
  }
  return ses.fetch(request,{bypassCustomProtocolHandlers:true});
 });
 ses.setPermissionRequestHandler((_wc,permission,cb)=>cb(permission==='notifications'));
 win=new BrowserWindow({width:1280,height:840,minWidth:360,minHeight:580,title:'Kanban Zen Studio',backgroundColor:'#f7f3fc',webPreferences:{session:ses,nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))shell.openExternal(url);return {action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==ORIGIN){event.preventDefault();if(/^https:\/\//.test(url))shell.openExternal(url);}});
 await win.loadURL(ORIGIN+'/');
 // Download updates automatically; installation always requires a deliberate action.
 if(app.isPackaged){
  const {autoUpdater}=require('electron-updater');autoUpdater.autoInstallOnAppQuit=false;
  autoUpdater.on('error',error=>console.warn('Update check:',error.message));
  autoUpdater.on('update-downloaded',async()=>{const choice=await dialog.showMessageBox(win,{type:'info',message:'Có phiên bản Kanban mới',detail:'Hãy lưu và đồng bộ công việc trước khi khởi động lại.',buttons:['Để sau','Đã lưu · Cài và khởi động lại'],defaultId:0,cancelId:0});if(choice.response===1)autoUpdater.quitAndInstall();});
  const check=()=>autoUpdater.checkForUpdates().catch(()=>{});check();setInterval(check,6*60*60*1000).unref();
 }
});
app.on('window-all-closed',()=>app.quit());
