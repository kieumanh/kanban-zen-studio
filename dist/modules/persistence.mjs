let opening;
function open(){return opening ||= new Promise((resolve,reject)=>{const r=indexedDB.open('kanban-zen-local-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Hãy đóng tab Kanban cũ để nâng cấp bộ nhớ.'));});}
export async function get(key){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records'),r=tx.objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function set(key,value){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function loadAccount(key){const existing=await get(key);if(existing)return existing;const raw=localStorage.getItem(key);if(!raw)return null;const record={data:JSON.parse(raw),meta:JSON.parse(localStorage.getItem(key+'-sync')||'{}')};await set(key,record);return record;}
export async function saveAccount(key,record){await set(key,record);localStorage.removeItem(key);localStorage.removeItem(key+'-sync');}
export async function usage(){return navigator.storage?.estimate?await navigator.storage.estimate():{};}
