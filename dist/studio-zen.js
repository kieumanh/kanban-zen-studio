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
    const note = !tasks.length ? 'Chưa có việc nào' : pr.pct + '% tiến độ' + ' · trung bình các việc';
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
    [['dashboard','Tổng quan'],['projects','Bảng Kanban'],['budget','Phân bổ tài nguyên'],['habits','Việc hằng ngày'],['focus','Chế độ tập trung'],['notes','Ghi chú'],['calendar','Lịch'],['gantt','Gantt']].forEach(([v,label])=>list.push({label,run:()=>go(v)}));
    list.push({label:'Cài đặt',run:()=>accountPanel()});
    // v1.16.0: đổi giao diện từ bảng lệnh.
    if(window.zenTheme){[['Giao diện sáng','light'],['Giao diện tối','dark'],['Giao diện theo hệ thống','system']].forEach(([label,value])=>list.push({label,hint:'Màu sắc',run:()=>{window.zenTheme.setTheme(value);notify('Đã chọn: '+label.toLocaleLowerCase('vi')+'.');}}));list.push({label:'Bật / tắt tương phản cao',hint:'Màu sắc',run:()=>{const high=window.zenTheme.state().high;window.zenTheme.setContrast(high?'normal':'high');notify(high?'Đã tắt tương phản cao.':'Đã bật tương phản cao.');}});}
    // v1.86.0: đổi phong cách Thiền / Giang hồ từ bảng lệnh.
    if(window.zenTheme?.setStyle)[['Phong cách Giang hồ','giangho'],['Phong cách Thiền','zen']].forEach(([label,value])=>list.push({label,hint:'Phong cách',run:()=>{window.zenTheme.setStyle(value);notify('Đã chọn: '+label.toLocaleLowerCase('vi')+'.');}}));
    // v1.96.0 (Chú Giải): Bảng chú giải; khi đang ở Giang hồ thì thêm công tắc lời lẽ giang hồ (Giang hồ nhẹ).
    if(window.zenGuide)list.push({label:'Bảng chú giải Giang hồ',hint:'Tên giang hồ và nghĩa thường',run:()=>window.zenGuide.glossary()});
    if(window.zenTheme?.setWords&&window.zenTheme.state().style==='giangho')list.push({label:'Bật / tắt lời lẽ giang hồ',hint:'Phong cách',run:()=>{const on=!window.zenTheme.state().words;window.zenTheme.setWords(on);notify(on?'Đã bật lời lẽ giang hồ.':'Đã chọn Giang hồ nhẹ: giữ họa tiết, chữ quen thuộc.');}});
    visibleProjects().forEach(p=>list.push({label:'Dự án · '+p.name,run:()=>go('projects',p.id)}));
    // v1.96.0: Khẩu quyết hai chiều. Bật lời lẽ giang hồ thì lệnh của ứng dụng mang tên giang hồ, nghĩa thường nằm ở dòng gợi ý; gõ
    // "cài đặt" hay "cơ quan" đều ra. Tên việc (thêm ngay dưới đây) là nội dung người dùng nên không đổi.
    const gh=window.zenGiangHo;if(gh?.active?.()&&gh.command)list.forEach(c=>{const hit=gh.command(c.label);if(hit){c.label=hit[0];c.hint=hit[1]+(c.hint?' · '+c.hint:'');}});
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
    if(!palette){palette=document.createElement('dialog');palette.className='studio-palette';palette.setAttribute('aria-labelledby','studio-command-title');palette.innerHTML='<header><h2 id="studio-command-title">Bạn muốn làm gì?</h2><button type="button" class="icon-btn exit-x" data-studio="close-commands" aria-label="Đóng thanh lệnh" title="Đóng">×</button></header><input role="combobox" aria-label="Tìm lệnh, dự án hoặc công việc" aria-autocomplete="list" aria-expanded="true" aria-controls="studio-command-list" placeholder="Tìm lệnh, dự án, công việc…"><div id="studio-command-list" role="listbox" aria-label="Kết quả lệnh"></div><p class="studio-command-help">↑ ↓ chọn · Enter mở · Esc đóng</p>';document.body.append(palette);palette.querySelector('input').addEventListener('input',drawCommands);palette.addEventListener('cancel',e=>{e.preventDefault();closePalette();});palette.addEventListener('click',e=>{const b=e.target.closest('[data-command]');if(b)execute(Number(b.dataset.command));});palette.addEventListener('keydown',e=>{if(e.target!==palette.querySelector('input'))return;if(['ArrowDown','ArrowUp'].includes(e.key)&&commands.length){e.preventDefault();chosen=(chosen+(e.key==='ArrowDown'?1:-1)+commands.length)%commands.length;markCommand();}else if(e.key==='Enter'){e.preventDefault();execute(chosen);}});}
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
  // v1.34.0: việc hằng ngày đến giờ nhắc (habits.js) báo như nhắc ghi chú: chấm nhỏ và được nêu tên, không cộng vào số việc quá hạn.
  const bellParts = () => {
    if (!currentUser) return { late: 0, soon: 0, due: 0, important: 0, release: 0, files: 0, notes: 0, habits: 0, extra: 0 };
    const tasks = taskNotices();
    const late = tasks.filter((t) => t.notice === 'Quá hạn').length;
    const soon = tasks.filter((t) => t.notice === 'Sắp đến hạn').length;
    const important = tasks.filter((t) => t.notice === 'Quan trọng').length;
    const release = releaseUnread() ? 1 : 0;
    const files = fileAlerts.length;
    const notes = dueNoteReminders().filter((n) => !localRead('zen-note-seen:' + currentUser.id + ':' + noteReminderKey(n))).length;
    const habits = window.zenHabits?.dueReminders ? window.zenHabits.dueReminders().length : 0;
    return { late, soon, due: late + soon, important, release, files, notes, habits, extra: release + files + notes + habits };
  };
  const dueText = (p) => [p.late && p.late + ' quá hạn', p.soon && p.soon + ' đến hạn trong 3 ngày'].filter(Boolean).join(', ');
  const extraText = (p) => [p.release && 'có phiên bản mới', p.files && p.files + ' tệp mới', p.notes && p.notes + ' nhắc ghi chú', p.habits && p.habits + ' việc đến giờ nhắc'].filter(Boolean).join(', ');
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

// v1.15.50: dự án và việc không còn lựa chọn họa tiết và không còn vẽ họa tiết lên thẻ/trang (đọc rối mắt).
// Dữ liệu KHÔNG bị đổi: họa tiết đã lưu (`motif`) vẫn nằm trong bản ghi; biểu mẫu giữ nguyên giá trị bằng ô ẩn cùng tên
// để các hàm lưu cũ (`fd.get('motif')`, `fd.get('project-motif')`) không ghi đè thành 'none'. Họa tiết của ghi chú không đổi.
(() => {
  const known = (value) => typeof NOTE_MOTIFS !== 'undefined' && typeof value === 'string' && Object.hasOwn(NOTE_MOTIFS, value);
  const hidden = (name, value) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    return input;
  };

  // Việc: chi tiết việc cũng dựng qua taskForm. Việc mới không thừa hưởng họa tiết của dự án nữa.
  const baseTaskForm = taskForm;
  taskForm = function (p, t) {
    baseTaskForm.apply(this, arguments);
    const picker = document.querySelector('#editor-body .task-motif-picker');
    if (picker) picker.replaceWith(hidden('motif', known(t?.motif) ? t.motif : 'none'));
  };

  // Dự án: giữ họa tiết đã lưu, dự án mới là 'none'.
  const baseProjectForm = projectForm;
  projectForm = function (p) {
    baseProjectForm.apply(this, arguments);
    const picker = document.querySelector('#editor-body .project-motif-picker');
    if (picker) picker.replaceWith(hidden('project-motif', known(p?.motif) ? p.motif : 'none'));
  };

  // Không vẽ họa tiết lên thẻ việc, thẻ dự án và trang dự án; ghi chú (thẻ, khung soạn) vẫn dùng zenArt như cũ.
  const baseArt = zenArt;
  zenArt = function (element, motif) {
    return baseArt(element, element?.matches?.('#main, .task-card, .project-card') ? 'none' : motif);
  };
})();

