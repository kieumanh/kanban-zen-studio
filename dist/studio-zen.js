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
        panel.insertAdjacentHTML('beforeend', '<label class="wf-display-compact"><input type="checkbox" data-studio="compact"'+(compact()?' checked':'')+'> Thẻ gọn</label><div class="wf-display-actions" role="group" aria-label="Công cụ bảng"><button type="button" class="btn" data-studio="wip">Giới hạn việc mỗi cột</button><button type="button" class="btn" data-studio="commands">Lệnh nhanh <kbd>Ctrl / ⌘ K</kbd></button></div>');
      } else if (!panel) {
        toolbar = document.createElement('div'); toolbar.className = 'studio-board-tools';
        toolbar.innerHTML = '<span>Mỗi việc một khoảng thở</span><button type="button" class="btn" data-studio="compact" aria-pressed="'+compact()+'">'+(compact()?'Thẻ đầy đủ':'Thẻ gọn')+'</button><button type="button" class="btn" data-studio="wip">Giới hạn việc mỗi cột</button><button type="button" class="btn" data-studio="commands">Lệnh nhanh <kbd>Ctrl / ⌘ K</kbd></button>';
        board.before(toolbar);
      }
      tidyHeader();
      tidySummary(p);
      const nav = document.createElement('nav'); nav.className = 'studio-column-tabs'; nav.setAttribute('aria-label','Chuyển giữa các cột');
      const columns = [...board.querySelectorAll('.column')];
      columns.forEach((column, i) => {
        const key = column.dataset.column, count = p.tasks.filter(t=>!t.archived&&t.col===key).length, limit = p.wipLimits?.[key] || 0;
        const badge = document.createElement('span'); badge.className = 'studio-wip'+(limit&&count>limit?' is-over':'');
        badge.textContent = limit ? count+'/'+limit : count+' việc';
        badge.title = limit ? 'Giới hạn việc mỗi cột: '+limit+(count>limit?' · Vượt '+(count-limit)+' việc. Hãy hoàn tất một việc trước khi bắt đầu thêm.':'') : 'Chưa đặt giới hạn việc mỗi cột';
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
    modal('<h2>Giới hạn việc mỗi cột</h2><p>Cảnh báo mềm để giữ nhịp làm việc. Đặt 0 để không giới hạn.</p>'+p.columns.map((key,i)=>'<label class="studio-limit">'+esc(columnDisplayName(p,key))+'<input type="number" name="limit'+i+'" min="0" max="2000" step="1" required value="'+(p.wipLimits?.[key]||0)+'"></label>').join(''),fd=>{
      const current=project(p.id);if(!current)return;const limits=Object.fromEntries(p.columns.map((key,i)=>[key,Number(fd.get('limit'+i))]));
      if(!Object.values(limits).every(v=>Number.isInteger(v)&&v>=0&&v<=2000))return notify('Giới hạn phải là số nguyên từ 0 đến 2000.');
      current.wipLimits=limits;if(save()===false)return;document.querySelector('#editor').close();render();notify('Đã lưu giới hạn việc mỗi cột.');
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
/* v1.15.41: hộp thoại có tên đọc được và tiêu điểm đầu hợp lý. Mọi <dialog> gọi showModal() đều qua đây (hộp thoại dùng chung #editor, báo cáo, chia sẻ...). */
(() => {
  const nativeShow = HTMLDialogElement.prototype.showModal;
  let serial = 0;
  const shown = (el) => el && el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }) && el.getBoundingClientRect().width > 2;
  // Tên: tiêu đề đầu tiên đang hiển thị; không có thì dùng nhãn nhỏ phía trên (eyebrow). Dùng chung #editor nên tính lại mỗi khi nội dung đổi.
  const name = (dialog) => {
    if (dialog.hasAttribute('aria-label')) return;
    const heading = [...dialog.querySelectorAll('h1,h2,h3,[role="heading"]')].find(shown) || dialog.querySelector('#modal-eyebrow');
    if (!heading) return;
    if (!heading.id) heading.id = 'dialog-title-' + ++serial;
    if (dialog.getAttribute('aria-labelledby') !== heading.id) dialog.setAttribute('aria-labelledby', heading.id);
  };
  const nameField = (dialog) => [...dialog.querySelectorAll('#editor-body input,#editor-body textarea')].find((e) => shown(e) && !e.disabled && !e.readOnly && (e.tagName === 'TEXTAREA' || ['text', 'search', 'email', 'url', 'tel', 'number'].includes(e.type)));
  const settle = (dialog) => {
    name(dialog);
    if (dialog.id !== 'editor' || !dialog.open) return;
    const field = nameField(dialog);
    const coarse = matchMedia('(pointer:coarse)').matches;
    // Biểu mẫu tạo mới (ô tên còn trống) và máy có chuột: vào thẳng ô tên. Sửa một mục đã có trên cảm ứng: không bật bàn phím, đặt tiêu điểm ở tiêu đề.
    if (field && (!coarse || !field.value)) field.focus({ preventScroll: true });
    else if (document.activeElement?.matches('.modal-close-pin,[data-action="close-modal"]')) {
      const heading = dialog.querySelector('#editor-body h2,#editor-body h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  };
  HTMLDialogElement.prototype.showModal = function (...args) {
    const was = this.open;
    const result = nativeShow.apply(this, args);
    if (!was) queueMicrotask(() => settle(this));
    if (!this.__zenNamed) {
      this.__zenNamed = true;
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          name(this);
        });
      }).observe(this, { childList: true, subtree: true });
    }
    return result;
  };
})();

// v1.15.42: danh sách việc gọn. Bọc table() (đã bị task-list.js bọc một lần): tên dự án nằm dưới tên việc thay cho cột riêng, bỏ nhãn "Hạn chót" lặp ở từng hàng (quá hạn ghi một lần cạnh tên dự án),
// việc đã xong xuống cuối, nhãn đọc-được của ngày và ưu tiên có kèm giá trị hiện tại. Sắp xếp theo mục "Sắp xếp" cũng giữ việc đã xong ở cuối (dist/workflow111.js).
(() => {
  const base = table;
  table = function (tasks) {
    const template = document.createElement('template');
    template.innerHTML = base(tasks);
    for (const th of template.content.querySelectorAll('thead th')) {
      const label = th.textContent.trim();
      if (label === 'DỰ ÁN') th.remove();
      else if (label === 'CHECKLIST') th.textContent = 'TIẾN ĐỘ';
    }
    template.content.querySelector('td[colspan]')?.setAttribute('colspan', '5');
    const body = template.content.querySelector('tbody');
    const rows = [...template.content.querySelectorAll('tbody tr[data-task]')];
    const finished = [];
    for (const row of rows) {
      const t = project(row.dataset.pid)?.tasks.find((x) => x.id === row.dataset.task);
      const nameCell = row.querySelector('td.task-name');
      const projectCell = row.querySelector('td[data-label="Dự án"]');
      if (nameCell && projectCell) {
        const title = document.createElement('span');
        title.className = 'zen-row-title';
        title.append(...nameCell.childNodes);
        title.title = title.textContent;
        const sub = document.createElement('small');
        sub.className = 'zen-row-project';
        const name = document.createElement('span');
        name.className = 'zen-row-project-name';
        for (const node of [...projectCell.childNodes]) (node.nodeType === 1 ? sub : name).append(node);
        sub.append(name);
        if (row.classList.contains('zen-row-overdue')) {
          const late = document.createElement('b');
          late.className = 'zen-row-late';
          late.textContent = 'Quá hạn';
          sub.append(late);
        }
        projectCell.remove();
        nameCell.append(title, sub);
      }
      row.querySelector('.zen-due-label')?.remove();
      const due = row.querySelector('.zen-due-trigger');
      if (due && /^\d{2}\/\d{2}\/\d{4}$/.test(due.textContent.trim())) due.setAttribute('aria-label', `Hạn chót ${due.textContent.trim()}${row.classList.contains('zen-row-overdue') ? ', quá hạn' : ''}. Bấm để đổi: ${t?.title || ''}`);
      const summary = row.querySelector('.zen-priority-picker>summary');
      const current = row.querySelector('.zen-priority-current')?.textContent.trim();
      if (summary && current) {
        summary.setAttribute('aria-label', `Ưu tiên ${current}. Bấm để đổi: ${t?.title || ''}`);
        summary.title = current;
      }
      if (t?.col === 'Done') {
        row.classList.add('zen-row-done');
        finished.push(row);
      }
    }
    if (body && finished.length) body.append(...finished);
    return template.innerHTML;
  };
})();

// v1.15.43: một kênh nhắc việc đến hạn. Thanh nhắc hạn (dist/projectux.js) là nguồn chính; con số trên chuông là đúng số việc thanh nhắc nêu (quá hạn + đến hạn trong 3 ngày), cùng lọc qua taskNotices() nên cùng
// ngữ nghĩa "đã xem": "Xác nhận đã đọc tất cả" (workflow111.js) ẩn các việc đó khỏi thanh nhắc, chuông và hộp thoại đến hết ngày, việc mới thì hiện lại ở cả ba. Các mục còn lại (phiên bản mới, tệp mới, nhắc
// ghi chú) báo bằng một chấm nhỏ cạnh chuông, không cộng vào số, và được nêu tên ở dòng tóm tắt đầu hộp thoại Thông báo. Việc "quan trọng" chưa tới hạn vẫn được liệt kê trong hộp thoại nhưng không tính vào số.
// Ghi đè hoàn toàn refreshBell (ux.js, welcome.js, keepplus.js đã bọc nhau nhiều lớp).
(() => {
  const bellParts = () => {
    if (!currentUser) return { late: 0, soon: 0, due: 0, important: 0, release: 0, files: 0, notes: 0, extra: 0 };
    const tasks = taskNotices();
    const late = tasks.filter((t) => t.notice === 'Quá hạn').length;
    const soon = tasks.filter((t) => t.notice === 'Sắp đến hạn').length;
    const important = tasks.filter((t) => t.notice === 'Quan trọng').length;
    const release = releaseUnread() ? 1 : 0;
    const files = fileAlerts.length;
    const notes = dueNoteReminders().filter((n) => !localRead('zen-note-seen:' + currentUser.id + ':' + noteReminderKey(n))).length;
    return { late, soon, due: late + soon, important, release, files, notes, extra: release + files + notes };
  };
  const dueText = (p) => [p.late && p.late + ' quá hạn', p.soon && p.soon + ' đến hạn trong 3 ngày'].filter(Boolean).join(', ');
  const extraText = (p) => [p.release && 'có phiên bản mới', p.files && p.files + ' tệp mới', p.notes && p.notes + ' nhắc ghi chú'].filter(Boolean).join(', ');
  refreshBell = function () {
    const p = bellParts();
    bell.innerHTML =
      svgIcon('bell') +
      (p.due ? '<span class="notification-count">' + (p.due > 99 ? '99+' : p.due) + '</span>' : '') +
      (p.extra ? '<span class="notification-extra" aria-hidden="true"></span>' : '');
    bell.setAttribute(
      'aria-label',
      'Thông báo' + (p.due ? ' · ' + p.due + ' việc cần chú ý (' + dueText(p) + ')' : ' · không có việc quá hạn hay đến hạn') + (p.extra ? '; ngoài ra ' + extraText(p) : ''),
    );
  };
  const clickBefore = bell.onclick;
  bell.onclick = () => {
    clickBefore();
    const list = document.querySelector('#editor-body .notice-list');
    if (!list || document.querySelector('#editor-body .notice-summary')) return;
    const p = bellParts();
    const text =
      (p.due ? p.due + ' việc cần chú ý: ' + dueText(p).replace(/, /g, ' · ') + '.' : 'Không có việc quá hạn hay đến hạn.') +
      (p.extra ? ' Ngoài ra: ' + extraText(p).replace(/, /g, ' · ') + '.' : '') +
      (p.important ? ' Còn ' + p.important + ' việc quan trọng chưa tới hạn (liệt kê bên dưới, không tính vào số trên chuông).' : '');
    list.insertAdjacentHTML('beforebegin', '<p class="notice-summary" role="status">' + text + '</p>');
  };
  refreshBell();
})();
