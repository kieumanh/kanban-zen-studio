export function flatten(workspace) {
  const root = structuredClone(workspace), entries = {};
  root.projects = (workspace.projects || []).map(p => p.id);
  root.notes = (workspace.notes || []).map(n => n.id);
  root.trash = (workspace.trash || []).map(n => n.id);
  root.taskTemplates = (workspace.taskTemplates || []).map(n => n.id);
  root.dailyHabits = (workspace.dailyHabits || []).map(n => n.id);
  entries['root:root'] = root;
  for (const p of workspace.projects || []) {
    entries['project:' + p.id] = {...p, tasks: p.tasks.map(t => t.id)};
    for (const t of p.tasks) entries['task:' + t.id] = t;
  }
  for (const [kind, items] of [['note',workspace.notes],['trash',workspace.trash],['template',workspace.taskTemplates],['habit',workspace.dailyHabits]])
    for (const item of items || []) entries[kind + ':' + item.id] = item;
  return entries;
}
export function inflate(entries) {
  const root = structuredClone(entries['root:root'] || {schema:1,projects:[],notes:[]});
  const get = (kind,id) => {const value=entries[kind+':'+id];if(!value)throw Error('Thiếu bản ghi '+kind);return structuredClone(value);};
  root.projects=(root.projects||[]).map(id=>{const p=get('project',id);p.tasks=p.tasks.map(id=>get('task',id));return p;});
  for(const [field,kind]of [['notes','note'],['trash','trash'],['taskTemplates','template'],['dailyHabits','habit']])root[field]=(root[field]||[]).map(id=>get(kind,id));
  return root;
}
export function changesBetween(base,next){const before=flatten(base),after=flatten(next),changes=[];for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(JSON.stringify(before[key])!==JSON.stringify(after[key]))changes.push({key,value:after[key]??null});return changes;}