// v1.15.51: khu vực ghim ghi chú có biểu tượng minh họa và bố cục tinh tế hơn. Chỉ trang trí lại DOM của keep198:
// nút, ô ẩn `zen-pinned`/`zen-quick-pinned`, chữ mô tả và trình xử lý bấm giữ nguyên nên việc ghim/bỏ ghim không đổi.
(() => {
  const svg = (paths) =>
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
  // Ghim đầu danh sách: chiếc ghim bấm. Ghim nhanh: dấu trang (truy cập từ menu).
  const ICONS = {
    pin: svg('<path d="M9 4h6l-1 5 3 3v1.5H7V12l3-3z"/><path d="M12 13.5V20"/>'),
    quick: svg('<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.8L6 20V5a1 1 0 0 1 1-1z"/><path d="M12 8v4M10 10h4"/>'),
  };
  const baseNoteForm = noteForm;
  noteForm = function () {
    baseNoteForm.apply(this, arguments);
    const panel = document.querySelector('#editor .zen-note-pin-panel');
    if (!panel || panel.dataset.zenPinStyled) return;
    panel.dataset.zenPinStyled = '1';
    const rows = [
      { row: panel.querySelector('.zen-editor-pin-row:not(.zen-editor-quick-pin-row)'), key: 'pin', title: 'Ghim lên đầu danh sách' },
      { row: panel.querySelector('.zen-editor-quick-pin-row'), key: 'quick', title: 'Ghim nhanh ở menu' },
    ];
    for (const { row, key, title } of rows) {
      const hint = row?.querySelector('.zen-editor-pin-hint');
      if (!hint) continue;
      const icon = document.createElement('span');
      icon.className = 'zen-pin-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = ICONS[key];
      const heading = document.createElement('strong');
      heading.className = 'zen-pin-title';
      heading.textContent = title;
      const text = document.createElement('span');
      text.className = 'zen-pin-text';
      const head = document.createElement('div');
      head.className = 'zen-pin-head';
      hint.before(head);
      text.append(heading, hint);
      head.append(icon, text);
    }
  };
})();

// v1.15.53: khu vực xóa việc và xóa dự án thành "vùng nguy hiểm" rõ ràng: biểu tượng thùng rác, tiêu đề, mô tả hậu quả thật
// (vào Thùng rác, khôi phục trong 30 ngày), nút viền đỏ nhạt thay vì khối đỏ nặng. Chỉ trang trí DOM: nút giữ nguyên
// `data-action` và chữ, nên hộp thoại xác nhận (`confirmDelete`) và việc chuyển vào Thùng rác không đổi.
(() => {
  const TRASH =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9L17.5 7M10 11v5M14 11v5"/></svg>';
  const zone = (section, button, title, text) => {
    if (!section || !button || section.dataset.zenDanger) return;
    section.dataset.zenDanger = '1';
    section.classList.add('zen-danger-zone');
    const icon = document.createElement('span');
    icon.className = 'zen-danger-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = TRASH;
    const heading = document.createElement('strong');
    heading.textContent = title;
    const note = document.createElement('span');
    note.textContent = text;
    const copy = document.createElement('div');
    copy.className = 'zen-danger-text';
    copy.append(heading, note);
    button.classList.add('zen-danger-button');
    button.insertAdjacentHTML('afterbegin', TRASH);
    section.prepend(icon, copy);
  };
  const TRASH_NOTE = 'Chuyển vào Thùng rác, khôi phục được trong 30 ngày.';

  const baseTaskDetail = taskDetail;
  taskDetail = function () {
    baseTaskDetail.apply(this, arguments);
    const section = document.querySelector('#editor-body .zen-task-delete');
    zone(section, section?.querySelector('[data-action="delete-task"]'), 'Xóa công việc này', TRASH_NOTE);
  };

  const baseProjectForm = projectForm;
  projectForm = function () {
    baseProjectForm.apply(this, arguments);
    const button = document.querySelector('#editor-form [data-action=delete-project]');
    if (!button || button.closest('.zen-danger-zone')) return;
    const section = document.createElement('section');
    section.className = 'zen-project-danger';
    button.replaceWith(section);
    section.append(button);
    zone(section, button, 'Xóa dự án này', 'Dự án và các việc bên trong chuyển vào Thùng rác, khôi phục được trong 30 ngày.');
  };
})();

// v1.16.0: chế độ tối và tương phản cao. `theme.js` (nạp đầu trang) đặt `data-theme` / `data-contrast` trên <html>; bảng màu nằm ở
// `dark.css` và `contrast.css` (sinh tự động từ CSS nguồn bằng scripts/generate-themes.mjs). Đây là phần giao diện chọn: mục "Giao diện" trong Cài đặt.
// Lựa chọn lưu trên thiết bị này (localStorage), không đồng bộ lên máy chủ và không đụng vào dữ liệu làm việc.
(() => {
  // v1.21.1: lựa chọn dạng danh sách có icon, mô tả ngắn và dấu tích ở ô đang chọn (giống mẫu "Appearance").
  // Giữ nguyên input radio (name/value) để bàn phím, trình đọc màn hình và các test hiện có vẫn hoạt động.
  const ICONS = {
    system: '<path d="M4 5h16v11H4z M9 20h6 M12 16v4"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4"/>',
    dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    normal: '<circle cx="12" cy="12" r="8"/>',
    high: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    // v1.86.0: phong cách Thiền (hoa sen) và Giang hồ (thanh kiếm).
    zen: '<path d="M12 20c-4 0-7-2.5-8-6 3 0 5.5 1 8 3.5 2.5-2.5 5-3.5 8-3.5-1 3.5-4 6-8 6z M12 16.5C10 14 9.5 10.5 12 6c2.5 4.5 2 8 0 10.5z"/>',
    giangho: '<path d="M19.5 3.5 10 13 M19.5 3.5l-1 3.5-7 7 M19.5 3.5 16 4.5 M7.5 12.5l4 4 M9.5 14.5l-5 5 M5 17l2 2"/>',
  };
  const CHECK = '<svg class="zen-theme-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7.5"/></svg>';
  const svgOf = (key) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[key] || '') + '</svg>';
  const choices = (name, legend, options, current, onChange) => {
    const set = document.createElement('fieldset');
    set.className = 'zen-theme-group';
    const title = document.createElement('legend');
    title.textContent = legend;
    set.append(title);
    const list = document.createElement('div');
    list.className = 'zen-theme-list';
    options.forEach(([value, label, sub, icon]) => {
      const row = document.createElement('label');
      row.className = 'zen-theme-choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = value;
      input.checked = value === current;
      input.addEventListener('change', () => input.checked && onChange(value));
      const mark = document.createElement('span');
      mark.className = 'zen-theme-icon';
      mark.innerHTML = svgOf(icon);
      const text = document.createElement('span');
      text.className = 'zen-theme-text';
      const strong = document.createElement('strong');
      strong.textContent = label;
      text.append(strong);
      if (sub) {
        const small = document.createElement('small');
        small.textContent = sub;
        text.append(small);
      }
      const tick = document.createElement('span');
      tick.className = 'zen-theme-check';
      tick.innerHTML = CHECK;
      row.append(input, mark, text, tick);
      list.append(row);
    });
    set.append(list);
    return set;
  };
  const baseAccountPanel = accountPanel;
  accountPanel = function () {
    baseAccountPanel.apply(this, arguments);
    const body = document.querySelector('#editor-body');
    if (!body || !window.zenTheme || body.querySelector('.settings-theme')) return;
    const read = (key) => {
      try {
        return localStorage.getItem(key) || 'system';
      } catch {
        return 'system';
      }
    };
    const section = document.createElement('section');
    section.className = 'settings-theme profile-card';
    const heading = document.createElement('h3');
    heading.textContent = 'Giao diện';
    const help = document.createElement('p');
    help.className = 'help-copy';
    help.textContent = 'Chỉ áp dụng trên thiết bị này. "Theo hệ thống" làm theo cài đặt sáng/tối và tương phản của thiết bị.';
    section.append(
      heading,
      help,
      choices('zen-theme', 'Màu giao diện', [['system', 'Theo hệ thống', 'Theo thiết bị', 'system'], ['light', 'Sáng', 'Nền sáng', 'light'], ['dark', 'Tối', 'Nền tối', 'dark']], read('zen-theme'), (v) => window.zenTheme.setTheme(v)),
      choices('zen-contrast', 'Độ tương phản', [['system', 'Theo hệ thống', 'Theo thiết bị', 'system'], ['normal', 'Thường', 'Màu dịu, như mặc định', 'normal'], ['high', 'Cao', 'Viền và chữ rõ hơn', 'high']], read('zen-contrast'), (v) => window.zenTheme.setContrast(v)),
      // v1.86.0: phong cách Thiền (tím hồng, như trước) hoặc Giang hồ (son, giấy dó, họa tiết kiếm hiệp). Lưu trên thiết bị này.
      choices('zen-style', 'Phong cách', [['zen', 'Thiền', 'Tím hồng, nhẹ nhàng', 'zen'], ['giangho', 'Giang hồ', 'Son đỏ, giấy dó, kiếm hiệp', 'giangho']], read('zen-style') === 'giangho' ? 'giangho' : 'zen', (v) => window.zenTheme.setStyle(v)),
    );
    const anchor = body.querySelector('h3.settings-section');
    if (anchor) anchor.before(section);
    else body.append(section);
  };
})();

