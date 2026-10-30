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
    if (session && body.lastElementChild !== session) body.append(session);
  };
  moveSessionToEnd();
  const observer = new MutationObserver(moveSessionToEnd);
  observer.observe(body, { childList: true });
  document.querySelector('#editor')?.addEventListener('close', () => observer.disconnect(), { once: true });
  return result;
};
