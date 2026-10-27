"use strict";
/* Small refinements to the established 1.x workflow. */
function wfTransferTask(
  workspace,
  fromId,
  taskId,
  toId,
  copy = false,
  reset = true,
) {
  const from = workspace.projects.find((p) => p.id === fromId),
    to = workspace.projects.find((p) => p.id === toId),
    task = from?.tasks.find((t) => t.id === taskId);
  if (!task || !to || to.archived || from === to)
    throw Error("Chọn một dự án khác đang hoạt động.");
  if (to.tasks.length >= 2000) throw Error("Dự án đích đã có 2.000 công việc.");
  const target = copy ? structuredClone(task) : task;
  if (copy) {
    target.id = uid();
    target.checks = target.checks.map((c) => ({
      ...c,
      id: uid(),
      ...(reset ? { done: false } : {}),
    }));
    if (reset) target.col = "List";
    delete target.history;
    delete target.comments;
  } else {
    from.tasks = from.tasks.filter((t) => t.id !== taskId);
    from.dependencies = (from.dependencies || []).filter(
      (e) => e.from !== taskId && e.to !== taskId,
    );
  }
  if (!to.columns.includes(target.col)) target.col = "List";
  target.sortOrder = to.tasks.length;
  to.tasks.push(target);
  from.tasks.forEach((t, i) => (t.sortOrder = i));
  return target;
}
function wfOrderTask(workspace, pid, tid, targetId, col, after = false) {
  const p = workspace.projects.find((p) => p.id === pid),
    t = p?.tasks.find((t) => t.id === tid),
    target = p?.tasks.find((t) => t.id === targetId);
  if (!t || t.archived || !p.columns.includes(col) || target === t)
    return false;
  const list = p.tasks
    .slice()
    .sort(
      (a, b) =>
        (a.sortOrder ?? p.tasks.indexOf(a)) -
        (b.sortOrder ?? p.tasks.indexOf(b)),
    )
    .filter((x) => x !== t);
  if (target) {
    const i = list.indexOf(target);
    list.splice(i + (after ? 1 : 0), 0, t);
  } else {
    const last = list
      .map((x, i) => (x.col === col ? i : -1))
      .filter((i) => i >= 0)
      .at(-1);
    list.splice(last === undefined ? list.length : last + 1, 0, t);
  }
  if (t.col !== col) {
    t.col = col;
    if (col === "Done") t.checks.forEach((c) => (c.done = true));
    else if (t.checks.length && t.checks.every((c) => c.done))
      t.checks.at(-1).done = false;
  }
  p.tasks = list;
  list.forEach((x, i) => (x.sortOrder = i));
  return true;
}
function wfOrderNote(workspace, id, targetId, after = false) {
  const note = workspace.notes?.find((n) => n.id === id),
    target = workspace.notes?.find((n) => n.id === targetId);
  if (!note || !target || note === target) return false;
  const notes = workspace.notes
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? workspace.notes.indexOf(a)) -
          (b.sortOrder ?? workspace.notes.indexOf(b)),
      )
      .filter((n) => n !== note),
    i = notes.indexOf(target);
  note.pinned = !!target.pinned;
  notes.splice(i + (after ? 1 : 0), 0, note);
  notes.forEach((n, i) => (n.sortOrder = i));
  workspace.notes = notes;
  return true;
}
const _WF = { moving: null, pointer: null, suppressUntil: 0, note: null };
function wfSave(change) {
  const before = structuredClone(data);
  try {
    if (contentReadOnly) throw Error("Bản chia sẻ chỉ có quyền xem.");
    change();
    if (!valid(data)) throw Error("Dữ liệu vượt giới hạn hoặc không hợp lệ.");
    if (new TextEncoder().encode(JSON.stringify(data)).length > 1850000)
      throw Error(
        "Dữ liệu vượt dung lượng đồng bộ. Hãy xuất bản sao và giảm nội dung.",
      );
    if (save() === false) throw Error("Chưa lưu được trên thiết bị.");
    return true;
  } catch (e) {
    data = before;
    notify(e.message);
    return false;
  }
}
function wfGrip(kind, id, pid = "") {
  return (
    '<button draggable="true" type="button" class="wf-grip" data-wf-sort="' +
    kind +
    '" data-wf-id="' +
    esc(id) +
    '" data-wf-pid="' +
    esc(pid) +
    '" aria-label="Kéo để sắp xếp. Alt và phím mũi tên để di chuyển" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" title="Kéo để đổi vị trí · Alt + ↑/↓"><svg viewBox="0 0 20 20" aria-hidden="true" fill="currentColor"><circle cx="7" cy="5" r="1.2"/><circle cx="13" cy="5" r="1.2"/><circle cx="7" cy="10" r="1.2"/><circle cx="13" cy="10" r="1.2"/><circle cx="7" cy="15" r="1.2"/><circle cx="13" cy="15" r="1.2"/></svg></button>'
  );
}
taskCard = function (t, p) {
  const pref = taskPreferences(),
    pct = taskPct(t);
  return (
    '<article class="task-card wf-task-card" draggable="true" data-task="' +
    esc(t.id) +
    '" data-pid="' +
    esc(p.id) +
    '" role="button" tabindex="0" aria-label="' +
    esc(t.title) +
    '"><header class="wf-card-head"><span class="tag">' +
    esc(t.tag || "Công việc") +
    "</span>" +
    wfGrip("task", t.id, p.id) +
    "</header><h3>" +
    esc(t.title) +
    "</h3>" +
    (t.description
      ? '<div class="wf-card-description zen-formatted">' +
        zenFormattedHTML(t.description) +
        "</div>"
      : "") +
    (pref.progress
      ? '<div class="progress-meta"><span>' +
        t.checks.filter((c) => c.done).length +
        "/" +
        t.checks.length +
        " mục</span><strong>" +
        pct +
        "%</strong></div>" +
        bar(pct, p.color)
      : "") +
    (pref.checks
      ? '<ul class="card-checks">' +
        t.checks
          .map(
            (c) =>
              '<li class="' +
              (c.done ? "completed" : "") +
              '"><label class="card-check-control"><input type="checkbox" data-card-check="' +
              esc(c.id) +
              '" data-check-task="' +
              esc(t.id) +
              '" data-check-project="' +
              esc(p.id) +
              '" ' +
              (c.done ? "checked" : "") +
              ' aria-label="Hoàn thành ' +
              esc(c.text) +
              '"><span>' +
              esc(c.text) +
              "</span></label></li>",
          )
          .join("") +
        "</ul>"
      : "") +
    '<div class="wf-card-keywords">' +
    matrixChip(t) +
    labelChips(t) +
    '</div><div class="task-footer">' +
    (t.due ? "Hạn " + dateLabel(t.due) : "Chưa đặt hạn") +
    (t.due && t.due < today() && t.col !== "Done" ? " · Quá hạn" : "") +
    "</div></article>"
  );
};
function wfRichEditor(source) {
  if (!source || source.dataset.wfRich) return;
  source.dataset.wfRich = "true";
  const shell = document.createElement("div");
  shell.className = "wf-rich-editor";
  shell.innerHTML =
    '<div class="zen-format-tools wf-format-toolbar" role="toolbar" aria-label="Định dạng mô tả">' +
    [
      ["H1", "h1", "Tiêu đề lớn"],
      ["H2", "h2", "Tiêu đề vừa"],
      ["Aa", "plain", "Văn bản thường"],
      ["B", "bold", "In đậm"],
      ["I", "italic", "In nghiêng"],
      ["U", "underline", "Gạch dưới"],
      ["S̶", "strike", "Gạch ngang"],
    ]
      .map(
        ([label, command, tip]) =>
          '<button type="button" data-wf-format="' +
          command +
          '" title="' +
          tip +
          '" aria-label="' +
          tip +
          '">' +
          label +
          "</button>",
      )
      .join("") +
    '<select aria-label="Kiểu danh sách"><option value="">Danh sách…</option><option value="bullets">• Chấm tròn</option><option value="numbers">1. Đánh số</option><option value="circle">◦ Vòng tròn</option><option value="square">▪ Hình vuông</option></select></div><div class="zen-wysiwyg wf-task-description" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Mô tả công việc"></div>';
  const label = source.closest("label.field");
  if (label) {
    const field = document.createElement("div");
    field.className = "field wf-description-field";
    const title = document.createElement("span");
    title.textContent = "Mô tả";
    label.before(field);
    field.append(title, source);
    label.remove();
  }
  source.after(shell);
  source.hidden = true;
  source.classList.add("zen-source-textarea");
  source.setAttribute("aria-hidden", "true");
  source.tabIndex = -1;
  const rich = shell.querySelector("[contenteditable]");
  rich.innerHTML = zenFormattedHTML(source.value);
  const sync = () => {
    source.value = zenRichMarkdown(rich);
    source.setCustomValidity(
      source.value.length > (source.maxLength > 0 ? source.maxLength : 5000) ? "Mô tả vượt giới hạn ký tự." : "",
    );
  };
  rich.addEventListener("input", sync);
  rich.addEventListener("blur", sync);
  rich.addEventListener("paste", (e) => {
    e.preventDefault();
    document.execCommand(
      "insertText",
      false,
      e.clipboardData?.getData("text/plain") || "",
    );
    sync();
  });
  let range = null;
  const picker = shell.querySelector("select");
  picker.onpointerdown = () => {
    const s = window.getSelection();
    if (s?.rangeCount && rich.contains(s.anchorNode))
      range = s.getRangeAt(0).cloneRange();
  };
  shell.querySelectorAll("button").forEach((b) => {
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = () => {
      zenApplyFormatting(rich, b.dataset.wfFormat);
      sync();
    };
  });
  picker.onchange = () => {
    if (range) {
      const s = window.getSelection();
      rich.focus();
      s.removeAllRanges();
      s.addRange(range);
    }
    if (picker.value) zenApplyFormatting(rich, picker.value);
    picker.value = "";
    sync();
  };
  const controller = new AbortController();
  source.form.addEventListener("submit", sync, {
    capture: true,
    signal: controller.signal,
  });
  $("#editor").addEventListener("close", () => controller.abort(), {
    once: true,
  });
}
const wfBaseTaskForm = taskForm;
taskForm = function (p, t, col = "List") {
  wfBaseTaskForm(p, t, col);
  const body = $("#editor-body");
  if (!body.querySelector("[name=title]")) return;
  $("#editor").classList.add("wf-task-editor");
  $("#editor").addEventListener(
    "close",
    () => $("#editor").classList.remove("wf-task-editor"),
    { once: true },
  );
  body.querySelector("h2")?.classList.add("wf-task-heading");
  body.querySelector("[name=title]").classList.add("wf-task-title");
  wfRichEditor(body.querySelector("[name=description]"));
  if (!t && data.taskTemplates?.length) {
    const picker = document.createElement("label");
    picker.className = "field";
    picker.innerHTML = '<span>Dùng mẫu công việc</span><select aria-label="Chọn mẫu công việc"><option value="">Chọn mẫu…</option></select>';
    const select = picker.querySelector("select");
    data.taskTemplates.forEach(template => { const option = document.createElement("option"); option.value = template.id; option.textContent = template.title; select.append(option); });
    select.onchange = () => {
      const template = data.taskTemplates.find(item => item.id === select.value);
      if (!template) return;
      const form = $("#editor-form");
      form.elements.title.value = template.title;
      form.elements.description.value = template.description;
      const rich = body.querySelector(".wf-task-description");
      if (rich) rich.innerHTML = zenFormattedHTML(template.description);
      form.elements.tag.value = template.tag;
      form.elements.checks.value = template.checks.join("\n");
    };
    const removeTemplate = document.createElement("button"); removeTemplate.type="button"; removeTemplate.className="btn"; removeTemplate.textContent="Xóa mẫu đã chọn";
    removeTemplate.onclick=()=>{const id=select.value;if(!id)return;if(!confirm("Xóa mẫu này?"))return;if(wfSave(()=>{data.taskTemplates=data.taskTemplates.filter(template=>template.id!==id);})){select.querySelector('option:checked')?.remove();select.value="";notify("Đã xóa mẫu.");}};
    picker.append(removeTemplate);
    body.prepend(picker);
  }
  if (t) {
    const tools = document.createElement("div");
    tools.className = "wf-task-tools";
    tools.innerHTML =
      '<button type="button" class="btn" data-wf-transfer="move">Chuyển dự án</button><button type="button" class="btn" data-wf-transfer="copy">Copy sang dự án</button><button type="button" class="btn" data-wf-archive="' +
      esc(t.id) +
      '" data-pid="' +
      p.id +
      '">' +
      (t.archived ? "Khôi phục task" : "Lưu trữ task") +
      "</button>";
    body.append(tools);
  }
};
function wfAfterTaskSave(fn) {
  const form = $("#editor-form"),
    dialog = $("#editor"),
    ctx = { ...editing },
    scrollTop = dialog.scrollTop;
  if (!form.checkValidity()) return form.reportValidity();
  const after = () => {
    const p = project(ctx.p),
      t = p?.tasks.find((t) => t.id === ctx.t);
    if (t) {
      fn(p, t);
      requestAnimationFrame(() => { if (dialog.open) dialog.scrollTop = scrollTop; });
    }
  };
  dialog.addEventListener("close", after, { once: true });
  form.requestSubmit();
  if (dialog.open) dialog.removeEventListener("close", after);
}
function wfTransferDialog(p, t, copy) {
  modal(
    "<h2>" +
      (copy ? "Copy công việc" : "Chuyển công việc") +
      '</h2><p class="help-copy">' +
      esc(t.title) +
      '</p><label class="field">Dự án đích<select name="destination" required>' +
      data.projects
        .filter((x) => !x.archived && x.id !== p.id)
        .map((x) => '<option value="' + x.id + '">' + esc(x.name) + "</option>")
        .join("") +
      "</select></label>" +
      (copy
        ? '<label class="check-row"><input type="checkbox" name="reset" checked><span>Bắt đầu lại checklist và đưa task vào List</span></label><p class="help-copy">Copy nội dung, định dạng, từ khóa và lịch. Tệp đính kèm ở lại task gốc.</p>'
        : '<p class="help-copy">Giữ nội dung, checklist và tệp đính kèm. Các liên kết phụ thuộc Gantt của task trong dự án cũ sẽ được gỡ.</p>'),
    (fd) => {
      let result;
      if (
        wfSave(
          () =>
            (result = wfTransferTask(
              data,
              p.id,
              t.id,
              fd.get("destination"),
              copy,
              fd.has("reset"),
            )),
        )
      ) {
        $("#editor").close();
        go("projects", fd.get("destination"));
        notify(
          copy ? "Đã tạo bản copy." : "Đã chuyển công việc và nơi quản lý tệp.",
        );
      }
    },
  );
}
const wfBaseDetail = taskDetail;
taskDetail = function (p, t) {
  wfBaseDetail(p, t);
  const form = $("#editor-form"),
    body = $("#editor-body");
  const nextButton = body.querySelector("#detail-next");
  if (body.querySelector(".detail-actions")) {
    const states = document.createElement("div");
    states.className = "wf-state-choices";
    states.setAttribute("aria-label", "Chuyển trạng thái công việc");
    p.columns.forEach((col, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wf-state-choice";
      button.dataset.stateIndex = String(index % 4);
      button.textContent = p.columnNames?.[col] || col;
      button.setAttribute("aria-pressed", String(t.col === col));
      button.onclick = () => {
        if (col === t.col && form.elements.col.value === col) return;
        form.elements.col.value = col;
        form.requestSubmit();
      };
      states.append(button);
    });
    if (nextButton) nextButton.replaceWith(states);
    else body.querySelector(".detail-actions").prepend(states);
  }
  const templateButton = document.createElement("button");
  templateButton.type = "button";
  templateButton.className = "btn";
  templateButton.textContent = "Lưu làm mẫu";
  body.querySelector(".wf-task-tools")?.append(templateButton);
  templateButton.onclick = () => wfAfterTaskSave((project, task) => {
    if ((data.taskTemplates || []).length >= 100) { notify("Tối đa 100 mẫu công việc."); return; }
    const template = {id: uid(), title: task.title, description: task.description, tag: task.tag, checks: task.checks.map(item => item.text)};
    data.taskTemplates ||= [];
    data.taskTemplates.push(template);
    if (!save()) { data.taskTemplates.pop(); notify("Chưa lưu được mẫu."); return; }
    render(); taskDetail(project, task); notify("Đã lưu mẫu công việc.");
  });
  const comments = document.createElement("section");
  comments.className = "wf-comments";
  comments.innerHTML = '<h3>Bình luận</h3><div class="wf-comment-list"></div><label class="field"><span class="sr-only">Viết bình luận</span><textarea maxlength="2000" rows="5" placeholder="Ghi lại điều cần nhớ…"></textarea></label><button type="button" class="btn">+ Thêm bình luận</button>';
  const commentList = comments.querySelector(".wf-comment-list");
  (t.comments || []).forEach(comment => { const item = document.createElement("p"); const time = document.createElement("small"); time.textContent = new Date(comment.at).toLocaleString("vi-VN", {timeZone:"Asia/Ho_Chi_Minh"}); const text = document.createElement("span"); text.textContent = comment.text; item.append(time, text); commentList.append(item); });
  comments.querySelector("button").onclick = () => {
    const text = comments.querySelector("textarea").value.trim();
    if (!text) return;
    if ((t.comments || []).length >= 200) { notify("Tối đa 200 bình luận."); return; }
    wfAfterTaskSave((project, task) => {
      task.comments ||= []; task.comments.push({id:uid(), text, at:Date.now()});
      if (!save()) { task.comments.pop(); notify("Chưa lưu được bình luận."); return; }
      render(); taskDetail(project, task); notify("Đã thêm bình luận.");
    });
  };
  body.append(comments);
  const rows = [...body.querySelectorAll(".compact-check")];
  if (rows.length) {
    const list = document.createElement("div");
    list.className = "wf-check-sort-list";
    rows[0].before(list);
    rows.forEach((row, i) => {
      row.dataset.checkIndex = i;
      row.dataset.wfCheckId = t.checks[i].id;
      row.insertAdjacentHTML(
        "afterbegin",
        wfGrip("check", t.checks[i].id, p.id),
      );
      list.append(row);
    });
  }
  const extra = body.querySelector("[name=extra-checks]");
  if (extra) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn primary wf-add-check";
    button.dataset.wfAddCheck = "";
    button.textContent = "+ Thêm";
    extra.after(button);
    button.onclick = () => {
      if (!extra.value.trim()) {
        extra.focus();
        return;
      }
      const scroll = body.scrollTop;
      wfAfterTaskSave((p, t) => {
        taskDetail(p, t);
        body.scrollTop = scroll;
        body.querySelector("[name=extra-checks]")?.focus();
      });
    };
  }
  const copy = body.querySelector(".help-copy:last-child");
  if (copy && copy.textContent.includes("Chỉnh trực tiếp"))
    copy.textContent =
      "Nút Thêm lưu nội dung đang chỉnh và mở tiếp checklist. Kéo tay nắm để đổi thứ tự; Alt + ↑/↓ cũng dùng được.";
};
const wfArchiveBefore = archivePage;
archivePage = function () {
  const tasks = data.projects.flatMap((p) =>
    p.tasks.filter((t) => t.archived).map((t) => ({ ...t, project: p })),
  );
  return (
    wfArchiveBefore() +
    '<section class="panel wf-task-archive"><h2>Công việc đã lưu trữ <small>' +
    tasks.length +
    '</small></h2><p class="help-copy">Task giữ nguyên dữ liệu và được tạm ẩn khỏi các góc nhìn đang làm.</p>' +
    tasks
      .map(
        (t) =>
          '<div class="wf-archive-row"><button class="text-btn" data-task="' +
          t.id +
          '" data-pid="' +
          t.project.id +
          '"><strong>' +
          esc(t.title) +
          "</strong><small>" +
          esc(t.project.name) +
          '</small></button><button class="btn" data-wf-archive="' +
          t.id +
          '" data-pid="' +
          t.project.id +
          '">Khôi phục</button></div>',
      )
      .join("") +
    "</section>"
  );
};
const wfNoteBefore = noteForm;
noteForm = function (n) {
  wfNoteBefore(n);
  document.querySelectorAll("#editor [data-zen-format=strike]").forEach((b) => {
    b.textContent = "S";
    b.style.textDecoration = "line-through";
  });
  if (contentReadOnly) return;
  const dialog = $("#editor"),
    form = $("#editor-form"),
    composer = dialog.querySelector(".note-composer");
  if (!composer) return;
  _WF.note?.abort();
  const controller = new AbortController(),
    id = dialog.dataset.noteId,
    owner = currentUser?.id || KEY;
  let timer,
    pending = false;
  const status = composer.querySelector(".zen-rich-save-state");
  const state = {
    id,
    owner,
    pending: false,
    abort: () => {
      clearTimeout(timer);
      controller.abort();
      if (_WF.note === state) _WF.note = null;
    },
    flush: () => {
      if ((currentUser?.id || KEY) !== owner || dialog.dataset.noteId !== id)
        return false;
      const rich = composer.querySelector(".zen-wysiwyg"),
        source = composer.querySelector("[name=text]");
      if (rich && source && !rich.hidden) source.value = zenRichMarkdown(rich);
      if (source?.value.length > 10000) {
        if (status)
          status.textContent = "Chưa lưu · nội dung tối đa 10.000 ký tự";
        return false;
      }
      const ok = dialog.noteCommit?.() === true;
      if (ok) {
        pending = false;
        state.pending = false;
        clearTimeout(timer);
        if (status) status.textContent = "Đã lưu trên máy · tự đồng bộ";
        render();
      } else if (status)
        status.textContent =
          "Chưa lưu · kiểm tra nội dung, liên kết hoặc lịch nhắc";
      return ok;
    },
  };
  _WF.note = state;
  const links = document.createElement("section");
  links.className = "wf-project-links";
  const title = document.createElement("h3"); title.textContent = "Liên kết với dự án"; links.append(title);
  const choices = document.createElement("div"); choices.className = "wf-project-choices"; links.append(choices);
  data.projects.filter(p=>!p.archived).forEach(project=>{
    const button=document.createElement("button");button.type="button";button.className="wf-project-choice";button.style.setProperty("--project-color",project.color);button.textContent=project.name;
    const refresh=()=>button.setAttribute("aria-pressed",String((project.noteIds||[]).includes(id)));refresh();
    button.onclick=()=>{
      if ((state.pending || !data.notes?.some(n=>n.id===id)) && !state.flush()) return;
      if (!wfSave(()=>{project.noteIds ||= [];if(project.noteIds.includes(id))project.noteIds=project.noteIds.filter(x=>x!==id);else {if(project.noteIds.length>=100)throw Error("Tối đa 100 ghi chú liên kết mỗi dự án.");project.noteIds.push(id);}}))return;
      refresh();render();
    };choices.append(button);
  });
  const taskLabel=document.createElement("h4");taskLabel.textContent="Liên kết với công việc";links.append(taskLabel);
  const picker=document.createElement("select");picker.setAttribute("aria-label","Chọn công việc để liên kết");picker.innerHTML='<option value="">Chọn công việc…</option>';
  data.projects.filter(p=>!p.archived).forEach(p=>{const group=document.createElement("optgroup");group.label=p.name;p.tasks.filter(t=>!t.archived).forEach(t=>{const option=document.createElement("option");option.value=t.id;option.textContent=t.title;option.selected=(t.noteIds||[]).includes(id);group.append(option);});picker.append(group);});picker.value="";
  const linkTask=document.createElement("button");linkTask.type="button";linkTask.className="btn";linkTask.textContent="Liên kết / Bỏ liên kết";
  const linked=document.createElement("p");linked.className="subtext";const refreshLinks=()=>{linked.replaceChildren();data.projects.forEach(p=>p.tasks.filter(t=>(t.noteIds||[]).includes(id)).forEach(t=>{const open=document.createElement('button');open.type='button';open.className='btn';open.textContent=p.name+' · '+t.title;open.onclick=()=>{if(state.pending&&!state.flush())return;taskDetail(p,t);};linked.append(open);}));if(!linked.childNodes.length)linked.textContent='Chưa liên kết công việc';};refreshLinks();
  linkTask.onclick=()=>{const task=data.projects.flatMap(p=>p.tasks).find(t=>t.id===picker.value);if(!task)return;if((state.pending||!data.notes?.some(n=>n.id===id))&&!state.flush())return;if(wfSave(()=>{task.noteIds ||= [];if(task.noteIds.includes(id))task.noteIds=task.noteIds.filter(x=>x!==id);else {if(task.noteIds.length>=100)throw Error('Tối đa 100 liên kết.');task.noteIds.push(id);}})){refreshLinks();render();}};
  links.append(picker,linkTask,linked);
  const disclosure=document.createElement("details");disclosure.className="wf-link-picker";const summary=document.createElement("summary");summary.textContent="Liên kết dự án / công việc";disclosure.append(summary,links);
  const actions=composer.querySelector(".note-editor-actions");if(actions)actions.before(disclosure);else composer.append(disclosure);
  const queue = () => {
    if ((currentUser?.id || KEY) !== owner) return;
    pending = state.pending = true;
    clearTimeout(timer);
    if (status) status.textContent = "Đang lưu…";
    timer = setTimeout(state.flush, 650);
  };
  form.addEventListener(
    "input",
    (e) => {
      if (e.target.type !== "file") queue();
    },
    { signal: controller.signal },
  );
  form.addEventListener(
    "change",
    (e) => {
      if (e.target.type !== "file") queue();
    },
    { signal: controller.signal },
  );
  form.addEventListener(
    "click",
    (e) => {
      if (
        e.target.closest(
          "[data-note-item-hide],[data-note-add-item],[data-zen-format],[data-zen-pin].zen-editor-pin",
        )
      )
        queueMicrotask(queue);
    },
    { signal: controller.signal },
  );
  const done =
    composer.querySelector("#note-save") || dialog.querySelector("#note-save");
  if (done) {
    done.type = "button";
    done.textContent = "Xong";
    done.onclick = () => {
      if (state.flush()) dialog.close();
    };
  }
  dialog.addEventListener(
    "cancel",
    (e) => {
      if (pending && !state.flush()) e.preventDefault();
    },
    { signal: controller.signal },
  );
  dialog.addEventListener(
    "close",
    () => {
      state.abort();
    },
    { once: true, signal: controller.signal },
  );
};
document.addEventListener(
  "click",
  (e) => {
    if (
      e.target.closest("[data-action=close-modal]") &&
      _WF.note?.pending &&
      !_WF.note.flush()
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);
window.addEventListener("beforeunload", (e) => {
  if (_WF.note?.pending && !_WF.note.flush()) {
    e.preventDefault();
    e.returnValue = "";
  }
});
const wfPinBefore = zenPinButton;
zenPinButton = function (n, inEditor) {
  const b = wfPinBefore(n, inEditor);
  b.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="' +
    (n.pinned ? "currentColor" : "none") +
    '" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5h6c.8 0 1.2.9.6 1.5l-1 1.1.6 5.1 2.8 2.5c.7.6.3 1.8-.7 1.8H6.7c-1 0-1.4-1.2-.7-1.8l2.8-2.5.6-5.1-1-1.1c-.6-.6-.2-1.5.6-1.5Z"/><path d="M12 15.5v5"/></svg>';
  return b;
};
// Rounded, self-contained illustrations keep the note texture quiet and readable.
const wfPatternBefore = zenPattern;
zenPattern = function (id) {
  if (id === "none") return "";
  const palette =
    ZEN_PALETTE[id] ||
    {
      creative: ["#fff0e6", "#b97870", "#ecc2a1"],
      rest: ["#e9e8f6", "#807da8", "#bbb9da"],
      travel: ["#e5f1f3", "#5f929e", "#a7cfcd"],
      freelancer: ["#eeebf5", "#8573a3", "#c4b6dc"],
    }[id];
  if (!palette) return wfPatternBefore(id);
  const [paper, ink, accent] = palette,
    leaf =
      '<path d="M210 370C140 300 160 220 245 210C270 290 250 340 210 370Z"/><path d="M212 366Q214 284 245 210" fill="none"/>',
    petal =
      '<path d="M340 350C260 320 270 230 340 185C410 230 420 320 340 350Z"/>';
  let art = "";
  switch (id) {
    case "leaves":
      art =
        '<g transform="rotate(-18 340 300)">' +
        leaf +
        '<g transform="translate(240 -55) rotate(40 210 300)">' +
        leaf +
        "</g></g>";
      break;
    case "forest":
      art = [0, 1, 2, 3, 4]
        .map(
          (i) =>
            '<g transform="translate(' +
            (40 + i * 125) +
            " " +
            (i % 2) * 30 +
            ')"><path d="M25 370V235" fill="none"/><path d="M25 150Q10 172-12 209Q-20 224 0 224Q-22 254-29 273Q-33 285-12 286H62Q83 285 79 273Q72 254 50 224Q70 224 62 209Q40 172 25 150Z"/></g>',
        )
        .join("");
      break;
    case "lotus":
      art =
        "<g>" +
        petal +
        '<g transform="rotate(-34 340 355)">' +
        petal +
        '</g><g transform="rotate(34 340 355)">' +
        petal +
        '</g><path d="M225 366Q340 408 455 366" fill="none"/></g>';
      break;
    case "meditation":
    case "yoga":
      art =
        '<circle cx="340" cy="205" r="30"/><path d="M300 270Q340 235 380 270L410 320Q450 344 470 365Q340 403 210 365Q230 344 270 320Z"/><path d="M285 315Q340 355 395 315" fill="none"/>';
      break;
    case "awareness":
    case "awakening":
      art =
        '<circle cx="340" cy="275" r="65"/>' +
        Array.from(
          { length: 12 },
          (_, i) =>
            '<path d="M340 165v-18" transform="rotate(' +
            i * 30 +
            ' 340 275)" fill="none"/>',
        ).join("");
      break;
    case "stream":
      art =
        '<path d="M210 160C570 205 130 285 460 330C600 350 380 390 220 400" fill="none" stroke-width="12"/><path d="M190 190C510 220 150 300 430 350" fill="none"/>';
      break;
    case "creative":
      art =
        '<rect x="220" y="205" width="235" height="155" rx="35"/><path d="M265 245h140M265 280h100M265 315h125" fill="none"/><path d="M465 190Q480 175 490 193L398 326L378 336L381 314Z"/>';
      break;
    case "rest":
      art =
        '<path d="M390 165C245 135 220 355 370 370C285 295 350 245 390 165Z"/><path d="M450 215h25m-12-12v25M210 270h18m-9-9v18" fill="none"/>';
      break;
    case "travel":
      art =
        '<path d="M175 360Q225 235 255 230Q280 230 315 315Q360 160 395 165Q430 165 505 360Z"/><path d="M240 390C440 365 270 335 385 290" fill="none"/>';
      break;
    case "freelancer":
      art =
        '<rect x="225" y="190" width="230" height="155" rx="25"/><path d="M200 365Q340 390 480 365L455 345H225Z"/><path d="M275 235h130m-130 40h85" fill="none"/>';
      break;
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 450"><rect width="680" height="450" rx="48" fill="' +
    paper +
    '"/><path d="M0 370Q180 300 340 350T680 330V450H0Z" fill="' +
    accent +
    '" opacity=".25"/><g fill="' +
    accent +
    '" fill-opacity=".45" stroke="' +
    ink +
    '" stroke-opacity=".36" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    art +
    "</g></svg>"
  );
};
function wfApplyCards() {
  document.querySelectorAll(".keep-grid,.zen-notes-grid").forEach((grid) => {
    const cards = [...grid.querySelectorAll(":scope > .keep-card")];
    cards.sort((a, b) => {
      const na = data.notes?.find((n) => n.id === a.dataset.noteId),
        nb = data.notes?.find((n) => n.id === b.dataset.noteId);
      return (
        (na?.sortOrder ?? data.notes?.indexOf(na) ?? 0) -
        (nb?.sortOrder ?? data.notes?.indexOf(nb) ?? 0)
      );
    });
    for (const card of cards) {
      grid.append(card);
      if (!contentReadOnly) {
        card.draggable = true;
        if (!card.querySelector("[data-wf-sort]"))
          card.insertAdjacentHTML(
            "afterbegin",
            wfGrip("note", card.dataset.noteId),
          );
      }
    }
  });
}
const wfSelectedTasks = new Set();
function wfTaskListTools() {
  const owner=currentUser?.id || KEY;if (_WF.selectedOwner !== owner) { wfSelectedTasks.clear(); _WF.selectedOwner=owner; }
  const table = $("#main .task-table"), panel = table?.closest(".table-wrap");
  if (!table || !panel || panel.querySelector(".wf-list-tools")) return;
  const tools = document.createElement("div"); tools.className="wf-list-tools";
  tools.innerHTML='<label>Từ khóa <select class="wf-keyword"><option value="">Tất cả</option></select></label><label>Sắp xếp <select class="wf-sort"><option value="default">Mặc định</option><option value="title">Tên A–Z</option><option value="due">Hạn gần nhất</option></select></label><button type="button" class="btn wf-select-all">Chọn kết quả</button><label>Chuyển trạng thái <select class="wf-bulk-state"><option value="">Chọn trạng thái…</option></select></label><button type="button" class="btn wf-bulk-apply">Áp dụng</button><button type="button" class="btn wf-archive-selected">Lưu trữ đã chọn</button><span class="wf-selected-count" aria-live="polite"></span>';
  panel.before(tools);
  const rows=[...table.querySelectorAll("tbody tr[data-task]")], key=tools.querySelector(".wf-keyword");
  const find=row=>project(row.dataset.pid)?.tasks.find(t=>t.id===row.dataset.task);
  [...new Set(rows.flatMap(row=>(find(row)?.labels||[]).map(label=>label.name)))].sort((a,b)=>a.localeCompare(b,'vi')).forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;key.append(option);});
  const update=()=>{const value=key.value;for(const row of rows)row.hidden=!!value&&!(find(row)?.labels||[]).some(label=>label.name===value);tools.querySelector('.wf-selected-count').textContent=wfSelectedTasks.size+' đã chọn';};
  key.onchange=update;
  tools.querySelector('.wf-sort').onchange=e=>{const mode=e.target.value;const sorted=[...rows].sort((a,b)=>mode==='title'?(find(a)?.title||'').localeCompare(find(b)?.title||'','vi'):mode==='due'?(find(a)?.due||'9999').localeCompare(find(b)?.due||'9999'):rows.indexOf(a)-rows.indexOf(b));sorted.forEach(row=>table.tBodies[0].append(row));};
  rows.forEach(row=>{const input=document.createElement('input');input.type='checkbox';input.checked=wfSelectedTasks.has(row.dataset.task);input.setAttribute('aria-label','Chọn '+(find(row)?.title||'công việc'));input.onclick=e=>e.stopPropagation();input.onchange=()=>{input.checked?wfSelectedTasks.add(row.dataset.task):wfSelectedTasks.delete(row.dataset.task);update();};row.cells[0].prepend(input);});
  tools.querySelector('.wf-select-all').onclick=()=>{rows.filter(row=>!row.hidden).forEach(row=>{wfSelectedTasks.add(row.dataset.task);row.querySelector('input').checked=true;});update();};
  const bulkState=tools.querySelector('.wf-bulk-state');[...new Set(data.projects.flatMap(p=>p.columns))].forEach(col=>{const option=document.createElement('option');option.value=col;option.textContent=col;bulkState.append(option);});
  tools.querySelector('.wf-bulk-apply').onclick=()=>{const col=bulkState.value;if(!col||!wfSelectedTasks.size)return;const selected=data.projects.flatMap(p=>p.tasks.filter(t=>wfSelectedTasks.has(t.id)).map(t=>({p,t})));if(selected.some(({p})=>!p.columns.includes(col)))return notify('Một dự án không có trạng thái này. Hãy chọn lại các công việc phù hợp.');if(wfSave(()=>selected.forEach(({t})=>{t.col=col;if(col==='Done')t.checks.forEach(c=>c.done=true);else if(t.checks.length&&t.checks.every(c=>c.done))t.checks.at(-1).done=false;}))){wfSelectedTasks.clear();render();notify('Đã chuyển trạng thái các công việc đã chọn.');}};
  tools.querySelector('.wf-archive-selected').onclick=()=>{if(!wfSelectedTasks.size)return;const count=wfSelectedTasks.size;if(!confirm('Lưu trữ '+count+' công việc đã chọn?'))return;if(wfSave(()=>{data.projects.forEach(p=>p.tasks.forEach(t=>{if(wfSelectedTasks.has(t.id))t.archived=true;}));})){wfSelectedTasks.clear();render();notify('Đã lưu trữ các công việc đã chọn.');}};
  const filters=document.createElement("details");filters.className="wf-filter-panel";filters.open=!!_WF.filtersOpen;const summary=document.createElement("summary");summary.textContent="☷ Bộ lọc & sắp xếp";filters.append(summary);const filterBody=document.createElement("div");filterBody.className="wf-filter-body";filters.append(filterBody);
  const original=$("#main .filter-row");if(original)filterBody.append(original);
  filterBody.append(key.closest('label'),tools.querySelector('.wf-sort').closest('label'));tools.before(filters);filters.ontoggle=()=>{_WF.filtersOpen=filters.open;};
  tools.querySelector('.wf-select-all').textContent='Chọn tất cả kết quả';
  tools.classList.add('wf-bulk-tools');
  const visibility=()=>{tools.classList.toggle('has-selection',wfSelectedTasks.size>0);};tools.addEventListener('change',visibility);tools.addEventListener('click',()=>queueMicrotask(visibility));table.addEventListener('change',visibility);visibility();
  update();
}
const wfRenderBefore = render;
render = function () {
  if(currentUser && _WF.navOwner!==currentUser.id){_WF.navOwner=currentUser.id;try{const last=JSON.parse(localStorage.getItem(KEY+'-navigation')||'null');if(last&&['projects','timeline','calendar','gantt'].includes(last.view)&&data.projects.some(p=>p.id===last.id&&!p.archived)){view=last.view;active=last.id;}}catch{}}
  wfRenderBefore();
  document.querySelector('#tabs')?.classList.toggle('has-current-project',!!active&&['projects','timeline','calendar','gantt'].includes(view));
  if (view === "notes") wfApplyCards();
  wfLabels();
  if (view === "tasks") wfTaskListTools();
  wfPaintFocus();
};
function wfMove(kind, id, pid, target, after) {
  if (kind === "check") {
    const row = document.querySelector('[data-wf-check-id="' + id + '"]'),
      to = target.closest(".compact-check");
    if (!row || !to || row === to) return;
    to.parentElement.insertBefore(row, after ? to.nextSibling : to);
    _WF.suppressUntil = Date.now() + 400;
    wfAfterTaskSave((p, t) => {
      taskDetail(p, t);
      const handle = $('#editor [data-wf-id="' + id + '"]');
      handle?.focus({ preventScroll: true });
    });
    return;
  }
  if (kind === "task") {
    const col = target.closest(".column")?.dataset.column,
      card = target.closest(".task-card"),
      tid = card?.dataset.task;
    if (tid === id) return;
    if (col && wfSave(() => wfOrderTask(data, pid, id, tid, col, after))) {
      render();
      document
        .querySelector('[data-wf-sort="' + kind + '"][data-wf-id="' + id + '"]')
        ?.focus({ preventScroll: true });
      _WF.suppressUntil = Date.now() + 400;
    }
  } else {
    const card = target.closest(".keep-card");
    if (card?.dataset.noteId === id) return;
    if (
      card &&
      wfSave(() => wfOrderNote(data, id, card.dataset.noteId, after))
    ) {
      render();
      document
        .querySelector('[data-wf-sort="' + kind + '"][data-wf-id="' + id + '"]')
        ?.focus({ preventScroll: true });
      _WF.suppressUntil = Date.now() + 400;
    }
  }
}
function wfDropTarget(kind, el) {
  return kind === "note"
    ? el?.closest(".keep-card")
    : kind === "check"
      ? el?.closest(".wf-check-sort-list .compact-check")
      : el?.closest(".task-card,.column");
}
function wfDragClear() {
  document
    .querySelectorAll(".wf-drop-before,.wf-drop-after,.wf-is-moving")
    .forEach((el) =>
      el.classList.remove("wf-drop-before", "wf-drop-after", "wf-is-moving"),
    );
}
document.addEventListener(
  "dragstart",
  (e) => {
    if (_WF.pointer) {
      e.preventDefault();
      return;
    }
    const handle = e.target.closest("[data-wf-sort]"),
      note = e.target.closest(".keep-card"),
      task = e.target.closest(".task-card");
    if (!handle && !note && !task) return;
    if (contentReadOnly) {
      e.preventDefault();
      return;
    }
    const kind = handle?.dataset.wfSort || (note ? "note" : "task"),
      id = handle?.dataset.wfId || note?.dataset.noteId || task?.dataset.task,
      pid = handle?.dataset.wfPid || task?.dataset.pid || "";
    _WF.moving = { kind, id, pid };
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    (handle?.closest(".compact-check") || note || task)?.classList.add(
      "wf-is-moving",
    );
  },
  true,
);
document.addEventListener(
  "dragover",
  (e) => {
    const move = _WF.moving;
    if (!move) return;
    const target = wfDropTarget(move.kind, e.target);
    if (!target) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    wfDragClear();
    const r = target.getBoundingClientRect();
    target.classList.add(
      e.clientY > r.top + r.height / 2 ? "wf-drop-after" : "wf-drop-before",
    );
  },
  true,
);
document.addEventListener(
  "drop",
  (e) => {
    const move = _WF.moving;
    if (!move) return;
    const target = wfDropTarget(move.kind, e.target);
    if (!target) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const r = target.getBoundingClientRect();
    _WF.moving = null;
    drag = null;
    wfDragClear();
    wfMove(
      move.kind,
      move.id,
      move.pid,
      target,
      e.clientY > r.top + r.height / 2,
    );
  },
  true,
);
document.addEventListener(
  "dragend",
  () => {
    _WF.moving = null;
    wfDragClear();
  },
  true,
);
// Pointer handles work on touchscreens; normal card scrolling remains available.
document.addEventListener(
  "pointerdown",
  (e) => {
    const h = e.target.closest("[data-wf-sort]");
    if (!h || e.button !== 0 || contentReadOnly) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    h.setPointerCapture(e.pointerId);
    _WF.pointer = {
      kind: h.dataset.wfSort,
      id: h.dataset.wfId,
      pid: h.dataset.wfPid,
      startY: e.clientY,
      startX: e.clientX,
      target: null,
      after: false,
      moved: false,
    };
  },
  true,
);
document.addEventListener(
  "pointermove",
  (e) => {
    const move = _WF.pointer;
    if (!move) return;
    if (Math.hypot(e.clientX - move.startX, e.clientY - move.startY) > 7)
      move.moved = true;
    if (!move.moved) return;
    e.preventDefault();
    const target = wfDropTarget(
      move.kind,
      document.elementFromPoint(e.clientX, e.clientY),
    );
    move.target = null;
    wfDragClear();
    if (target) {
      const r = target.getBoundingClientRect();
      move.target = target;
      move.after = e.clientY > r.top + r.height / 2;
      target.classList.add(move.after ? "wf-drop-after" : "wf-drop-before");
    }
    const scroller = move.kind === "check" ? $("#editor") : window,
      rect =
        move.kind === "check"
          ? scroller.getBoundingClientRect()
          : { top: 0, bottom: innerHeight };
    if (e.clientY < rect.top + 60) scroller.scrollBy(0, -12);
    else if (e.clientY > rect.bottom - 60) scroller.scrollBy(0, 12);
  },
  { capture: true, passive: false },
);
document.addEventListener(
  "pointerup",
  () => {
    const move = _WF.pointer;
    _WF.pointer = null;
    wfDragClear();
    if (move?.moved && move.target)
      wfMove(move.kind, move.id, move.pid, move.target, move.after);
  },
  true,
);
document.addEventListener(
  "pointercancel",
  () => {
    _WF.pointer = null;
    wfDragClear();
  },
  true,
);
document.addEventListener(
  "keydown",
  (e) => {
    const h = e.target.closest("[data-wf-sort]");
    if (!h || !e.altKey || !["ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const kind = h.dataset.wfSort,
      row = h.closest(
        kind === "check"
          ? ".compact-check"
          : kind === "note"
            ? ".keep-card"
            : ".task-card",
      ),
      siblings = [...row.parentElement.children].filter((el) =>
        el.matches(
          kind === "check"
            ? ".compact-check"
            : kind === "note"
              ? ".keep-card"
              : ".task-card",
        ),
      ),
      index = siblings.indexOf(row),
      target = siblings[index + (e.key === "ArrowDown" ? 1 : -1)];
    if (target)
      wfMove(
        kind,
        h.dataset.wfId,
        h.dataset.wfPid,
        target,
        e.key === "ArrowDown",
      );
  },
  true,
);
document.addEventListener(
  "click",
  (e) => {
    if (
      (Date.now() < _WF.suppressUntil &&
        e.target.closest(".task-card,.keep-card")) ||
      e.target.closest("[data-wf-sort]")
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);
document.addEventListener("click", (e) => {
  const transfer = e.target.closest("[data-wf-transfer]"),
    archive = e.target.closest("[data-wf-archive]");
  if (transfer) {
    if (data.projects.filter((p) => !p.archived).length < 2)
      return notify("Cần có ít nhất hai dự án đang hoạt động.");
    wfAfterTaskSave((p, t) =>
      wfTransferDialog(p, t, transfer.dataset.wfTransfer === "copy"),
    );
  }
  if (archive) {
    const p = project(archive.dataset.pid),
      t = p?.tasks.find((t) => t.id === archive.dataset.wfArchive);
    if (!t) return;
    const run = (p, t) => {
      if (wfSave(() => (t.archived = !t.archived))) {
        $("#editor").close();
        render();
        notify(t.archived ? "Đã lưu trữ task." : "Đã khôi phục task.");
      }
    };
    if ($("#editor").open && editing?.t === t.id) wfAfterTaskSave(run);
    else run(p, t);
  }
});
help = function () {
  const sections = [
    [
      "leaf",
      "Bắt đầu từ một việc nhỏ",
      "Chọn một dự án, nhìn việc đang làm và bước tiếp theo. Tiến độ là lời nhắc để điều chỉnh nhịp, không phải thước đo sự bận rộn.",
    ],
    [
      "projects",
      "Sắp xếp theo cách của bạn",
      "Kéo tay nắm để đổi thứ tự task, checklist và ghi chú. Điện thoại dùng cùng tay nắm; bàn phím dùng Alt + ↑/↓. Kéo task sang cột khác để đổi trạng thái.",
    ],
    [
      "check",
      "Viết rõ, làm gọn",
      "Tên task nói lên kết quả cần đạt. Dùng định dạng trong mô tả để chia ý; checklist giữ từng bước cụ thể. Nút Thêm lưu nội dung đang chỉnh và mở tiếp danh sách.",
    ],
    [
      "notes",
      "Ghi lại khi ý tưởng đến",
      "Ghi chú tự lưu sau khi dừng gõ một nhịp, kể cả tiêu đề, liên kết và checklist. Xem trạng thái lưu trong khung. Ghim điều cần nhớ, kéo thả để sắp xếp; chọn Xong khi muốn đóng.",
    ],
    [
      "archive",
      "Giữ lại, rồi nhẹ nhàng bước tiếp",
      "Lưu trữ dự án hoặc task để tạm ẩn và có thể mở lại. Chuyển task khi đổi dự án; Copy khi muốn tạo việc tương tự. Thùng rác giữ mục đã xóa 30 ngày.",
    ],
    [
      "cloudCheck",
      "Để công việc được tiếp nối",
      "Icon đồng bộ cho biết bản trên thiết bị đã gửi lên hay đang chờ. Khi mất mạng, tiếp tục ghi chép; nếu báo lỗi, giữ bản nháp và mở Settings để kiểm tra. Xuất JSON định kỳ cho những điều quan trọng.",
    ],
  ];
  modal(
    '<div class="guide-intro wf-guide"><span class="guide-mark">' +
      svgIcon("leaf") +
      '</span><h2>Mỗi việc rõ hơn, mỗi ngày nhẹ hơn</h2><p>Ghi lại điều cần nhớ. Chọn điều cần làm. Dành chỗ cho sự tập trung.</p></div><div class="guide-grid">' +
      sections
        .map(
          ([icon, title, text]) =>
            '<section class="guide-card"><h3>' +
            svgIcon(icon) +
            title +
            "</h3><p>" +
            text +
            "</p></section>",
        )
        .join("") +
      "</div>",
    null,
    true,
  );
};
/* v1.11.1 — small presentation and notification refinements. */
const wfRawNotices = taskNotices;
taskNotices = function () {
  const seen = new Set(seenNotices());
  return wfRawNotices().filter((t) => !seen.has(noticeSignature(t)));
};
markNoticesRead = function () {
  const seen = new Set(seenNotices());
  wfRawNotices().forEach((t) => seen.add(noticeSignature(t)));
  localWrite(
    "zen-notices:" + currentUser?.id,
    JSON.stringify([...seen].slice(-5000)),
  );
  dueNoteReminders().forEach((n) =>
    localWrite(
      "zen-note-seen:" + currentUser?.id + ":" + noteReminderKey(n),
      "1",
    ),
  );
  fileAlerts = [];
  localWrite(releaseKey(), latestVersion);
  $("#due-alert-strip")?.remove();
  refreshBell();
};
function wfLabels() {
  if (view === "notes")
    document
      .querySelectorAll(".note-label-filters [data-note-keyword]")
      .forEach((b) => {
        const key = b.dataset.noteKeyword,
          count = (data.notes || []).filter(
            (n) => !key || (n.keywords || []).includes(key),
          ).length;
        b.textContent = (key || "Tất cả") + " ";
        const badge = document.createElement("span");
        badge.className = "wf-keyword-count";
        badge.textContent = count;
        b.append(badge);
      });
  if (view === "projects") {
    const p = project();
    document.querySelectorAll(".column[data-column]").forEach((col) => {
      const title = col.querySelector(".column-title");
      if (!title || !p) return;
      for (const node of [...title.childNodes])
        if (node.nodeType === 3 && node.textContent.trim()) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "wf-column-name";
          b.dataset.wfColumn = col.dataset.column;
          b.textContent =
            p.columnNames?.[col.dataset.column] || col.dataset.column;
          b.title = "Đổi tên cột";
          node.replaceWith(b);
          break;
        }
    });
    const options = $(".kanban-options");
    if (options && !options.closest("details")) {
      const detail = document.createElement("details");
      detail.className = "wf-display-options";
      detail.innerHTML = "<summary>Hiển thị</summary>";
      options.before(detail);
      detail.append(options);
    }
  }
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-wf-column]");
  if (!b) return;
  const p = project(),
    key = b.dataset.wfColumn;
  modal(
    "<h2>Đổi tên cột</h2>" +
      field(
        "Tên hiển thị",
        "name",
        p.columnNames?.[key] || key,
        "text",
        true,
        40,
      ) +
      '<p class="help-copy">Tên mới áp dụng trong dự án này. Trạng thái và tiến độ công việc được giữ nguyên.</p>',
    (fd) => {
      const name = fd.get("name").trim();
      if (!name) return;
      if (
        p.columns.some(
          (c) =>
            c !== key &&
            (p.columnNames?.[c] || c).toLocaleLowerCase("vi") ===
              name.toLocaleLowerCase("vi"),
        )
      )
        return notify("Tên cột đã có trong dự án.");
      if (
        wfSave(() => {
          p.columnNames ||= {};
          p.columnNames[key] = name;
        })
      ) {
        $("#editor").close();
        render();
      }
    },
  );
});

render();

document.addEventListener("error", e => {
  if (!(e.target instanceof HTMLImageElement)) return;
  const preview=e.target.closest(".note-attachment-image-preview,.resource-cover,.resource-preview");
  if (!preview) return;
  const status=document.createElement("span");status.className="wf-file-unavailable";status.textContent="Ảnh không còn khả dụng hoặc không thể tải.";
  e.target.replaceWith(status);
}, true);

const wfGoBefore=go;go=function(v,id=null){wfGoBefore(v,id);if(['projects','timeline','calendar','gantt'].includes(view)&&active)try{localStorage.setItem(KEY+'-navigation',JSON.stringify({view,id:active}));}catch{}};

const wfProjectFormBefore=projectForm;
projectForm=function(p){wfProjectFormBefore(p);wfRichEditor($('#editor-body [name=description]'));};
const wfProjectBoardBefore=board;
board=function(){const p=project();let html=wfProjectBoardBefore();if(p?.description)html=html.replace('<p class="subtext">'+esc(p.description)+'</p>','<div class="subtext wf-project-description">'+zenFormattedHTML(p.description)+'</div>');if(!p?.noteIds?.length)return html;return html+'<section class="wf-project-documents"><h2>Ghi chú đã liên kết</h2><div class="wf-project-note-grid">'+p.noteIds.map(id=>{const n=data.notes?.find(n=>n.id===id);return n?'<article class="panel"><h3>'+esc(n.title)+'</h3><div class="wf-note-excerpt">'+zenFormattedHTML(n.text||'')+'</div><button type="button" class="btn" data-wf-document="'+esc(id)+'">Mở ghi chú</button></article>':'<p class="subtext">Ghi chú không còn khả dụng.</p>';}).join('')+'</div></section>';};
function wfFocusTasks(){return allTasks().filter(t=>!t.archived&&t.col!=='Done'&&!t.project.archived);}
function wfFocusCard(t){return '<button type="button" class="wf-focus-card" data-wf-focus="'+esc(t.id)+'" data-pid="'+esc(t.project.id)+'"><small>'+esc(t.project.name)+'</small><strong>'+esc(t.title)+'</strong><span>'+(t.due?'Hạn '+dateLabel(t.due):'Chưa đặt hạn')+' · '+esc(PRIORITIES[t.priority]||'Chưa phân loại')+'</span></button>';}
function wfPaintFocus(){
 const anchor=document.querySelector('.sidebar [data-view="tasks"]');if(anchor&&!document.querySelector('[data-view="focus"]')){const button=document.createElement('button');button.type='button';button.className='nav';button.dataset.view='focus';button.textContent='◉ Chế độ tập trung';anchor.after(button);}
 const selected=_WF.focus,projectData=selected&&project(selected.p),task=projectData?.tasks.find(t=>t.id===selected.t&&!t.archived);
 const focused=view==='focus'&&!!task;document.body.classList.toggle('wf-is-focused',focused);
 if(view!=='focus')return;
 $('#crumb').textContent='Chế độ tập trung';document.querySelector('[data-view="focus"]')?.classList.add('active');
 if(!task){_WF.focus=null;const tasks=wfFocusTasks(),day=today(),overdue=tasks.filter(t=>t.due&&t.due<day),due=tasks.filter(t=>t.due===day),rank={q1:0,q2:1,q3:2,q4:3};const suggested=[...tasks].sort((a,b)=>(rank[a.priority]??4)-(rank[b.priority]??4)||(a.due||'9999').localeCompare(b.due||'9999')).slice(0,3);$('#main').innerHTML=heading('MỘT VIỆC MỖI LÚC','Chọn điều cần tập trung','Gợi ý theo mức độ quan trọng và hạn công việc. Bạn chủ động chọn việc phù hợp.')+[ ['Gợi ý 3 việc quan trọng',suggested],['Đến hạn hôm nay',due],['Quá hạn',overdue] ].map(([title,list])=>'<section class="wf-focus-group"><h2>'+title+' <small>'+list.length+'</small></h2><div class="wf-focus-grid">'+(list.map(wfFocusCard).join('')||'<p class="subtext">Không có công việc trong nhóm này.</p>')+'</div></section>').join('');return;}
 const ids=[...new Set([...(projectData.noteIds||[]),...(task.noteIds||[])])],notes=ids.map(id=>data.notes?.find(n=>n.id===id)).filter(Boolean);
 $('#main').innerHTML='<div class="wf-focus-header"><div><small>DỰ ÁN ĐANG LÀM</small><h2>'+esc(projectData.name)+'</h2></div><button type="button" class="btn" data-wf-focus-exit>Thoát tập trung</button></div><div class="wf-focus-workspace"><article class="panel"><h1>'+esc(task.title)+'</h1><p class="subtext">'+esc(task.col)+(task.due?' · Hạn '+dateLabel(task.due):'')+'</p><div>'+zenFormattedHTML(task.description||'')+'</div>'+bar(taskPct(task),projectData.color)+'<h3>Checklist</h3>'+task.checks.map(c=>'<label class="check-row"><input type="checkbox" data-card-check="'+esc(c.id)+'" data-check-task="'+esc(task.id)+'" data-check-project="'+esc(projectData.id)+'" '+(c.done?'checked':'')+'><span>'+esc(c.text)+'</span></label>').join('')+'<button type="button" class="btn" data-task="'+esc(task.id)+'" data-pid="'+esc(projectData.id)+'">Chỉnh sửa công việc</button></article><aside class="panel"><h2>Ghi chú</h2>'+notes.map(n=>'<article class="wf-focus-note"><h3>'+esc(n.title)+'</h3><div>'+zenFormattedHTML(n.text||'')+'</div><button type="button" class="btn" data-wf-document="'+esc(n.id)+'">Mở ghi chú</button></article>').join('')+(!notes.length?'<p class="subtext">Chưa có ghi chú liên kết. Bạn có thể tạo ghi chú và liên kết với công việc này.</p>':'')+'<button type="button" class="btn" data-wf-focus-note>+ Viết ghi chú</button></aside></div>';
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-wf-focus],[data-wf-focus-exit],[data-wf-document],[data-wf-focus-note]');if(!target)return;
 if(target.hasAttribute('data-wf-focus-exit')){_WF.focus=null;render();return;}
 if(target.dataset.wfFocus){_WF.focus={p:target.dataset.pid,t:target.dataset.wfFocus};view='focus';render();window.scrollTo(0,0);return;}
 if(target.dataset.wfDocument){const n=data.notes?.find(n=>n.id===target.dataset.wfDocument);if(n)noteForm(n);return;}
 if(target.hasAttribute('data-wf-focus-note'))noteForm();
});
wfPaintFocus();