// v1.17.0: nút chuyển nhanh chế độ sáng / tối ngay cạnh biểu tượng thông báo (máy tính, máy tính bảng và điện thoại).
// Bấm để đổi giữa Sáng và Tối (lưu như lựa chọn tại Cài đặt → Giao diện); biểu tượng mặt trăng khi đang sáng, mặt trời khi đang tối.
(() => {
  const bell = document.querySelector('#notifications-button');
  if (!bell || !window.zenTheme || document.querySelector('#theme-toggle')) return;
  Object.assign(iconPaths, {
    moon: 'M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z',
    sun: 'M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z M12 2.5v2 M12 19.5v2 M4.6 4.6 6 6 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4 6 18 M18 6l1.4-1.4',
  });
  const button = document.createElement('button');
  button.id = 'theme-toggle';
  button.type = 'button';
  button.className = 'icon-btn notification-bell theme-toggle';
  const paint = () => {
    const dark = window.zenTheme.state().dark;
    button.innerHTML = svgIcon(dark ? 'sun' : 'moon');
    const label = dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
    button.setAttribute('aria-label', label);
    button.title = label;
  };
  button.onclick = () => window.zenTheme.setTheme(window.zenTheme.state().dark ? 'light' : 'dark');
  bell.before(button);
  paint();
  document.addEventListener('zen-theme', paint);
})();

// v1.17.1: hộp thoại Thông báo gọn và dễ quét hơn. Việc được gom theo nhóm (Quá hạn · Sắp đến hạn · Quan trọng · Khác) với tiêu đề nhóm có số lượng,
// mỗi việc một hàng gọn (chấm màu theo mức độ, tên việc, dự án · ngày hạn · "quá hạn 2 ngày"/"còn 2 ngày"), nhóm dài chỉ hiện 5 hàng đầu kèm nút "Hiện thêm".
// Dòng tóm tắt .notice-summary (v1.15.43) và nút "Xác nhận đã đọc tất cả" giữ nguyên; chỉ đổi cách trình bày, không đổi dữ liệu hay cách tính số trên chuông.
(() => {
  const GROUPS = [
    ['late', 'Quá hạn'],
    ['soon', 'Sắp đến hạn'],
    ['important', 'Quan trọng'],
    ['other', 'Khác'],
  ];
  const VISIBLE = 5;
  const kindOf = (el) => {
    if (el.matches('[data-task]')) {
      const label = el.querySelector('strong, .notice-tag')?.textContent || '';
      return label.startsWith('Quá hạn') ? 'late' : label.startsWith('Sắp đến hạn') ? 'soon' : 'important';
    }
    return 'other';
  };
  const relative = (due) => {
    if (!due) return '';
    const days = Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z')) / 86400000);
    return days < 0 ? 'quá hạn ' + -days + ' ngày' : days === 0 ? 'hôm nay' : days === 1 ? 'ngày mai' : 'còn ' + days + ' ngày';
  };
  const decorate = () => {
    const list = document.querySelector('#editor-body .notice-list');
    if (!list || list.dataset.grouped) return;
    list.dataset.grouped = '1';
    const tasks = taskNotices();
    const rows = [...list.children].filter((el) => el.classList.contains('notice-item'));
    for (const el of rows) {
      const kind = kindOf(el);
      el.dataset.kind = kind;
      const tag = el.querySelector('strong');
      if (tag) {
        // Việc đã nằm dưới tiêu đề nhóm (Quá hạn / Sắp đến hạn / Quan trọng): nhãn chỉ giữ phần bổ sung ("Quan trọng" ở việc quá hạn), không lặp lại tên nhóm.
        const extra = el.matches('[data-task]') ? tag.textContent.replace(/^(Quá hạn|Sắp đến hạn|Quan trọng)( · )?/, '').trim() : tag.innerHTML;
        if (extra) {
          const span = document.createElement('span');
          span.className = 'notice-tag';
          span.innerHTML = extra;
          tag.replaceWith(span);
        } else tag.remove();
      }
      el.querySelector('.notice-detail-link')?.remove();
      el.querySelectorAll(':scope > span:not(.notice-tag)').forEach((node, i) => i === 0 && node.classList.add('notice-title'));
      if (el.matches('[data-task]')) {
        const task = tasks.find((t) => t.id === el.dataset.task && t.project.id === el.dataset.pid);
        const rel = relative(task?.due);
        const small = el.querySelector('small');
        if (small && rel) small.textContent += ' · ' + rel;
      }
    }
    const empty = [...list.children].find((el) => el.tagName === 'P');
    if (!rows.length && empty) {
      empty.className = 'notice-empty';
      empty.innerHTML = svgIcon('check') + '<strong>Bạn đã xem hết thông báo</strong><span>Việc mới đến hạn sẽ hiện ở đây.</span>';
      return;
    }
    const counts = { late: 0, soon: 0, important: 0 };
    rows.forEach((el) => counts[el.dataset.kind] !== undefined && counts[el.dataset.kind]++);
    for (const [key, title] of GROUPS) {
      const group = rows.filter((el) => el.dataset.kind === key);
      if (!group.length) continue;
      const heading = document.createElement('h3');
      heading.className = 'notice-group';
      heading.dataset.kind = key;
      heading.innerHTML = '<span class="notice-dot" aria-hidden="true"></span>' + title + ' <small>' + group.length + '</small>';
      list.append(heading);
      group.forEach((el, i) => {
        if (i >= VISIBLE) el.hidden = true;
        list.append(el);
      });
      if (group.length > VISIBLE) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'notice-more';
        more.dataset.kind = key;
        more.textContent = 'Hiện thêm ' + (group.length - VISIBLE) + ' việc';
        more.setAttribute('aria-expanded', 'false');
        more.onclick = () => {
          group.forEach((el) => (el.hidden = false));
          more.remove();
        };
        list.append(more);
      }
    }
    if (counts.late + counts.soon + counts.important) {
      const stats = document.createElement('div');
      stats.className = 'notice-stats';
      stats.setAttribute('aria-hidden', 'true');
      stats.innerHTML = [['late', 'quá hạn'], ['soon', 'sắp đến hạn'], ['important', 'quan trọng']]
        .filter(([key]) => counts[key])
        .map(([key, label]) => '<span data-kind="' + key + '"><b>' + counts[key] + '</b> ' + label + '</span>')
        .join('');
      (document.querySelector('#editor-body .notice-summary') || list).before(stats);
    }
  };
  const before = bell.onclick;
  bell.onclick = () => {
    before();
    decorate();
  };

  // "Công việc cần chú ý": đánh dấu nhóm đang xem (quá hạn / sắp đến hạn) để tô màu thẻ chuyển nhóm và hàng việc.
  const openBefore = openDueWork;
  openDueWork = function (group) {
    openBefore(group);
    const key = document.querySelector('.due-work-tabs .primary')?.dataset.dueList;
    const list = document.querySelector('.due-work-list');
    if (list && key) list.dataset.tone = key;
  };

  // Thanh nhắc hạn: đánh dấu mức độ (quá hạn / sắp đến hạn) cho CSS.
  const stripBefore = refreshDueAlerts;
  refreshDueAlerts = function () {
    stripBefore();
    const strip = document.querySelector('#due-alert-strip');
    if (strip) strip.dataset.tone = dueAlerts().some((t) => t.notice === 'Quá hạn') ? 'late' : 'soon';
  };
})();

