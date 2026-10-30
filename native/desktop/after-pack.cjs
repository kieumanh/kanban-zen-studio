const {readdir,writeFile}=require('node:fs/promises');
const path=require('node:path');
module.exports=async context=>{
 if(context.electronPlatformName!=='win32')return;
 const files=[],directories=[];
 async function walk(dir,relative=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
   const rel=path.join(relative,entry.name);
   if(entry.isDirectory()){directories.push(rel);await walk(path.join(dir,entry.name),rel);}else files.push(rel);
  }
 }
 await walk(context.appOutDir);
 const escape=value=>value.split(path.sep).join('\\').replace(/\$/g,()=> '$$').replace(/"/g,'$\\"');
 const script=[...files.map(file=>'Delete "$INSTDIR\\'+escape(file)+'"'),...directories.sort((a,b)=>b.split(path.sep).length-a.split(path.sep).length).map(dir=>'RMDir "$INSTDIR\\'+escape(dir)+'"'),'Delete "$INSTDIR\\Uninstall.exe"','RMDir "$INSTDIR"'].join('\n');
 await writeFile(path.join(path.dirname(context.appOutDir),'uninstall-files.nsh'),script+'\n');
};
