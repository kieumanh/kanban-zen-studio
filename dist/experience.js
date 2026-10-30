'use strict';

// Keep completed checklist work out of reminders even if old data has a stale status.
const experienceSyncChecks = syncChecks;
syncChecks = function (task) {
  experienceSyncChecks(task);
  if (task.checks?.length && task.checks.every((item) => item.done)) {
    task.col = 'Done';
  }
};

const experienceTaskNotices = taskNotices;
taskNotices = function () {
  return experienceTaskNotices().filter((task) =>
    task.col !== 'Done' &&
    !(task.checks?.length && task.checks.every((item) => item.done))
  );
};

const experienceDueAlerts = dueAlerts;
dueAlerts = function () {
  return experienceDueAlerts().filter((task) =>
    task.col !== 'Done' &&
    !(task.checks?.length && task.checks.every((item) => item.done))
  );
};

// Hide the formatted empty-description placeholder in Focus Mode.
const experiencePaintFocus = wfPaintFocus;
wfPaintFocus = function () {
  experiencePaintFocus();
  if (view !== 'focus') return;
  const description = document.querySelector('.wf-focus-task-description');
  if (description && !description.textContent.trim()) description.remove();
};

// Keep session controls at the very end of Settings, including after async panels mount.
const experienceAccountPanel = accountPanel;
accountPanel = function (...args) {
  const result = experienceAccountPanel.apply(this, args);
  const body = document.querySelector('#editor-body');
  if (!body?.classList.contains('wf-settings')) return result;
  const moveSessionToEnd = () => {
    const session = [...body.querySelectorAll('.wf-settings-group')].find((group) =>
      group.querySelector(':scope > summary')?.textContent.trim() === 'Phiên đăng nhập'
    );
    if (session) {
      session.open = true;
      session.classList.add('wf-settings-session');
      const summary = session.querySelector(':scope > summary');
      if (summary && !summary.dataset.alwaysOpen) {
        summary.dataset.alwaysOpen = 'true';
        summary.addEventListener('click', (event) => event.preventDefault());
      }
    }
    if (session && body.lastElementChild !== session) body.append(session);
  };
  moveSessionToEnd();
  const observer = new MutationObserver(moveSessionToEnd);
  observer.observe(body, { childList: true });
  document.querySelector('#editor')?.addEventListener('close', () => observer.disconnect(), { once: true });
  return result;
};

// Collapse identical conflict backups only in Focus; keep all source records intact.
const experienceFocusTasks = wfFocusTasks;
wfFocusTasks = function () {
  const seen = new Set();
  const tasks = experienceFocusTasks().filter(t => !(t.checks?.length && t.checks.every(c => c.done)));
  tasks.sort((a,b) => Number(a.project.name.includes(' · Bản thiết bị')) - Number(b.project.name.includes(' · Bản thiết bị')));
  return tasks.filter(t => {
    const projectName = t.project.name.replace(/(?: · Bản thiết bị)+$/, '');
    const key = JSON.stringify([projectName,t.title,t.description||'',t.col,t.due||'',t.start||'',t.end||'',t.priority,(t.checks||[]).map(c=>[c.text,c.done])]);
    // Different projects with the same name are still independent unless one is a conflict backup.
    const original = tasks.find(x => x.project.name === projectName && x.project.id !== t.project.id);
    const identity = (t.project.name !== projectName && original ? original.project.id : t.project.id) + ':' + key;
    if (seen.has(identity)) return false;
    seen.add(identity); return true;
  });
};
let experienceRefreshing = false;
async function experienceRefresh(button, resources) {
  if (experienceRefreshing) return;
  experienceRefreshing = true;
  button.disabled = true; button.setAttribute('aria-busy','true');
  try {
    if (!navigator.onLine) throw Error('Đang ngoại tuyến. Dữ liệu trên thiết bị vẫn được giữ.');
    if (resources) {
      resourceState.key=''; await loadResources(true);
      if(resourceState.error) throw Error(resourceState.error);
    } else {
      const owner=currentUser?.id;
      if (!owner) throw Error('Vui lòng đăng nhập lại.');
      if(syncing) throw Error('Đang đồng bộ. Vui lòng thử lại sau.');
      if(dirty) await flushCloud(true);
      if(dirty||syncConflict||syncing) throw Error('Còn thay đổi chưa đồng bộ. Kiểm tra trong Cài đặt → Đồng bộ ngay.');
      const snapshot=JSON.stringify(data), revision=cloudRevision;
      const remote=await requestAPI('workspace?revision='+encodeURIComponent(revision));
      if(currentUser?.id!==owner) return;
      if(dirty||syncing||snapshot!==JSON.stringify(data)||revision!==cloudRevision) throw Error('Dữ liệu vừa thay đổi. Vui lòng làm mới lại.');
      if(!remote.unchanged){
        if(!Number.isInteger(remote.revision)||!valid(remote.data)) throw Error('Dữ liệu máy chủ chưa hợp lệ.');
        data=remote.data;cloudBase=structuredClone(remote.data);cloudRevision=remote.revision;cacheCloud();
      }
      if(view==='focus') render();
      syncStatus('● Đã đồng bộ','saved');
    }
    notify('Đã cập nhật dữ liệu mới nhất.');
  } catch(error) { notify('Chưa làm mới: '+error.message); }
  finally { experienceRefreshing=false;button.disabled=false;button.removeAttribute('aria-busy'); }
}
document.addEventListener('click',event=>{
  const button=event.target.closest('.focus-check-updates,[data-resources-refresh]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  experienceRefresh(button,button.hasAttribute('data-resources-refresh'));
},true);

// Keep project and priority together; show the task detail title once.
const experienceTaskDetail = taskDetail;
taskDetail = function (...args) {
  const result = experienceTaskDetail.apply(this,args);
  const body=document.querySelector('#editor-body'),context=body?.querySelector('.task-context');
  if(context){
    context.querySelectorAll(':scope > span:not(.task-project-badge)').forEach(label=>label.remove());
    const priority=body.querySelector(':scope > .matrix-chip');
    if(priority) context.append(priority);
  }
  return result;
};