// v1.17.3: "Tất cả công việc" — hàng chip lọc nhanh theo thời hạn/trạng thái (Tất cả · Hôm nay · Quá hạn · Sắp đến hạn · Đang thực hiện) có số lượng,
// dùng chính bộ lọc "Thời hạn" sẵn có (dashboardDueFilter) nên kết quả và ô chọn luôn khớp nhau. Bảng chỉ đổi cách trình bày (trạng thái, ưu tiên, hàng quá hạn).
(() => {
  const CHIPS = [
    ['', 'Tất cả'],
    ['today', 'Hôm nay'],
    ['overdue', 'Quá hạn'],
    ['upcoming', 'Sắp đến hạn'],
    ['doing', 'Đang thực hiện'],
  ];
  const paint = () => {
    if (view !== 'tasks') return;
    const main = document.querySelector('#main');
    const anchor = main?.querySelector('details.wf-filter-panel');
    if (!anchor || main.querySelector('.zen-task-chips')) return;
    const saved = dashboardDueFilter;
    dashboardDueFilter = '';
    let pool;
    try {
      pool = allTasks().filter(found);
    } finally {
      dashboardDueFilter = saved;
    }
    const nav = document.createElement('div');
    nav.className = 'zen-task-chips';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'Lọc nhanh công việc');
    nav.innerHTML = CHIPS.map(([key, label]) => {
      const count = key ? pool.filter((t) => dashboardDateMatches(t, key)).length : pool.length;
      return '<button type="button" class="zen-task-chip" data-zen-chip="' + key + '" data-kind="' + (key || 'all') + '" aria-pressed="' + (dashboardDueFilter === key) + '"' + (key === 'upcoming' ? ' title="Hạn trong 7 ngày tới"' : '') + '>' + label + ' <b>' + count + '</b></button>';
    }).join('');
    anchor.before(nav);
  };
  const before = render;
  render = function () {
    before();
    paint();
  };
  document.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-zen-chip]');
    if (!chip) return;
    event.preventDefault();
    dashboardDueFilter = chip.dataset.zenChip;
    render();
    document.querySelector('.zen-task-chip[aria-pressed="true"]')?.focus();
  });
})();


// v1.17.4: checklist trong hộp công việc. Mỗi mục là một thẻ bo tròn (mục xong chuyển màu nhạt), có nút ↑/↓ để đổi thứ tự bằng chạm hoặc bàn phím
// (ngoài kéo thả và Alt + ↑/↓ sẵn có), ô nhập mục mới gọn một dòng: Enter để thêm, Shift + Enter xuống dòng. Ô chữ tự giãn đúng chiều cao sau khi hộp thoại hiện (trước đây có thể cắt dòng cuối).
(() => {
  let pending = null;
  const fit = (box) => {
    if (typeof fitCheckText === 'function') box.querySelectorAll('.compact-check textarea, .zen-check-add textarea').forEach(fitCheckText);
  };
  const decorate = () => {
    const body = document.querySelector('#editor-body');
    const list = body?.querySelector('.wf-check-sort-list');
    if (!body) return;
    if (list && !list.dataset.zenChecks) {
      list.dataset.zenChecks = '1';
      const rows = [...list.querySelectorAll(':scope > .compact-check')];
      rows.forEach((row, index) => {
        const remove = row.querySelector('.compact-check-remove');
        const actions = document.createElement('div');
        actions.className = 'zen-check-actions';
        const label = (row.querySelector('textarea')?.value || '').trim().slice(0, 40);
        if (remove) actions.append(remove);
        row.append(actions);
      });
    }
    const extra = body.querySelector('[name=extra-checks]');
    const button = body.querySelector('.wf-add-check');
    if (extra && !extra.closest('.zen-check-add')) {
      const label = extra.closest('label');
      const text = label && [...label.childNodes].find((node) => node.nodeType === 3 && /Thêm checklist/.test(node.textContent));
      if (text) text.textContent = 'Thêm mục mới';
      extra.rows = 1;
      extra.placeholder = 'Thêm việc cần làm…';
      const wrap = document.createElement('div');
      wrap.className = 'zen-check-add';
      extra.before(wrap);
      wrap.append(extra);
      if (button) wrap.append(button);
      const hint = document.createElement('small');
      hint.className = 'zen-check-hint';
      hint.textContent = 'Enter để thêm · Shift + Enter để thêm nhiều mục';
      wrap.after(hint);
    }
    requestAnimationFrame(() => {
      fit(body);
      if (pending) {
        const { id, dir } = pending;
        pending = null;
        const row = body.querySelector('[data-wf-check-id="' + id + '"]');
        const target = row?.querySelector('.zen-check-move[data-zen-check-move="' + dir + '"]:not([disabled])') || row?.querySelector('.zen-check-move:not([disabled])');
        target?.focus({ preventScroll: false });
      }
    });
    setTimeout(() => fit(body), 200);
  };
  const before = taskDetail;
  taskDetail = function (p, t) {
    before(p, t);
    decorate();
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-zen-check-move]');
    if (!button || button.disabled) return;
    event.preventDefault();
    const row = button.closest('.compact-check');
    const dir = Number(button.dataset.zenCheckMove);
    const siblings = [...row.parentElement.children].filter((el) => el.matches('.compact-check') && !el.hidden);
    const target = siblings[siblings.indexOf(row) + dir];
    if (!target) return;
    pending = { id: row.dataset.wfCheckId, dir };
    wfMove('check', row.dataset.wfCheckId, editing?.p || '', target, dir > 0);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !event.target.matches?.('.zen-check-add textarea')) return;
    event.preventDefault();
    event.target.closest('.zen-check-add').querySelector('.wf-add-check')?.click();
  });
  document.addEventListener('input', (event) => {
    if (event.target.matches?.('.zen-check-add textarea') && typeof fitCheckText === 'function') fitCheckText(event.target);
  });
})();

// v1.17.6: thẻ việc ở Chế độ tập trung có hiệu ứng khi rê chuột / lấy tiêu điểm (CSS). Ở đây chỉ gắn màu dự án vào thẻ (--card-color) để vạch nhấn phía trên mang màu dự án.
(() => {
  const before = wfFocusCard;
  wfFocusCard = function (t) {
    return before(t).replace('class="wf-focus-card"', 'class="wf-focus-card" style="--card-color:' + esc(t.project.color) + '"');
  };
})();

