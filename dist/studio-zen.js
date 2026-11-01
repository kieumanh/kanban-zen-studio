/* Progressive board controls. Workspace limits sync; display preferences stay on this device. */
(() => {
  const prefs = new Map();
  const timers = new Map();
  let palette, returnFocus, commands = [], chosen = 0;
  // v1.15.38: chưa từng chọn thì Thẻ gọn mặc định bật trên điện thoại (≤700px) và tắt ở màn hình rộng; đã chọn thì giữ đúng lựa chọn của người dùng.
  const compact = () => {
    const saved = localRead('zen-compact');
    return saved === null ? matchMedia('(max-width:700px)').matches : saved === 'true';
  };
  const editable = () => !contentReadOnly;
  // v1.15.36: đầu trang dự án chỉ giữ một nút chính; Ghim / Lưu trữ / Tệp / Sửa dự án vào menu "Tùy chọn".
  function tidyHeader() {
    const tools = document.querySelector('#main .board-head .board-tools');
    if (!tools || tools.querySelector('.wf-project-menu')) return;
    const items = ['[data-project-pin]', '[data-project-archive]', '[data-files]', '[data-action="edit-project"]'].map((selector) => tools.querySelector(selector)).filter(Boolean);
    if (!items.length) return;
    const edit = tools.querySelector('[data-action="edit-project"]');
    if (edit) [...edit.childNodes].filter((node) => node.nodeType === 3).forEach((node) => { node.textContent = 'Sửa dự án'; });
    const menu = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('div');
    menu.className = 'wf-project-menu'; summary.textContent = 'Tùy chọn'; list.className = 'wf-project-menu-list';
    list.append(...items); menu.append(summary, list);
    tools.insertBefore(menu, tools.querySelector('[data-action="new-task"]'));
  }
  // v1.15.36: "x/y việc xong" là số chính; phần trăm (tính cả mục checklist) là chú thích nhỏ.
  function tidySummary(p) {
    const box = document.querySelector('#main .board-summary');
    if (!box || box.dataset.summary === 'v1.15.36' || typeof progress !== 'function' || typeof bar !== 'function') return;
    const tasks = p.tasks.filter((t) => !t.archived), done = tasks.filter((t) => t.col === 'Done').length, pr = progress(tasks);
    const note = !tasks.length ? 'Chưa có việc nào' : pr.pct + '% tiến độ' + (pr.total !== tasks.length ? ' · tính cả mục checklist (' + pr.done + '/' + pr.total + ')' : '');
    box.dataset.summary = 'v1.15.36';
    box.innerHTML = '<div class="summary-main"><strong style="color:' + esc(p.color) + '">' + (tasks.length ? done + '/' + tasks.length : '0') + '</strong><span>' + (tasks.length ? 'việc xong' : 'việc') + '</span></div><div class="grow">' + bar(pr.pct, p.color) + '<p>' + esc(note) + '</p></div>';
  }
  document.addEventListener('click', (e) => {
    const inMenu = e.target.closest('.wf-project-menu');
    document.querySelectorAll('.wf-project-menu[open]').forEach((menu) => { if (menu !== inMenu || e.target.closest('.wf-project-menu-list button')) menu.open = false; });
    if (e.target.closest('.wf-project-menu > summary')) document.querySelectorAll('.wf-display-options[open]').forEach((d) => { d.open = false; });
    if (e.target.closest('.wf-display-options > summary')) document.querySelectorAll('.wf-project-menu[open]').forEach((d) => { d.open = false; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const menu = document.querySelector('.wf-project-menu[open]');
    if (menu) { menu.open = false; menu.querySelector('summary')?.focus(); }
  });
  function paint() {
    const board = document.querySelector('#main .board'), p = project();
    if (board && p && view === 'projects') {
      board.classList.toggle('studio-compact', compact());
      // v1.15.37: Thẻ gọn, Giới hạn WIP và Lệnh nhanh nằm trong menu "Hiển thị"; chỉ khi menu không có (lỗi dựng) mới quay về thanh công cụ riêng.
      const panel = document.querySelector('#main .board-head .kanban-options');
      let toolbar = null;
      if (panel && !panel.querySelector('[data-studio]')) {
        panel.insertAdjacentHTML('beforeend', '<label class="wf-display-compact"><input type="checkbox" data-studio="compact"'+(compact()?' checked':'')+'> Thẻ gọn</label><div class="wf-display-actions" role="group" aria-label="Công cụ bảng"><button type="button" class="btn" data-studio="wip">Giới hạn WIP</button><button type="button" class="btn" data-studio="commands">Lệnh nhanh <kbd>Ctrl / ⌘ K</kbd></button></div>');
      } else if (!panel) {
        toolbar = document.createElement('div'); toolbar.className = 'studio-board-tools';
        toolbar.innerHTML = '<span>Mỗi việc một khoảng thở</span><button type="button" class="btn" data-studio="compact" aria-pressed="'+compact()+'">'+(compact()?'Thẻ đầy đủ':'Thẻ gọn')+'</button><button type="button" class="btn" data-studio="wip">Giới hạn WIP</button><button type="button" class="btn" data-studio="commands">Lệnh nhanh <kbd>Ctrl / ⌘ K</kbd></button>';
        board.before(toolbar);
      }
      tidyHeader();
      tidySummary(p);
      const nav = document.createElement('nav'); nav.className = 'studio-column-tabs'; nav.setAttribute('aria-label','Chuyển cột Kanban');
      const columns = [...board.querySelectorAll('.column')];
      columns.forEach((column, i) => {
        const key = column.dataset.column, count = p.tasks.filter(t=>!t.archived&&t.col===key).length, limit = p.wipLimits?.[key] || 0;
        const badge = document.createElement('span'); badge.className = 'studio-wip'+(limit&&count>limit?' is-over':'');
        badge.textContent = limit ? count+'/'+limit : count+' việc';
        badge.title = limit ? 'Giới hạn WIP: '+limit+(count>limit?' · Vượt '+(count-limit)+' việc. Hãy hoàn tất một việc trước khi bắt đầu thêm.':'') : 'Chưa đặt giới hạn WIP';
        column.querySelector('.column-title')?.after(badge);
        if (!count) { const empty = document.createElement('p'); empty.className='studio-empty'; empty.textContent=key==='Done'?'Một việc hoàn thành, một khoảng nhẹ lòng.':'Bắt đầu từ một việc nhỏ. Dùng nút “Thêm công việc” bên dưới.'; badge.after(empty); }
        const tab=document.createElement('button'); tab.type='button'; tab.textContent=columnDisplayName(p,key)+' · '+count;tab.dataset.studioColumn=String(i);tab.setAttribute('aria-pressed',String((prefs.get(p.id)||0)===i));nav.append(tab);
      });
      toolbar ? toolbar.after(nav) : board.before(nav);
      const mobile = matchMedia('(max-width:700px)').matches;
      if(mobile) requestAnimationFrame(()=>{board.scrollLeft=(columns[prefs.get(p.id)||0]?.offsetLeft||0)-(columns[0]?.offsetLeft||0);});
      let scrollFrame;
      board.addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(()=>{if(!matchMedia('(max-width:700px)').matches)return;const index=columns.reduce((best,col,i)=>Math.abs(col.getBoundingClientRect().left-board.getBoundingClientRect().left)<Math.abs(columns[best].getBoundingClientRect().left-board.getBoundingClientRect().left)?i:best,0);prefs.set(p.id,index);nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));});},{passive:true});
    }
    const panel=document.querySelector('.wf-focus-workspace > article');
    if(panel && _WF.focus){
      const key=_WF.focus.p+':'+_WF.focus.t;
      const box=document.createElement('details');box.className='studio-pomodoro';box.innerHTML='<summary>Đồng hồ tập trung · tùy chọn</summary><p>25 phút tập trung, rồi chủ động nghỉ 5 phút.</p><output aria-label="Thời gian còn lại">25:00</output><div><button type="button" class="btn" data-studio="timer" data-timer-key="'+esc(key)+'">Bắt đầu</button><button type="button" class="btn" data-studio="reset" data-timer-key="'+esc(key)+'">Đặt lại</button></div><span role="status" class="studio-timer-status"></span>';panel.prepend(box);updateClock();
    }
  }
  const before=render;render=function(...args){const result=before.apply(this,args);paint();return result;};
  function wipForm(){
    const p=project();if(!p||!editable())return notify('Không thể chỉnh sửa trong chế độ chỉ xem.');
    modal('<h2>Giới hạn công việc mỗi cột</h2><p>Cảnh báo mềm để giữ nhịp làm việc. Đặt 0 để không giới hạn.</p>'+p.columns.map((key,i)=>'<label class="studio-limit">'+esc(columnDisplayName(p,key))+'<input type="number" name="limit'+i+'" min="0" max="2000" step="1" required value="'+(p.wipLimits?.[key]||0)+'"></label>').join(''),fd=>{
      const current=project(p.id);if(!current)return;const limits=Object.fromEntries(p.columns.map((key,i)=>[key,Number(fd.get('limit'+i))]));
      if(!Object.values(limits).every(v=>Number.isInteger(v)&&v>=0&&v<=2000))return notify('Giới hạn phải là số nguyên từ 0 đến 2000.');
      current.wipLimits=limits;if(save()===false)return;document.querySelector('#editor').close();render();notify('Đã lưu giới hạn WIP.');
    });
  }
  function actions(){
    const list=[{label:'Tạo công việc mới',hint:'C',run:()=>{const p=project();if(p&&editable())taskForm(p);else if(editable())projectForm();}},{label:'Tìm kiếm toàn bộ nội dung',run:()=>document.querySelector('#search')?.focus()},{label:'Thẻ gọn / đầy đủ',run:()=>{localWrite('zen-compact',String(!compact()));render();}}];
    [['dashboard','Tổng quan'],['projects','Bảng Kanban'],['tasks','Tất cả công việc'],['focus','Chế độ tập trung'],['notes','Ghi chú'],['calendar','Lịch'],['gantt','Gantt']].forEach(([v,label])=>list.push({label,run:()=>go(v)}));
    list.push({label:'Cài đặt',run:()=>accountPanel()});
    visibleProjects().forEach(p=>list.push({label:'Dự án · '+p.name,run:()=>go('projects',p.id)}));
    allTasks().filter(t=>!t.archived&&!t.project.archived).forEach(t=>list.push({label:t.title,hint:t.project.name+' · '+columnDisplayName(t.project,t.col),run:()=>taskDetail(t.project,t)}));
    return list;
  }
  function drawCommands(){
    const query=palette.querySelector('input').value.trim().toLocaleLowerCase('vi');commands=actions().filter(c=>(c.label+' '+(c.hint||'')).toLocaleLowerCase('vi').includes(query)).slice(0,40);chosen=0;
    palette.querySelector('[role=listbox]').innerHTML=commands.length?commands.map((c,i)=>'<button type="button" role="option" id="studio-command-'+i+'" aria-selected="'+(i===0)+'" data-command="'+i+'"><span>'+esc(c.label)+'</span><small>'+esc(c.hint||'Mở →')+'</small></button>').join(''):'<p>Không tìm thấy lệnh phù hợp. Thử tìm từ ngắn hơn.</p>';markCommand();
  }
  function markCommand(){const input=palette.querySelector('input');if(commands.length)input.setAttribute('aria-activedescendant','studio-command-'+chosen);else input.removeAttribute('aria-activedescendant');palette.querySelectorAll('[role=option]').forEach((el,i)=>el.setAttribute('aria-selected',String(i===chosen)));palette.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});}
  function closePalette(){palette.close();returnFocus?.focus();}
  function execute(i){const command=commands[i];if(!command)return;closePalette();command.run();}
  function openPalette(){
    if(document.querySelector('#editor').open)return;
    if(!palette){palette=document.createElement('dialog');palette.className='studio-palette';palette.setAttribute('aria-labelledby','studio-command-title');palette.innerHTML='<header><h2 id="studio-command-title">Bạn muốn làm gì?</h2><button type="button" class="btn" data-studio="close-commands" aria-label="Đóng thanh lệnh">Đóng</button></header><input role="combobox" aria-label="Tìm lệnh, dự án hoặc công việc" aria-autocomplete="list" aria-expanded="true" aria-controls="studio-command-list" placeholder="Tìm lệnh, dự án, công việc…"><div id="studio-command-list" role="listbox" aria-label="Kết quả lệnh"></div><p class="studio-command-help">↑ ↓ chọn · Enter mở · Esc đóng</p>';document.body.append(palette);palette.querySelector('input').addEventListener('input',drawCommands);palette.addEventListener('cancel',e=>{e.preventDefault();closePalette();});palette.addEventListener('click',e=>{const b=e.target.closest('[data-command]');if(b)execute(Number(b.dataset.command));});palette.addEventListener('keydown',e=>{if(e.target!==palette.querySelector('input'))return;if(['ArrowDown','ArrowUp'].includes(e.key)&&commands.length){e.preventDefault();chosen=(chosen+(e.key==='ArrowDown'?1:-1)+commands.length)%commands.length;markCommand();}else if(e.key==='Enter'){e.preventDefault();execute(chosen);}});}
    returnFocus=document.activeElement;palette.querySelector('input').value='';palette.showModal();drawCommands();palette.querySelector('input').focus();
  }
  function updateClock(){const box=document.querySelector('.studio-pomodoro');if(!box||!_WF.focus)return;const timer=timers.get(_WF.focus.p+':'+_WF.focus.t);const seconds=timer?.end?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer?.remaining??1500;box.querySelector('output').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');box.querySelector('[data-studio=timer]').textContent=timer?.end?'Tạm dừng':seconds===0?'Bắt đầu lại':'Bắt đầu';box.querySelector('[role=status]').textContent=timer?.finished?'Đã hoàn tất phiên tập trung. Hãy nghỉ ngơi một chút.':'';}
  setInterval(()=>{timers.forEach(t=>{if(t.end&&Date.now()>=t.end){t.end=null;t.remaining=0;t.finished=true;notify('Đã hoàn tất phiên tập trung. Hãy nghỉ ngơi một chút.');}});updateClock();},1000);
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return;}
    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.repeat||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(e.key.toLowerCase()==='c'&&editable()){e.preventDefault();const p=project();p?taskForm(p):projectForm();}
  });
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-studio-column]');if(tab){const board=document.querySelector('#main .board'),cols=board.querySelectorAll('.column'),i=Number(tab.dataset.studioColumn);prefs.set(project().id,i);board.scrollTo({left:cols[i].offsetLeft-cols[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});return;}
    const b=e.target.closest('[data-studio]');if(!b)return;
    switch(b.dataset.studio){case 'commands':openPalette();break;case 'close-commands':closePalette();break;case 'compact':localWrite('zen-compact',String(!compact()));render();break;case 'wip':wipForm();break;case 'timer':{const t=timers.get(b.dataset.timerKey)||{remaining:1500};if(t.end){t.remaining=Math.max(0,Math.ceil((t.end-Date.now())/1000));t.end=null;}else{t.finished=false;t.end=Date.now()+(t.remaining||1500)*1000;}timers.set(b.dataset.timerKey,t);updateClock();break;}case 'reset':timers.delete(b.dataset.timerKey);updateClock();break;}
  });
  paint();
})();
/* v1.15.34: dòng đường dẫn trên thanh trên không bao giờ để trống (Lưu trữ, Thùng rác... trước đây hiện rỗng). */
(() => {
  const names = { archive: 'Lưu trữ', trash: 'Thùng rác', notes: 'Ghi chú', resources: 'Tài nguyên', focus: 'Chế độ tập trung', versions: 'Phiên bản' };
  const before = render;
  render = function (...args) {
    const result = before.apply(this, args);
    const crumb = $('#crumb');
    if (crumb && !crumb.textContent.trim()) crumb.textContent = names[view] || $('#main h1')?.textContent.trim() || '';
    return result;
  };
})();
