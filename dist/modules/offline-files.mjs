const LIMIT=25000000,QUOTA=250000000;
let opening;
function database(){return opening||=new Promise((resolve,reject)=>{const r=indexedDB.open('zen-offline-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(mode,run){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('files',mode),store=tx.objectStore('files');let value;run(store,v=>value=v,tx);tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Không lưu được tệp.'));});}
export function list(owner){return transaction('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result.filter(f=>f.owner===owner));});}
export function put(record){return transaction('readwrite',(s)=>s.put(record));}
export async function enqueue(owner,scope,file){
 if(!owner||!scope||!file.size||file.size>LIMIT)throw Error('Mỗi tệp phải lớn hơn 0 và tối đa 25 MB.');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
 const key=JSON.stringify([owner,scope,digest]);
 return transaction('readwrite',(s,done,tx)=>{
  const r=s.getAll();r.onsuccess=()=>{const records=r.result;if(records.some(f=>f.key===key)){done(records.find(f=>f.key===key));return;}if(records.filter(f=>f.owner===owner).reduce((n,f)=>n+f.size,0)+file.size>QUOTA){tx.abort();return;}
   const record={key,owner,scope,digest,name:file.name,mime:file.type||'application/octet-stream',size:file.size,blob:file,status:'queued',created:Date.now()};s.put(record);done(record);
  };
 });
}
export async function verify(record){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await record.blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')===record.digest;}
export function remove(key){return transaction('readwrite',s=>s.delete(key));}