// v1.18.0: sửa công việc ngay trong Chế độ tập trung (không mở hộp thoại): đổi tên, mô tả (có định dạng), và checklist — tích, sửa chữ, thêm, xóa (có Hoàn tác), đổi thứ tự bằng ↑/↓.
// Mọi thay đổi tự lưu qua wfSave (có kiểm tra giới hạn và hoàn nguyên khi lỗi); nút "Xong" đóng chế độ sửa và vẽ lại màn hình.
(() => {
  const PENCIL = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z M13.5 6.5l4 4"/></svg>';
  const SEL = '#main .wf-focus-workspace > article.wf-focus-task';
  const MAX_CHECKS = 200;
  let editKey = null;
  let undo = null;
  let timers = {};

  const keyOf = () => (_WF.focus ? _WF.focus.p + ':' + _WF.focus.t : null);
  const current = () => {
    const f = _WF.focus;
    const p = f && project(f.p);
    const t = p?.tasks.find((x) => x.id === f.t && !x.archived);
    return t ? { p, t } : {};
  };
  // Lưu một thay đổi lên đúng việc đang tập trung (tra lại theo id vì wfSave có thể hoàn nguyên `data`).
  const apply = (mutate) => {
    const f = _WF.focus;
    if (!f) return false;
    return wfSave(() => {
      const t = project(f.p)?.tasks.find((x) => x.id === f.t);
      if (!t) throw Error('Công việc đã thay đổi hoặc bị xóa trên thiết bị khác.');
      mutate(t);
    });
  };
  const status = (text) => {
    const el = document.querySelector('.zen-fe-status');
    if (el) el.textContent = text;
  };
  const saved = () => status('Đã lưu ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }));

  const rowHTML = (c, i, n) =>
    '<div class="zen-fe-row' + (c.done ? ' is-complete' : '') + '" data-fe-id="' + esc(c.id) + '">' +
    '<button type="button" class="zen-fe-grip" draggable="true" data-fe-grip data-fe-id="' + esc(c.id) + '" aria-label="Kéo để đổi thứ tự mục ' + (i + 1) + ' (hoặc Alt + ↑/↓)" title="Kéo để đổi thứ tự">⠿</button>' +
    '<input type="checkbox" data-fe-toggle aria-label="Đã xong: ' + esc(c.text.slice(0, 60)) + '"' + (c.done ? ' checked' : '') + '>' +
    '<textarea data-fe-text rows="1" maxlength="300" aria-label="Nội dung mục ' + (i + 1) + '">' + esc(c.text) + '</textarea>' +
    '<label class="zen-ck-pct">' + zenPctMarkup(checkPct(c), 'data-fe-pct', 'Tiến độ mục ' + (i + 1) + ': ' + c.text.slice(0, 40)) + '</label>' +
    '<div class="zen-check-actions">' +
    '<button type="button" class="compact-check-remove zen-fe-remove" data-fe-remove aria-label="Xóa mục" title="Xóa mục">×</button>' +
    '</div></div>';
  const checksHTML = (t) =>
    '<h3>Checklist <small>' + t.checks.filter((c) => c.done).length + '/' + t.checks.length + '</small></h3>' +
    (undo && undo.tid === t.id ? '<p class="zen-fe-undo" role="status">Đã xóa mục «' + esc(undo.item.text.slice(0, 40)) + '» <button type="button" class="text-btn" data-fe-undo>Hoàn tác</button></p>' : '') +
    '<div class="zen-fe-list">' + t.checks.map((c, i) => rowHTML(c, i, t.checks.length)).join('') + '</div>' +
    '<div class="zen-check-add"><textarea data-fe-new rows="1" maxlength="300" placeholder="Thêm việc cần làm…" aria-label="Thêm mục checklist mới"></textarea><button type="button" class="btn primary" data-fe-add>+ Thêm</button></div>' +
    '<small class="zen-check-hint">Enter để thêm · Shift + Enter để thêm nhiều mục</small>';
  const fit = (root) => {
    if (typeof fitCheckText === 'function') root.querySelectorAll('textarea[data-fe-text], textarea[data-fe-new]').forEach(fitCheckText);
  };
  const paintChecks = (focus) => {
    const { t } = current();
    const box = document.querySelector('.zen-fe-checks');
    if (!t || !box) return;
    box.innerHTML = checksHTML(t);
    requestAnimationFrame(() => {
      fit(box);
      // v1.19.8: chỉ đưa con trỏ về ô mong muốn khi con trỏ đã mất do vẽ lại (activeElement về body). Nếu khung hình trễ mà người dùng
      // đã chuyển sang ô khác (ví dụ vừa Hoàn tác rồi gõ ngay vào ô Thêm mục mới) thì không giật con trỏ đi nơi khác, tránh nuốt phím Enter.
      const active = document.activeElement;
      if (focus && (!active || active === document.body)) box.querySelector(focus)?.focus();
    });
    setTimeout(() => fit(box), 200);
    refreshMeta();
  };
  // Cập nhật tiến độ và dòng trạng thái của khối đọc (đang ẩn) ngay khi dữ liệu đổi để khi thoát chế độ sửa vẫn khớp.
  const refreshMeta = () => {
    const { p, t } = current();
    const article = document.querySelector(SEL);
    if (!t || !article) return;
    const done = t.checks.filter((c) => c.done).length;
    const meta = article.querySelector('.wf-focus-progress-meta');
    if (meta) meta.innerHTML = '<span>' + done + '/' + t.checks.length + ' mục hoàn thành</span>';
    const old = article.querySelector('.wf-focus-task-progress, .progress');
    if (old) {
      const tmp = document.createElement('div');
      tmp.innerHTML = bar(taskPct(t), p.color);
      tmp.firstElementChild.classList.add('wf-focus-task-progress');
      old.replaceWith(tmp.firstElementChild);
    }
    const sub = article.querySelector('.wf-focus-task-meta');
    if (sub) sub.textContent = t.col + (t.due ? ' · Hạn ' + dateLabel(t.due) : '');
  };
  const enter = (article) => {
    const { t } = current();
    if (!t) return;
    editKey = keyOf();
    article.classList.add('zen-focus-editing');
    article.querySelector('.zen-fe-toolbar')?.remove();
    const bar0 = document.createElement('div');
    bar0.className = 'zen-fe-toolbar is-editing';
    bar0.innerHTML = '<span class="zen-fe-status" role="status" aria-live="polite">Mọi thay đổi tự lưu</span><button type="button" class="btn primary" data-fe-done>Xong</button>';
    article.prepend(bar0);
    article.querySelector('.zen-fe-form')?.remove();
    const form = document.createElement('form');
    form.className = 'zen-fe-form';
    form.noValidate = true;
    form.addEventListener('submit', (e) => e.preventDefault());
    form.innerHTML =
      '<label class="field">Tên công việc<input name="title" maxlength="200" value="' + esc(t.title) + '" autocomplete="off"></label>' +
      '<label class="field">Mô tả<textarea name="description" maxlength="5000">' + esc(t.description || '') + '</textarea></label>' +
      '<section class="zen-fe-checks"></section>';
    const anchor = article.querySelector(':scope > .wf-focus-progress-meta') || article.lastElementChild;
    anchor.before(form);
    if (typeof wfRichEditor === 'function') wfRichEditor(form.querySelector('[name=description]'));
    paintChecks();
  };
  const exit = () => {
    flushPending();
    editKey = null;
    undo = null;
    render();
  };
  const paint = () => {
    if (view !== 'focus') {
      editKey = null;
      undo = null;
      return;
    }
    const article = document.querySelector(SEL);
    const { t } = current();
    if (!article || !t) return;
    if (editKey && editKey !== keyOf()) editKey = null;
    if (article.querySelector('.zen-fe-toolbar, .zen-fe-form')) return;
    if (editKey) return enter(article);
    const bar0 = document.createElement('div');
    bar0.className = 'zen-fe-toolbar';
    bar0.innerHTML = '<button type="button" class="btn zen-fe-edit-btn" data-fe-edit>' + PENCIL + '<span>Sửa tại đây</span></button>';
    article.prepend(bar0);
  };
  const before = wfPaintFocus;
  wfPaintFocus = function () {
    before();
    paint();
  };

  // Lưu chữ đang gõ: tên và mô tả lưu sau khi ngừng gõ 0,6 giây và khi rời ô; không vẽ lại để không mất con trỏ.
  const commitTitle = () => {
    const input = document.querySelector('.zen-fe-form [name=title]');
    const { t } = current();
    if (!input || !t) return;
    const value = input.value.trim();
    if (!value) return;
    if (value !== t.title && apply((x) => { x.title = value.slice(0, 200); })) {
      const h1 = document.querySelector(SEL + ' h1');
      if (h1) h1.textContent = value;
      saved();
    }
  };
  const commitDescription = () => {
    const source = document.querySelector('.zen-fe-form [name=description]');
    const { t } = current();
    if (!source || !t) return;
    const value = source.value;
    if (value.length > 5000) return notify('Mô tả vượt giới hạn 5.000 ký tự.');
    if (value !== (t.description || '') && apply((x) => { x.description = value; })) saved();
  };
  const flushPending = () => {
    Object.values(timers).forEach(clearTimeout);
    timers = {};
    commitTitle();
    commitDescription();
  };
  const later = (name, fn) => {
    clearTimeout(timers[name]);
    status('Đang lưu…');
    timers[name] = setTimeout(fn, 600);
  };

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-fe-edit],[data-fe-done],[data-fe-remove],[data-fe-undo],[data-fe-add]');
    if (!target) return;
    const article = target.closest(SEL) || document.querySelector(SEL);
    if (target.matches('[data-fe-edit]')) {
      event.preventDefault();
      if (!current().t || contentReadOnly) return contentReadOnly ? notify('Bản chia sẻ chỉ có quyền xem.') : undefined;
      article.querySelector('.zen-fe-toolbar')?.remove();
      enter(article);
      article.querySelector('.zen-fe-form [name=title]')?.focus();
      return;
    }
    if (target.matches('[data-fe-done]')) {
      event.preventDefault();
      return exit();
    }
    const row = target.closest('.zen-fe-row');
    const id = row?.dataset.feId;
    if (target.matches('[data-fe-remove]')) {
      event.preventDefault();
      const { t } = current();
      const index = t?.checks.findIndex((c) => c.id === id);
      if (index < 0) return;
      const item = { ...t.checks[index] };
      if (apply((x) => { x.checks.splice(x.checks.findIndex((c) => c.id === id), 1); syncChecks(x); })) {
        undo = { tid: t.id, item, index };
        saved();
        paintChecks('[data-fe-new]');
      }
      return;
    }
    if (target.matches('[data-fe-undo]')) {
      event.preventDefault();
      if (!undo) return;
      const { item, index } = undo;
      if (apply((x) => { if (x.checks.length < MAX_CHECKS) x.checks.splice(Math.min(index, x.checks.length), 0, item); if (x.col === 'Done' && !x.checks.every((c) => c.done)) x.col = 'Doing'; })) {
        undo = null;
        saved();
        paintChecks('.zen-fe-row[data-fe-id="' + item.id + '"] textarea');
      }
      return;
    }
    if (target.matches('[data-fe-add]')) {
      event.preventDefault();
      addFromInput();
    }
  });
  const addFromInput = () => {
    const input = document.querySelector('.zen-fe-form [data-fe-new]');
    if (!input) return;
    const lines = input.value.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return input.focus();
    const { t } = current();
    if (t.checks.length >= MAX_CHECKS) return notify('Tối đa 200 mục checklist mỗi việc.');
    if (apply((x) => {
      lines.slice(0, MAX_CHECKS - x.checks.length).forEach((text) => x.checks.push({ id: uid(), text: text.slice(0, 300), done: false }));
      if (x.col === 'Done') x.col = 'Doing';
    })) {
      undo = null;
      saved();
      paintChecks('[data-fe-new]');
    }
  };
  // v1.19.0: đổi thứ tự mục checklist trong Chế độ tập trung bằng kéo thả (tay ⠿) hoặc Alt + ↑/↓ trên tay kéo; thay cho nút ↑/↓ đã bỏ.
  // to là vị trí cuối của mục trong danh sách (tính sau khi đã bỏ mục khỏi vị trí cũ).
  const moveCheck = (id, to) => {
    if (!apply((t) => {
      const from = t.checks.findIndex((c) => c.id === id);
      if (from < 0) return;
      const [item] = t.checks.splice(from, 1);
      t.checks.splice(Math.max(0, Math.min(t.checks.length, to)), 0, item);
    })) return false;
    saved();
    paintChecks('.zen-fe-grip[data-fe-id="' + id + '"]');
    return true;
  };
  document.addEventListener('keydown', (event) => {
    const grip = event.target.closest?.('[data-fe-grip]');
    if (!grip || !event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const t = current().t;
    if (!t) return;
    const i = t.checks.findIndex((c) => c.id === grip.dataset.feId);
    const j = i + (event.key === 'ArrowUp' ? -1 : 1);
    if (i < 0 || j < 0 || j >= t.checks.length) return;
    moveCheck(grip.dataset.feId, j);
  });
  let dragId = null;
  const clearDropMarks = () => document.querySelectorAll('.zen-fe-row.zen-fe-drop-before,.zen-fe-row.zen-fe-drop-after,.zen-fe-row.zen-fe-dragging').forEach((el) => el.classList.remove('zen-fe-drop-before', 'zen-fe-drop-after', 'zen-fe-dragging'));
  const dropSide = (row, clientY) => {
    const r = row.getBoundingClientRect();
    return clientY < r.top + r.height / 2 ? 'before' : 'after';
  };
  document.addEventListener('dragstart', (event) => {
    const grip = event.target.closest?.('[data-fe-grip]');
    if (!grip) return;
    dragId = grip.dataset.feId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragId);
    }
    grip.closest('.zen-fe-row')?.classList.add('zen-fe-dragging');
  });
  document.addEventListener('dragover', (event) => {
    if (!dragId) return;
    const row = event.target.closest?.('.zen-fe-row');
    if (!row || !row.closest('.zen-fe-list')) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const side = dropSide(row, event.clientY);
    row.classList.toggle('zen-fe-drop-before', side === 'before');
    row.classList.toggle('zen-fe-drop-after', side === 'after');
  });
  document.addEventListener('drop', (event) => {
    if (!dragId) return;
    const row = event.target.closest?.('.zen-fe-row');
    if (!row || !row.closest('.zen-fe-list')) return;
    event.preventDefault();
    const id = dragId, targetId = row.dataset.feId, side = dropSide(row, event.clientY);
    dragId = null;
    clearDropMarks();
    if (targetId === id) return;
    const t = current().t;
    if (!t) return;
    const src = t.checks.findIndex((c) => c.id === id);
    const dst = t.checks.findIndex((c) => c.id === targetId);
    if (src < 0 || dst < 0) return;
    let to = dst + (side === 'before' ? 0 : 1);
    if (src < to) to -= 1;
    if (to !== src) moveCheck(id, to);
  });
  // Cảm ứng và bút: kéo bằng sự kiện con trỏ (HTML5 không chạy trên điện thoại). Chuột vẫn dùng kéo thả ở trên.
  let pointerDrag = null;
  const dropMark = (row, side) => {
    row.classList.toggle('zen-fe-drop-before', side === 'before');
    row.classList.toggle('zen-fe-drop-after', side === 'after');
  };
  const applyDrop = (id, targetId, side) => {
    if (!id || !targetId || targetId === id) return;
    const t = current().t;
    if (!t) return;
    const src = t.checks.findIndex((c) => c.id === id);
    const dst = t.checks.findIndex((c) => c.id === targetId);
    if (src < 0 || dst < 0) return;
    let to = dst + (side === 'before' ? 0 : 1);
    if (src < to) to -= 1;
    if (to !== src) moveCheck(id, to);
  };
  document.addEventListener('pointerdown', (event) => {
    const grip = event.target.closest?.('[data-fe-grip]');
    if (!grip || event.pointerType === 'mouse' || event.button !== 0) return;
    event.preventDefault();
    try { grip.setPointerCapture(event.pointerId); } catch (_) { /* bỏ qua nếu trình duyệt không cho giữ con trỏ */ }
    pointerDrag = { id: grip.dataset.feId, moved: false, over: null };
    grip.closest('.zen-fe-row')?.classList.add('zen-fe-dragging');
  });
  document.addEventListener('pointermove', (event) => {
    if (!pointerDrag) return;
    pointerDrag.moved = true;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.zen-fe-row');
    clearDropMarks();
    document.querySelector('.zen-fe-row[data-fe-id="' + pointerDrag.id + '"]')?.classList.add('zen-fe-dragging');
    if (!row || !row.closest('.zen-fe-list') || row.dataset.feId === pointerDrag.id) {
      pointerDrag.over = null;
      return;
    }
    const side = dropSide(row, event.clientY);
    dropMark(row, side);
    pointerDrag.over = { id: row.dataset.feId, side };
  });
  const endPointer = (event) => {
    if (!pointerDrag) return;
    const d = pointerDrag;
    pointerDrag = null;
    clearDropMarks();
    if (event.type === 'pointerup' && d.moved && d.over) applyDrop(d.id, d.over.id, d.over.side);
  };
  document.addEventListener('pointerup', endPointer);
  document.addEventListener('pointercancel', endPointer);
  document.addEventListener('dragend', () => {
    dragId = null;
    clearDropMarks();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.target.matches?.('.zen-fe-form [data-fe-new]')) {
      event.preventDefault();
      addFromInput();
    } else if (event.key === 'Enter' && !event.isComposing && event.target.matches?.('.zen-fe-form [name=title], .zen-fe-form textarea[data-fe-text]')) {
      event.preventDefault();
      event.target.blur();
    } else if (event.key === 'Escape' && editKey && event.target.closest?.('.zen-fe-form')) {
      event.preventDefault();
      exit();
    }
  });
  document.addEventListener('input', (event) => {
    const el = event.target;
    if (!el.closest?.('.zen-fe-form')) return;
    if (el.matches('[name=title]')) later('title', commitTitle);
    else if (el.matches('textarea[data-fe-text], textarea[data-fe-new]') && typeof fitCheckText === 'function') fitCheckText(el);
    if (el.matches('[contenteditable]')) later('description', commitDescription);
  });
  document.addEventListener('focusout', (event) => {
    if (event.target.closest?.('.zen-fe-form [contenteditable]')) setTimeout(() => { clearTimeout(timers.description); commitDescription(); }, 0);
  });
  document.addEventListener('change', (event) => {
    const el = event.target;
    if (!el.closest?.('.zen-fe-form')) return;
    if (el.matches('[name=title]')) {
      if (!el.value.trim()) {
        el.value = current().t?.title || '';
        return notify('Tên công việc không được để trống.');
      }
      clearTimeout(timers.title);
      commitTitle();
      return;
    }
    const row = el.closest('.zen-fe-row');
    const id = row?.dataset.feId;
    if (el.matches('[data-fe-toggle]')) {
      const wasDone = current().t?.col === 'Done';
      let nowDone = false;
      if (apply((t) => {
        const c = t.checks.find((x) => x.id === id);
        if (!c) return;
        c.done = el.checked;
        c.pct = el.checked ? 100 : c.pct >= 100 ? 0 : c.pct;
        syncChecks(t);
        nowDone = t.col === 'Done';
      })) {
        saved();
        zenPctPaint(row, el.checked ? 100 : checkPct(current().t?.checks.find((x) => x.id === id) || { done: false, pct: 0 }));
        row.classList.toggle('is-complete', el.checked);
        refreshMeta();
        const heading = document.querySelector('.zen-fe-checks h3 small');
        const { t } = current();
        if (heading && t) heading.textContent = t.checks.filter((c) => c.done).length + '/' + t.checks.length;
        if (el.checked) celebrateCompletion(!wasDone && nowDone ? completionKindFor(current().p, current().t) : 'check');
      } else el.checked = !el.checked;
    } else if (el.matches('[data-fe-pct]')) {
      const v = Math.min(100, Math.max(0, Math.round(Number(el.value) || 0)));
      const wasDone = current().t?.col === 'Done';
      let nowDone = false;
      if (apply((t) => {
        const c = t.checks.find((x) => x.id === id);
        if (!c) return;
        c.pct = v;
        c.done = v === 100;
        syncChecks(t);
        nowDone = t.col === 'Done';
      })) {
        saved();
        zenPctPaint(row, v);
        refreshMeta();
        if (v === 100) celebrateCompletion(!wasDone && nowDone ? completionKindFor(current().p, current().t) : 'check');
      } else zenPctPaint(row, checkPct(current().t?.checks.find((x) => x.id === id) || { done: false, pct: 0 }));
    } else if (el.matches('textarea[data-fe-text]')) {
      const value = el.value.trim();
      const c = current().t?.checks.find((x) => x.id === id);
      if (!c) return;
      if (!value) {
        el.value = c.text;
        return notify('Nội dung mục không được để trống. Dùng nút × để xóa mục.');
      }
      if (value !== c.text && apply((t) => { t.checks.find((x) => x.id === id).text = value.slice(0, 300); })) saved();
    }
  });
})();

