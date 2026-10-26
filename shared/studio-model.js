/* Shared, dependency-free domain rules for Kanban Zen Studio 2.0. */
function zenShift(day, amount) { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); }
function zenWeek(day) { const dow = new Date(day + 'T12:00:00Z').getUTCDay(); const start = zenShift(day, -((dow + 6) % 7)); return {start, end:zenShift(start, 6)}; }
function zenTaskChanges(before, after) {
 const fields = {title:'Tiêu đề', description:'Nội dung', col:'Trạng thái', due:'Hạn hoàn thành', start:'Bắt đầu', end:'Kết thúc', priority:'Mức độ', checks:'Checklist', noteIds:'Ghi chú liên quan', recurrence:'Lặp lại'};
 return Object.entries(fields).filter(([k])=>JSON.stringify(before[k]??'')!==JSON.stringify(after[k]??'')).map(([k,label])=>({field:k,label,before:k==='checks'?`${(before.checks||[]).filter(c=>c.done).length}/${(before.checks||[]).length} hoàn tất`:k==='noteIds'?`${(before.noteIds||[]).length} ghi chú`:String(before[k]||'Chưa đặt').slice(0,220),after:k==='checks'?`${after.checks.filter(c=>c.done).length}/${after.checks.length} hoàn tất`:k==='noteIds'?`${(after.noteIds||[]).length} ghi chú`:String(after[k]||'Chưa đặt').slice(0,220)}));
}
function zenRank(tasks, day) {return [...tasks].filter(t=>t.col!=='Done').sort((a,b)=>{const score=t=>(t.due&&t.due<day?0:t.due===day?1:t.priority==='q1'?2:t.priority==='q2'?3:t.col==='Doing'?4:5);return score(a)-score(b)||(a.due||'9999').localeCompare(b.due||'9999')||a.title.localeCompare(b.title,'vi');});}
function zenFreshTask(source, id, column='List') {
 return {id:id(),title:source.title||'Công việc mới',description:source.description||'',tag:source.tag||'',col:column,due:'',start:'',end:'',priority:source.priority||'',labels:structuredClone(source.labels||[]),checks:(source.checks||[]).map(c=>({id:id(),text:c.text,done:false})),noteIds:[],comments:[],history:[]};
}
function zenTemplatePayload(kind, source) {
 if(kind==='project')return {name:source.name,description:source.description,color:source.color,icon:source.icon,columns:[...source.columns],tasks:source.tasks.map(t=>zenTemplatePayload('task',t)),dependencies:[]};
 if(kind==='task'||kind==='checklist')return {title:source.title,description:kind==='task'?source.description:'',tag:source.tag||'',priority:source.priority||'',labels:source.labels||[],checks:source.checks.map(c=>({text:c.text,done:false}))};
 return {title:source.title,text:source.text,group:source.group||'',url:source.url||'',color:source.color||'#7950c8',type:['note','todo','link'].includes(source.type)?source.type:'note',items:(source.items||[]).map(i=>({text:i.text,done:false}))};
}
function zenValidTemplate(t) {
 try {
  const v=JSON.parse(t.payload),str=(x,n)=>typeof x==='string'&&x.length<=n,checks=x=>Array.isArray(x)&&x.length<=200&&x.every(c=>c&&str(c.text,300)&&c.text.trim()),task=x=>x&&str(x.title,200)&&x.title.trim()&&str(x.description,5000)&&str(x.tag,40)&&checks(x.checks);
  if(!v||typeof v!=='object'||Array.isArray(v))return false;
  if(t.kind==='project')return str(v.name,100)&&v.name.trim()&&str(v.description,2000)&&str(v.icon,8)&&/^#[a-f0-9]{6}$/i.test(v.color)&&Array.isArray(v.columns)&&v.columns.length<=20&&['Idea','List','Doing','Done'].every(c=>v.columns.includes(c))&&v.columns.every(c=>str(c,40)&&c.trim())&&Array.isArray(v.tasks)&&v.tasks.length<=2000&&v.tasks.every(task);
  if(t.kind==='task'||t.kind==='checklist')return !!task(v);
  return str(v.title,150)&&str(v.text,10000)&&str(v.group,80)&&str(v.url,2000)&&(!v.url||/^https?:\/\//i.test(v.url))&&/^#[a-f0-9]{6}$/i.test(v.color)&&['note','todo','link'].includes(v.type)&&Array.isArray(v.items)&&v.items.length<=200&&v.items.every(c=>c&&str(c.text,300)&&typeof c.done==='boolean');
 }catch{return false;}
}
function validStudioData(d) {
 const str=(v,n)=>typeof v==='string'&&v.length<=n, id=v=>str(v,100)&&/^[A-Za-z0-9_-]+$/.test(v), arr=(v,n,fn)=>v===undefined||Array.isArray(v)&&v.length<=n&&v.every(fn), unique=v=>!v||new Set(v.map(x=>x.id)).size===v.length, ids=v=>arr(v,100,id)&&(!v||new Set(v).size===v.length);
 if(!d.projects.every(p=>ids(p.noteIds)&&p.tasks.every(t=>ids(t.noteIds)&&(t.focus===undefined||typeof t.focus==='boolean')&&(t.recurrence===undefined||['','daily','weekly'].includes(t.recurrence))&&arr(t.comments,100,c=>c&&id(c.id)&&str(c.text,2000)&&str(c.author,100)&&Number.isFinite(c.at))&&unique(t.comments)&&arr(t.history,80,h=>h&&id(h.id)&&Number.isFinite(h.at)&&str(h.label,200)&&str(h.before,220)&&str(h.after,220))&&unique(t.history))))return false;
 if(!arr(d.notes,500,n=>!n.projectId||id(n.projectId)))return false;
 const z=d.studio;if(z===undefined)return true;if(!z||typeof z!=='object'||Array.isArray(z))return false;
 return arr(z.templates,60,t=>t&&id(t.id)&&str(t.name,100)&&['project','task','checklist','note'].includes(t.kind)&&str(t.payload,200000)&&zenValidTemplate(t))&&unique(z.templates)&&arr(z.filters,30,f=>f&&id(f.id)&&str(f.name,100)&&str(f.project,100)&&str(f.status,40)&&str(f.priority,10)&&str(f.query,200)&&['due','title','priority','progress'].includes(f.sort))&&unique(z.filters)&&arr(z.reviews,52,r=>r&&id(r.id)&&str(r.week,10)&&str(r.wins,4000)&&str(r.blockers,4000)&&str(r.plan,4000)&&Number.isFinite(r.at))&&unique(z.reviews);
}
