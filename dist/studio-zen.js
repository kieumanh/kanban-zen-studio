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
  // v1.15.45: Thẻ gọn ẩn checklist trên thẻ, nên ô "Hiện checklist trên thẻ" không được đánh dấu như đang hiện. Khi Thẻ gọn bật, ô chỉ phản ánh thực tế (bỏ dấu, khóa, có chú thích); lựa chọn đã lưu của người dùng không bị đổi và quay lại khi Thẻ gọn tắt.
  function tidyChecksOption(panel) {
    const input = panel?.querySelector('[data-kanban-option="checks"]');
    if (!input) return;
    const label = input.closest('label');
    let hint = panel.querySelector('.wf-option-hint');
    if (!compact()) { hint?.remove(); input.removeAttribute('aria-describedby'); label?.removeAttribute('title'); return; }
    input.checked = false; input.disabled = true;
    if (!hint) {
      hint = document.createElement('small'); hint.className = 'wf-option-hint'; hint.id = 'wf-checks-hint';
      hint.textContent = 'Đang ẩn vì Thẻ gọn. Tắt Thẻ gọn để hiện checklist.';
      label?.after(hint);
    }
    input.setAttribute('aria-describedby', 'wf-checks-hint'); label?.setAttribute('title', hint.textContent);
  }
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
      tidyChecksOption(panel);
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