// v1.18.3: "Giao diện" và "Dung lượng dữ liệu" trong Cài đặt được thu gọn như các nhóm khác (đóng sẵn, bấm tiêu đề để mở).
// Hai phần này được chèn sau khi nhóm Cài đặt đã dựng xong (giao diện ở đây, dung lượng ở modules/settings-capacity.mjs),
// nên bộ quan sát theo dõi #editor-body và bọc lại từng phần khi nó xuất hiện.
(() => {
  const COLLAPSE = [
    ['.settings-theme', 'Giao diện'],
    ['#storage-capacity', 'Dung lượng dữ liệu'],
  ];
  const collapseSettings = (body) => {
    for (const [selector, title] of COLLAPSE) {
      const node = body.querySelector(':scope > ' + selector);
      if (!node) continue;
      const group = document.createElement('details');
      group.className = 'wf-settings-group zen-settings-collapse';
      const summary = document.createElement('summary');
      summary.textContent = title;
      const content = document.createElement('div');
      content.className = 'wf-settings-content';
      group.append(summary, content);
      node.before(group);
      content.append(node);
    }
  };
  const baseAccountPanel = accountPanel;
  accountPanel = function () {
    baseAccountPanel.apply(this, arguments);
    const body = document.querySelector('#editor-body');
    if (!body) return;
    collapseSettings(body);
    const observer = new MutationObserver(() => collapseSettings(body));
    observer.observe(body, { childList: true });
    document.querySelector('#editor').addEventListener('close', () => observer.disconnect(), { once: true });
  };
})();