// v1.15.44: một thành phần trạng thái lưu / đồng bộ. Trước đây ba lớp syncStatus chồng nhau (account.js gốc, usability.js, release200.js; experience.js chỉ là nơi gọi) và hai chỗ tự viết chữ riêng (hộp thoại việc, chân thanh bên) cùng nói về một việc bằng
// nhiều bộ chữ: nhãn lỗi lặp "Chưa đồng bộ" hai lần, máy chủ lỗi bị gọi là "Ngoại tuyến", viên thuốc ở thanh trên và khung lỗi dưới nó nói cùng một câu. Ở đây thông điệp thô của account.js được phân loại đúng một lần
// thành một trạng thái (nhãn đầy đủ + nhãn ngắn), rồi viên thuốc, khung lỗi và dòng trạng thái của hộp thoại việc đều dựng từ trạng thái đó. Chỉ đổi cách hiển thị: không đổi lúc nào lưu, lúc nào đồng bộ, hay dữ liệu.
(() => {
  const SAVED_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11-1 4.5 4.5 0 0 1 0 9"/><path d="m8 15 3 3 6-6"/></svg>';
  const PENDING_ICON =
    '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5"/></svg>';
  const fmt = { timeZone: 'Asia/Ho_Chi_Minh' };
  let current = null;

  // ui: saved | pending | offline | error (cùng bộ giá trị data-sync cũ, CSS và test cũ dựa vào đó).
  const classify = (message, kind) => {
    const raw = String(message || '').replace(/^[●•⚠]\s*/, '').trim();
    const online = navigator.onLine;
    if (/xung đột|hợp nhất/i.test(raw)) return { ui: 'error', action: 'conflict', short: 'Xung đột', full: 'Xung đột · Xem và chọn bản cần giữ', note: 'Bản trên thiết bị của bạn được giữ nguyên, chưa bị ghi đè.' };
    if (/không thể lưu bản nháp trên máy/i.test(raw)) return { ui: 'error', action: 'retry', short: 'Không lưu được', full: 'Không lưu được trên thiết bị', note: 'Hãy xuất bản sao JSON trước khi đóng ứng dụng.' };
    if (kind === 'offline' || !online) {
      return online
        ? { ui: 'offline', short: 'Chưa kết nối được', full: 'Chưa kết nối được máy chủ · Đã lưu trên thiết bị' }
        : { ui: 'offline', short: 'Ngoại tuyến', full: 'Ngoại tuyến · Bạn vẫn có thể chỉnh sửa' };
    }
    if (kind === 'error') {
      let why;
      if (/không hợp lệ/i.test(raw)) why = 'Dữ liệu không hợp lệ';
      else if (/từ chối/i.test(raw)) why = 'Máy chủ từ chối dữ liệu';
      else if (/bản nháp đã lưu/i.test(raw)) why = 'Bản nháp đã lưu trên thiết bị';
      else if (/kiểm tra dữ liệu/i.test(raw)) why = 'Cần kiểm tra dữ liệu';
      else why = raw.replace(/chưa đồng bộ( được)?/gi, '').replace(/^[\s·]+|[\s·]+$/g, '').replace(/\s*·\s*·\s*/g, ' · ');
      return { ui: 'error', action: 'retry', short: 'Chưa đồng bộ được', full: 'Chưa đồng bộ được' + (why ? ' · ' + why : ''), note: 'Bản nháp vẫn ở thiết bị, chưa mất dữ liệu.' };
    }
    if (/đang đồng bộ/i.test(raw)) return { ui: 'pending', short: 'Đang đồng bộ…', full: 'Đang đồng bộ…' };
    if (/đã lưu trên máy|tiếp tục đồng bộ/i.test(raw)) return { ui: 'pending', short: 'Chờ đồng bộ', full: 'Đã lưu trên thiết bị · Chờ đồng bộ' };
    if (/đã đồng bộ|đã cập nhật từ/i.test(raw)) {
      const text = 'Đã đồng bộ lúc ' + new Date().toLocaleTimeString('vi-VN', { ...fmt, hour: '2-digit', minute: '2-digit' });
      return { ui: 'saved', short: text, full: text };
    }
    return { ui: kind === 'pending' ? 'pending' : 'saved', short: raw, full: raw };
  };

  // Dòng trạng thái trong hộp thoại việc nói đúng như viên thuốc khi chưa có chỉnh sửa; khi đã gõ thì là "có thay đổi chưa lưu" (workflow111.js đặt data-dirty).
  const mirror = () => {
    const line = document.querySelector('#editor .zen-task-save-status:not([data-dirty="true"])');
    if (line && current && line.textContent !== current.full) line.textContent = current.full;
  };

  const paint = () => {
    if (!current) return;
    const el = document.querySelector('#save-state');
    if (el) {
      const icon = document.createElement('span');
      icon.className = 'sync-icon';
      icon.innerHTML = current.ui === 'saved' ? SAVED_ICON : current.ui === 'pending' ? PENDING_ICON : svgIcon('warning');
      const label = document.createElement('span');
      label.textContent = current.short;
      el.replaceChildren(icon, label);
      el.setAttribute('role', 'status');
      el.dataset.sync = current.ui;
      el.setAttribute('aria-label', 'Trạng thái đồng bộ: ' + current.full);
      let last = 0;
      try {
        last = Number(localStorage.getItem(KEY + '-last-sync') || 0);
      } catch {}
      const lastText = last ? new Date(last).toLocaleString('vi-VN', fmt) : '';
      const detail = document.querySelector('#sync-last-time');
      if (detail) detail.textContent = last ? 'Lần đồng bộ thành công gần nhất: ' + lastText : 'Chưa ghi nhận lần đồng bộ thành công trên thiết bị này.';
      el.title =
        (current.ui === 'pending' ? 'Đang gửi dữ liệu lên máy chủ' : current.ui === 'saved' ? 'Dữ liệu đã được máy chủ xác nhận' : 'Dữ liệu hiện vẫn được giữ trên thiết bị') +
        (last ? ' · Lần thành công gần nhất: ' + lastText : ' · Chưa ghi nhận lần đồng bộ thành công trên thiết bị này');
    }
    // Khung dưới thanh trên chỉ có khi trạng thái là lỗi hoặc xung đột (cần một nút làm gì đó); các trạng thái khác chỉ ở viên thuốc.
    let bar = document.querySelector('#zen-sync-feedback');
    if (current.ui === 'error') {
      if (!bar) {
        bar = document.createElement('aside');
        bar.id = 'zen-sync-feedback';
        bar.setAttribute('role', 'status');
        document.querySelector('.topbar')?.after(bar);
      }
      // v1.15.46: thông báo nổi trùng sự cố đã gỡ; lời trấn an ("bản nháp vẫn ở thiết bị") nằm ngay trong khung này, dòng phụ dưới nhãn chính.
      const text = document.createElement('div'), main = document.createElement('span');
      text.className = 'zen-sync-text';
      main.textContent = current.full;
      text.append(main);
      if (current.note) {
        const note = document.createElement('small');
        note.textContent = current.note;
        text.append(note);
      }
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'btn';
      action.textContent = current.action === 'conflict' ? 'Xem các bản dữ liệu' : 'Thử lại';
      action.onclick = () => (current.action === 'conflict' ? accountPanel() : flushCloud(true));
      bar.replaceChildren(text, action);
    } else bar?.remove();
    mirror();
  };

  syncStatus = function (message, kind) {
    current = classify(message, kind);
    paint();
  };
  const editor = document.querySelector('#editor');
  if (editor) new MutationObserver(mirror).observe(editor, { childList: true, subtree: true });
  // studio-zen.js là script nạp cuối; đăng nhập chạy bất đồng bộ nên trạng thái đầu tiên đôi khi đã được các lớp cũ vẽ trước khi tới đây. Nhận lấy trạng thái đó để viên thuốc, khung lỗi và hộp thoại không lệch nhau cho tới lần báo kế tiếp.
  const drawn = document.querySelector('#save-state');
  if (drawn?.dataset.sync) {
    current = classify(drawn.textContent, drawn.dataset.sync);
    paint();
  }
})();

// v1.15.49: Lịch dạng danh sách (Agenda). Ở màn hình vừa (701–1023px, ví dụ máy tính bảng 820px) lưới 7 cột chỉ còn ~80px mỗi ngày nên chữ bị bẻ
// từng từ; mặc định chuyển sang danh sách theo ngày. Người dùng đổi qua lại được bằng nút "Danh sách | Lưới tháng"; lựa chọn nhớ trên thiết bị.
// Điện thoại (≤700px) giữ nguyên bố cục riêng (lưới + danh sách của ngày đang chọn). Dữ liệu không đổi: chỉ cách hiển thị.
(() => {
  if (typeof matchMedia !== 'function') return;
  const KEY = 'zen-calendar-mode';
  const phone = matchMedia('(max-width:700px)');
  const medium = matchMedia('(min-width:701px) and (max-width:1023px)');
  const WEEKDAY = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const saved = () => {
    const value = localRead(KEY);
    return value === 'list' || value === 'grid' ? value : null;
  };
  const mode = () => saved() || (medium.matches ? 'list' : 'grid');
  const pad = (n) => String(n).padStart(2, '0');
  const short = (day) => `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;

  // Một ngày chỉ liệt kê việc có sự kiện thật vào ngày đó (hạn, bắt đầu, kết thúc, checklist); các ngày giữa của việc nhiều ngày không lặp lại.
  const itemsOf = (events, day) =>
    zenCalendarDayEvents(events, day)
      .filter((t) => (t.eventKind === 'check' ? t.eventStart?.slice(0, 10) === day || t.eventEnd?.slice(0, 10) === day : !(t.eventLabels?.length === 1 && t.eventLabels[0] === 'Đang thực hiện')))
      .sort((a, b) => Number(!!zenCalendarEventTime(a, day)) - Number(!!zenCalendarEventTime(b, day)) || zenCalendarEventTime(a, day).localeCompare(zenCalendarEventTime(b, day)) || String(a.title).localeCompare(String(b.title), 'vi'));

  const kind = (t) => (t.eventLabels?.includes('Hạn hoàn thành') ? 'Hạn' : t.eventLabels?.join(' · ') || (t.eventKind === 'deadline' ? 'Hạn' : t.eventKind === 'check' ? 'Checklist' : 'Đang thực hiện'));

  const row = (t, day) => {
    const from = t.eventStart?.slice(0, 10),
      to = t.eventEnd?.slice(0, 10),
      range = from && to && from !== to ? ` · ${short(from)} → ${short(to)}` : '',
      where = active ? '' : ` · ${esc(t.project.name)}`;
    return `<li><button type="button" class="zen-ma-item" data-task="${esc(t.id)}" data-pid="${esc(t.project.id)}" style="--event-color:${esc(t.project.color)}"><span class="zen-ma-when">${esc(zenCalendarEventTime(t, day) || 'Cả ngày')}</span><span class="zen-ma-body"><strong>${esc(t.title)}</strong><small>${esc(kind(t))}${range}${where}</small></span><span class="zen-ma-pct">${taskPct(t)}%</span></button></li>`;
  };

  const agenda = () => {
    const events = scheduleEvents(),
      month = `${calendarYear}-${pad(calendarMonth + 1)}`,
      count = new Date(calendarYear, calendarMonth + 1, 0).getDate(),
      label = `Lịch tháng ${calendarMonth + 1}/${calendarYear} dạng danh sách`;
    const days = Array.from({ length: count }, (_, i) => {
      const day = `${month}-${pad(i + 1)}`;
      return [day, itemsOf(events, day)];
    }).filter(([, items]) => items.length);
    const body = days.length
      ? days
          .map(([day, items]) => `<section class="zen-ma-day${day === today() ? ' today' : ''}"><h3 class="zen-ma-date"><time datetime="${day}">${WEEKDAY[new Date(`${day}T12:00:00`).getDay()]}, ${short(day)}</time>${day === today() ? '<em>Hôm nay</em>' : ''}</h3><ul>${items.map((t) => row(t, day)).join('')}</ul></section>`)
          .join('')
      : '<p class="zen-ma-empty">Tháng này chưa có công việc nào được đặt lịch. Dùng mũi tên để xem tháng khác.</p>';
    return `<div class="zen-month-agenda" role="region" aria-label="${label}">${body}</div>`;
  };

  const toggle = (current) =>
    `<div class="zen-cal-mode" role="group" aria-label="Kiểu hiển thị lịch">${[
      ['list', 'Danh sách'],
      ['grid', 'Lưới tháng'],
    ]
      .map(([value, text]) => `<button type="button" data-zen-cal-mode="${value}" aria-pressed="${current === value}">${text}</button>`)
      .join('')}</div>`;

  const base = workCalendar;
  workCalendar = function () {
    const html = base();
    if (phone.matches) return html;
    const box = document.createElement('template');
    box.innerHTML = html;
    const controls = box.content.querySelector('.month-controls'),
      grid = box.content.querySelector('.month-scroll');
    if (!controls || !grid) return html;
    const current = mode();
    controls.insertAdjacentHTML('beforeend', toggle(current));
    if (current === 'list') grid.outerHTML = agenda();
    return box.innerHTML;
  };

  document.addEventListener('click', (e) => {
    const button = e.target.closest?.('[data-zen-cal-mode]');
    if (!button) return;
    localWrite(KEY, button.dataset.zenCalMode);
    render();
    document.querySelector(`[data-zen-cal-mode="${button.dataset.zenCalMode}"]`)?.focus();
  });

  // Xoay máy hoặc đổi cỡ cửa sổ qua ngưỡng 700px / 1023px: vẽ lại bố cục lịch cho khớp (nếu người dùng chưa tự chọn kiểu).
  const redraw = () => {
    if (view === 'calendar') render();
  };
  phone.addEventListener('change', redraw);
  medium.addEventListener('change', () => {
    if (!saved()) redraw();
  });
})();