// v1.19.0: checklist gọn hơn và có tiến độ riêng từng mục. Chỉ còn kéo thả để đổi thứ tự (Alt + ↑/↓ vẫn dùng được bằng bàn phím);
// v1.42.0: thay thanh kéo bằng ô số nhỏ gọn cuối dòng (nhập trực tiếp 0–100). Tick = 100%; bỏ tick = 0%.
// Tiến độ việc và dự án được tính ở app.js (checkPct, taskPct, progress). Hộp công việc lưu % cùng lúc với nút Lưu (taskux.js).
function zenPctMarkup(value, attrs, label) {
  const v = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  return (
    '<input type="number" min="0" max="100" step="5" value="' + v + '" class="zen-ck-num" ' + attrs + ' aria-label="' + esc(label) + ' (%)">' +
    '<span class="zen-ck-pct-unit" aria-hidden="true">%</span>'
  );
}
function zenPctPaint(row, value) {
  if (!row) return;
  const v = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  const num = row.querySelector('input[type="number"].zen-ck-num');
  const box = row.querySelector('input[name^="check-done-"], input[data-fe-toggle]');
  if (num && Number(num.value) !== v) num.value = String(v);
  if (box && box.checked !== (v === 100)) box.checked = v === 100;
  row.classList.toggle('is-complete', v === 100);
}
(() => {
  const addToRows = () => {
    const body = document.querySelector('#editor-body');
    if (!body || !editing) return;
    const t = project(editing.p)?.tasks.find((x) => x.id === editing.t);
    if (!t) return;
    body.querySelectorAll('.compact-check[data-check-index]').forEach((row) => {
      if (row.querySelector('.zen-ck-pct')) return;
      const i = Number(row.dataset.checkIndex);
      const c = t.checks[i];
      if (!c) return;
      const label = (row.querySelector('textarea')?.value || '').trim().slice(0, 40);
      const wrap = document.createElement('label');
      wrap.className = 'zen-ck-pct';
      wrap.innerHTML = zenPctMarkup(checkPct(c), 'name="check-pct-' + i + '"', 'Tiến độ mục ' + (i + 1) + (label ? ': ' + label : ''));
      // v1.42.0: ô % đặt trước nút × để thứ tự Tab khớp thứ tự đọc (text → % → ×).
      const actionsEl = row.querySelector('.zen-check-actions');
      if (actionsEl) row.insertBefore(wrap, actionsEl);
      else row.append(wrap);
    });
  };
  const beforeRows = taskDetail;
  taskDetail = function (p, t) {
    const wasOpen = !!document.querySelector('#editor')?.open;
    beforeRows(p, t);
    addToRows();
    if (!wasOpen) refreshTaskFormSnapshot();
  };
  document.addEventListener('input', (event) => {
    const el = event.target;
    if (el.matches?.('.compact-check input[name^="check-pct-"]')) zenPctPaint(el.closest('.compact-check'), Number(el.value));
    else if (el.matches?.('[data-fe-pct]')) zenPctPaint(el.closest('.zen-fe-row'), Number(el.value));
  });
  document.addEventListener('change', (event) => {
    const el = event.target;
    if (!el.matches?.('.compact-check input[name^="check-done-"]')) return;
    const row = el.closest('.compact-check');
    const current = Number(row.querySelector('input[name^="check-pct-"]')?.value) || 0;
    zenPctPaint(row, el.checked ? 100 : current >= 100 ? 0 : current);
  });
})();

// v1.46.0: việc đã hoàn thành (cột Xong) không còn được ghim: khi lưu, tự gỡ ghim cho mọi việc Xong còn ghim.
// Việc đang mở vẫn ghim như cũ. Dùng chuỗi wrapper của save() nên luôn chạy trước khi dữ liệu được lưu.
function zenUnpinDoneTasks() {
  let changed = false;
  for (const p of data?.projects || []) {
    for (const t of p.tasks || []) {
      if (t.pinned && t.col === 'Done') {
        t.pinned = false;
        changed = true;
      }
    }
  }
  return changed;
}
const zenSaveBeforeUnpin = save;
save = function (...args) {
  zenUnpinDoneTasks();
  return zenSaveBeforeUnpin.apply(this, args);
};

/* v1.47.0: tab dự án cao thêm khi tên dài xuống dòng, nên khung dính cao hơn. Khoảng đệm cuộn theo đúng chiều cao khung dính
   (từ 701px trở lên) để ô đang lấy nét không bị khung che; dưới 701px trả về quy tắc CSS cũ. */
(() => {
  const tabs = document.getElementById('tabs');
  if (!tabs || typeof ResizeObserver !== 'function') return;
  const sync = () => {
    if (!window.matchMedia('(min-width:701px)').matches) {
      document.documentElement.style.removeProperty('scroll-padding-top');
      return;
    }
    const top = parseFloat(getComputedStyle(tabs).top) || 0;
    document.documentElement.style.setProperty('scroll-padding-top', Math.ceil(top + tabs.offsetHeight + 8) + 'px');
  };
  new ResizeObserver(sync).observe(tabs);
  window.addEventListener('resize', sync);
  sync();
})();

// v1.56.0 — Gom Đồng bộ, Giao diện tối và Thông báo vào MỘT dropdown có icon ở góc phải thanh trên.
// Di chuyển chính các phần tử hiện có (giữ nguyên id và trình xử lý sự kiện), không tạo lại.
(() => {
  const actions = document.querySelector('.topbar .top-actions');
  if (!actions || document.getElementById('top-tools')) return;
  const icons = {
    sync: '<path d="M7 18a4.5 4.5 0 0 1-.9-8.9 6 6 0 0 1 11.6 1.9A3.5 3.5 0 0 1 17 18z"/><path d="M9.5 13.5l2 2 3.5-3.5"/>',
    moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    tune: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  };
  const svg = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const wrap = document.createElement('div');
  wrap.id = 'top-tools';
  wrap.className = 'top-tools';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'top-tools-trigger';
  trigger.className = 'icon-btn top-tools-trigger';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'top-tools-panel');
  trigger.setAttribute('aria-label', 'Tùy chọn nhanh');
  trigger.title = 'Tùy chọn nhanh';
  trigger.innerHTML = svg(icons.tune) + '<span class="top-tools-dot" hidden aria-hidden="true"></span>';
  const panel = document.createElement('div');
  panel.id = 'top-tools-panel';
  panel.className = 'top-tools-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Tùy chọn nhanh');
  panel.hidden = true;
  const addRow = (icon, label, node) => {
    if (!node) return;
    const row = document.createElement('div');
    row.className = 'top-tools-row';
    row.innerHTML = `<span class="top-tools-ico">${svg(icon)}</span><span class="top-tools-label">${label}</span><span class="top-tools-value"></span>`;
    row.querySelector('.top-tools-value').append(node);
    panel.append(row);
  };
  addRow(icons.sync, 'Đồng bộ', document.querySelector('#save-state'));
  addRow(icons.moon, 'Giao diện tối', document.querySelector('#theme-toggle'));
  addRow(icons.bell, 'Thông báo', document.querySelector('#notifications-button'));
  wrap.append(trigger, panel);
  actions.prepend(wrap);

  const setOpen = (open) => {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    wrap.classList.toggle('is-open', open);
  };
  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(panel.hidden);
  });
  // Bấm "Thông báo" trong dropdown thì đóng dropdown để hộp thoại mở ra không bị che.
  panel.addEventListener('click', (event) => {
    if (event.target.closest('#notifications-button')) setOpen(false);
  });
  // composedPath được chốt lúc sự kiện bắt đầu: nút đổi giao diện vẽ lại biểu tượng nên phần tử được bấm có thể đã bị gỡ khỏi DOM.
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !event.composedPath().includes(wrap)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });
  // Chấm đỏ trên nút khi có thông báo cần xem (đọc từ số đếm của chuông).
  const bell = document.querySelector('#notifications-button');
  const dot = trigger.querySelector('.top-tools-dot');
  const syncDot = () => {
    dot.hidden = !(bell && bell.querySelector('.notification-count'));
  };
  if (bell) new MutationObserver(syncDot).observe(bell, { childList: true, subtree: true });
  syncDot();
})();
