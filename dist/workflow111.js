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
    if (new TextEncoder().encode(JSON.stringify(data)).length > 20000000)
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
      ['<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10M12 5v4m-8 3h16m-8 3v4m-5 0h10"/></svg>', "strike", "Gạch ngang"],
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
  zenListMenu(picker,rich);
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
      button.textContent = columnDisplayName(p,col);
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
  const actions = body.querySelector(".detail-actions");
  if(actions) { const h=[...body.querySelectorAll("h3")].find(x=>x.textContent==="Checklist");if(h)h.before(actions);else body.append(actions); }
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
  const search=document.createElement('input');search.type='search';search.placeholder='Tìm dự án…';search.setAttribute('aria-label','Tìm dự án để liên kết');links.append(search);
  const linkStatus=document.createElement('p');linkStatus.className='subtext wf-link-status';linkStatus.setAttribute('role','status');links.append(linkStatus);
  const choices = document.createElement("div"); choices.className = "wf-project-choices"; links.append(choices);
  const updateStatus=()=>{const linked=data.projects.filter(p=>(p.noteIds||[]).includes(id));linkStatus.textContent=linked.length?'Đã liên kết: '+linked.map(p=>p.name).join(', '):'Chưa liên kết. Chọn dự án để ghi chú xuất hiện tại dự án đó.';};updateStatus();
  search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase('vi');choices.querySelectorAll('button').forEach(b=>b.hidden=!b.textContent.toLocaleLowerCase('vi').includes(q));};
  data.projects.filter(p=>!p.archived).forEach(project=>{
    const button=document.createElement("button");button.type="button";button.className="wf-project-choice";button.style.setProperty("--project-color",project.color);button.textContent=project.name;
    const refresh=()=>button.setAttribute("aria-pressed",String((project.noteIds||[]).includes(id)));refresh();
    button.onclick=()=>{
      if ((state.pending || !data.notes?.some(n=>n.id===id)) && !state.flush()) return;
      if (!wfSave(()=>{project.noteIds ||= [];if(project.noteIds.includes(id))project.noteIds=project.noteIds.filter(x=>x!==id);else {if(project.noteIds.length>=100)throw Error("Tối đa 100 ghi chú liên kết mỗi dự án.");project.noteIds.push(id);}}))return;
      refresh();updateStatus();render();
    };choices.append(button);
  });
  const disclosure=document.createElement("details");disclosure.className="wf-link-picker";const summary=document.createElement("summary");summary.textContent="Liên kết với dự án";disclosure.append(summary,links);
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
    done.innerHTML = svgIcon("check")+" Lưu";
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
      farm: ["#edf3df", "#668653", "#c1d18c"],
      family: ["#f8e9e2", "#ae786b", "#e8b6a2"],
      finance: ["#e7f1ed", "#4e8775", "#b0d2bc"],
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
    case "farm":
      art =
        '<path d="M120 340Q235 276 340 330T560 312V410H120Z" opacity=".38"/><path d="M185 337V236L340 145L495 236V337Z"/><path d="M155 236L340 120L525 236M260 337V260H345V337M385 260H450V315H385Z" fill="none"/><path d="M220 353Q245 326 270 353T320 353M375 370Q400 342 425 370T475 370" fill="none"/>';
      break;
    case "family":
      art =
        '<path d="M160 245L340 115L520 245V370H160Z"/><path d="M130 250L340 95L550 250M270 370V260H410V370M190 268H250V320H190ZM430 268H490V320H430Z" fill="none"/><circle cx="340" cy="205" r="22"/><path d="M280 225Q340 190 400 225M246 389Q340 340 434 389" fill="none"/>';
      break;
    case "finance":
      art =
        '<path d="M170 355H500M205 340V285H275V340M305 340V230H375V340M405 340V165H475V340"/><path d="M195 245L290 190L345 207L470 125M420 125H470V175" fill="none"/><path d="M315 120Q350 70 392 90Q386 140 330 148Z"/><path d="M332 143L380 98" fill="none"/>';
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
  const owner=currentUser?.id || KEY;if (_WF.selectedOwner !== owner) { wfSelectedTasks.clear(); _WF.selectedOwner=owner;_WF.listKeyword='';_WF.listSearch='';_WF.listSort='default'; }
  const table = $("#main .task-table"), panel = table?.closest(".table-wrap");
  if (!table || !panel || panel.querySelector(".wf-list-tools")) return;
  const tools = document.createElement("div"); tools.className="wf-list-tools";
  tools.innerHTML='<label>Từ khóa <select class="wf-keyword"><option value="">Tất cả</option></select></label><label>Sắp xếp <select class="wf-sort"><option value="default">Mặc định</option><option value="title">Tên A–Z</option><option value="due">Hạn gần nhất</option></select></label><label>Chuyển trạng thái <select class="wf-bulk-state"><option value="">Chọn trạng thái…</option></select></label><button type="button" class="btn wf-bulk-apply">Áp dụng</button><button type="button" class="btn wf-archive-selected">Lưu trữ đã chọn</button><span class="wf-selected-count" aria-live="polite"></span>';
  panel.before(tools);
  const rows=[...table.querySelectorAll("tbody tr[data-task]")], key=tools.querySelector(".wf-keyword");
  const find=row=>project(row.dataset.pid)?.tasks.find(t=>t.id===row.dataset.task);
  [...new Set(rows.flatMap(row=>(find(row)?.labels||[]).map(label=>label.name)))].sort((a,b)=>a.localeCompare(b,'vi')).forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;key.append(option);});
  const update=()=>{const value=key.value,q=searchLabel.querySelector('input').value.trim().toLocaleLowerCase('vi');for(const row of rows){const t=find(row);row.hidden=!!value&&!(t?.labels||[]).some(label=>label.name===value)||!!q&&![t?.title,t?.description,t?.tag,project(row.dataset.pid)?.name,...(t?.labels||[]).map(l=>l.name)].join(' ').toLocaleLowerCase('vi').includes(q);}tools.querySelector('.wf-selected-count').textContent=wfSelectedTasks.size+' đã chọn';};
  key.onchange=()=>{_WF.listKeyword=key.value;update();};
 const searchLabel=document.createElement('label');searchLabel.className='wf-filter-field';searchLabel.innerHTML='<span>Tìm trong kết quả</span><input type="search" aria-label="Tìm trong kết quả" placeholder="Tên việc, dự án, từ khóa…">';
 searchLabel.querySelector('input').value=_WF.listSearch||'';searchLabel.querySelector('input').oninput=e=>{_WF.listSearch=e.target.value;update();};key.value=_WF.listKeyword||'';
 
  tools.querySelector('.wf-sort').onchange=e=>{const mode=e.target.value;_WF.listSort=mode;const sorted=[...rows].sort((a,b)=>mode==='title'?(find(a)?.title||'').localeCompare(find(b)?.title||'','vi'):mode==='due'?(find(a)?.due||'9999').localeCompare(find(b)?.due||'9999'):rows.indexOf(a)-rows.indexOf(b));sorted.forEach(row=>table.tBodies[0].append(row));};
  rows.forEach(row=>{const input=document.createElement('input');input.type='checkbox';input.checked=wfSelectedTasks.has(row.dataset.task);input.setAttribute('aria-label','Chọn '+(find(row)?.title||'công việc'));input.onclick=e=>e.stopPropagation();input.onchange=()=>{input.checked?wfSelectedTasks.add(row.dataset.task):wfSelectedTasks.delete(row.dataset.task);update();};row.cells[0].prepend(input);});
  const bulkState=tools.querySelector('.wf-bulk-state');[...new Set(data.projects.flatMap(p=>p.columns))].forEach(col=>{const option=document.createElement('option');option.value=col;option.textContent=col;bulkState.append(option);});
  tools.querySelector('.wf-bulk-apply').onclick=()=>{const col=bulkState.value;if(!col||!wfSelectedTasks.size)return;const selected=data.projects.flatMap(p=>p.tasks.filter(t=>wfSelectedTasks.has(t.id)).map(t=>({p,t})));if(selected.some(({p})=>!p.columns.includes(col)))return notify('Một dự án không có trạng thái này. Hãy chọn lại các công việc phù hợp.');if(wfSave(()=>selected.forEach(({t})=>{t.col=col;if(col==='Done')t.checks.forEach(c=>c.done=true);else if(t.checks.length&&t.checks.every(c=>c.done))t.checks.at(-1).done=false;}))){wfSelectedTasks.clear();render();notify('Đã chuyển trạng thái các công việc đã chọn.');}};
  tools.querySelector('.wf-archive-selected').onclick=()=>{if(!wfSelectedTasks.size)return;const count=wfSelectedTasks.size;if(!confirm('Lưu trữ '+count+' công việc đã chọn?'))return;if(wfSave(()=>{data.projects.forEach(p=>p.tasks.forEach(t=>{if(wfSelectedTasks.has(t.id))t.archived=true;}));})){wfSelectedTasks.clear();render();notify('Đã lưu trữ các công việc đã chọn.');}};
  const filters=document.createElement("details");filters.className="wf-filter-panel";filters.open=!!_WF.filtersOpen;const summary=document.createElement("summary");summary.textContent="☷ Bộ lọc & sắp xếp";filters.append(summary);const filterBody=document.createElement("div");filterBody.className="wf-filter-body";filters.append(filterBody);
  const original=$("#main .filter-row");if(original)filterBody.append(original);
  filterBody.append(key.closest('label'),tools.querySelector('.wf-sort').closest('label'),searchLabel);wfFilterChoices(filterBody);tools.before(filters);filters.ontoggle=()=>{if(filters.isConnected)_WF.filtersOpen=filters.open;};
  tools.classList.add('wf-bulk-tools');
  const visibility=()=>{tools.classList.toggle('has-selection',wfSelectedTasks.size>0);tools.querySelector('.wf-bulk-apply').disabled=!bulkState.value||!wfSelectedTasks.size;tools.querySelector('.wf-archive-selected').disabled=!wfSelectedTasks.size;};tools.addEventListener('change',visibility);tools.addEventListener('click',()=>queueMicrotask(visibility));table.addEventListener('change',visibility);visibility();
  const sort=filters.querySelector('.wf-sort');sort.value=_WF.listSort||'default';sort.onchange({target:sort});
  const reset=document.createElement('button');reset.type='button';reset.className='btn wf-clear-filters';reset.textContent='Xóa bộ lọc';reset.onclick=()=>{filterProject='';filterPriority='';filterStatus='';query='';$('#search').value='';_WF.listKeyword='';_WF.listSearch='';_WF.listSort='default';filters.open=false;_WF.filtersOpen=false;render();};filterBody.append(reset);
  update();
}
const wfRenderBefore = render;
render = function () {
  // Capture native details state before replacing the DOM; toggle events are queued.
  const filterPanel=document.querySelector('#main .wf-filter-panel');
  if(filterPanel)_WF.filtersOpen=filterPanel.open;
  if(currentUser && _WF.navOwner!==currentUser.id){_WF.navOwner=currentUser.id;view='dashboard';active=null;}
  wfRenderBefore();
  document.querySelector('#tabs')?.classList.toggle('has-current-project',!!active&&['projects','timeline','calendar','gantt'].includes(view));
  const currentTab=document.querySelector('#tabs .tab.active .tab-initial');if(currentTab&&project()){const name=document.createElement('span');name.className='zen-active-tab-name';name.textContent=project().name;currentTab.replaceWith(name);}
  if (view === "notes") wfApplyCards();
  wfLabels();
  if (view === "tasks") wfTaskListTools();
  wfPaintFocus();
  wfWorkspaceUsability();
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
  (e) => {
    const move = _WF.pointer;
    _WF.pointer = null;
    wfDragClear();
    const target = move?.target ||
      (move?.moved && wfDropTarget(move.kind, document.elementFromPoint(e.clientX, e.clientY)));
    if (move?.moved && target)
      wfMove(move.kind, move.id, move.pid, target, move.target ? move.after : e.clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2);
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
markNoticesRead = async function () {
  await saveReadReceipts(["release:"+latestVersion,...wfRawNotices().map(noticeReceipt),...dueNoteReminders().map(n=>"notice:note-"+encodeURIComponent(noteReminderKey(n)))]);
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
            columnDisplayName(p,col.dataset.column);
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
      const heading=$("#main .board-head,#main .page-heading"), toolbar=heading?.querySelector(".board-tools,.heading-actions,.project-actions");
      if(toolbar)toolbar.insertBefore(detail,toolbar.querySelector('[data-action="new-task"]'));else heading?.append(detail);
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
        columnDisplayName(p,key),
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
            columnDisplayName(p,c).toLocaleLowerCase("vi") ===
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

const wfGoBefore=go;go=function(v,id=null){wfGoBefore(v,id);};

const wfProjectFormBefore=projectForm;
projectForm=function(p){wfProjectFormBefore(p);wfRichEditor($('#editor-body [name=description]'));};
const wfProjectBoardBefore=board;
board=function(){const p=project();let html=wfProjectBoardBefore();if(p?.description)html=html.replace('<p class="subtext">'+esc(p.description)+'</p>','<div class="subtext wf-project-description">'+zenFormattedHTML(p.description)+'</div>');return html;};
function wfFocusTasks(){return allTasks().filter(t=>!t.archived&&t.col!=='Done'&&!t.project.archived);}
function wfFocusCard(t){const late=t.due&&t.due<today(),pct=taskPct(t);return '<button type="button" class="wf-focus-card" data-wf-focus="'+esc(t.id)+'" data-pid="'+esc(t.project.id)+'"><small>'+esc(t.project.name)+'</small><strong>'+esc(t.title)+'</strong><span class="focus-card-meta '+(late?'is-overdue':'')+'">'+(late?'Quá hạn · ':t.due?'Hạn ':'')+(t.due?esc(dateLabel(t.due)):'Chưa đặt hạn')+'</span><span class="focus-card-priority">'+esc(PRIORITIES[t.priority]||'Chưa phân loại')+'</span><span class="focus-card-footer"><span>'+pct+'% hoàn thành</span><span class="focus-card-action">Tập trung →</span></span>'+bar(pct,t.project.color)+'</button>';}

function wfPaintFocus(){
 iconPaths.focus=iconPaths.natureFocus;const anchor=document.querySelector('.sidebar [data-view="tasks"]');if(anchor&&!document.querySelector('[data-view="focus"]')){const button=document.createElement('button');button.type='button';button.className='nav';button.dataset.view='focus';button.innerHTML='<span>'+svgIcon('natureFocus')+'</span>Chế độ tập trung';anchor.after(button);}
 const selected=_WF.focus,projectData=selected&&project(selected.p),task=projectData?.tasks.find(t=>t.id===selected.t&&!t.archived);
 const focused=view==='focus'&&!!task;document.body.classList.toggle('wf-is-focused',focused);
 if(view!=='focus')return;
 $('#crumb').textContent='Chế độ tập trung';document.querySelector('[data-view="focus"]')?.classList.add('active');
 if(!task){_WF.focus=null;const tasks=wfFocusTasks(),day=today(),overdue=tasks.filter(t=>t.due&&t.due<day),due=tasks.filter(t=>t.due===day),rank={q1:0,q2:1,q3:2,q4:3};const suggested=[...tasks].sort((a,b)=>(rank[a.priority]??4)-(rank[b.priority]??4)||(a.due||'9999').localeCompare(b.due||'9999')).slice(0,3);$('#main').innerHTML=heading('MỘT VIỆC MỖI LÚC','Chọn điều cần tập trung','Gợi ý theo mức độ quan trọng và hạn công việc. Bạn chủ động chọn việc phù hợp.')+[ ['Gợi ý 3 việc quan trọng',suggested],['Đến hạn hôm nay',due],['Quá hạn',overdue] ].map(([title,list])=>'<section class="wf-focus-group"><h2>'+title+' <small>'+list.length+'</small></h2><div class="wf-focus-grid">'+(list.map(wfFocusCard).join('')||'<p class="subtext">Không có công việc trong nhóm này.</p>')+'</div></section>').join('');return;}
 const ids=[...new Set([...(projectData.noteIds||[]),...(task.noteIds||[])])],notes=ids.map(id=>data.notes?.find(n=>n.id===id)).filter(Boolean);
 $('#main').innerHTML='<div class="wf-focus-header"><div><small>DỰ ÁN ĐANG LÀM</small><h2>'+esc(projectData.name)+'</h2></div><button type="button" class="btn wf-focus-exit" data-wf-focus-exit aria-label="Thoát chế độ tập trung">← <span>Thoát tập trung</span></button></div><div class="wf-focus-workspace"><article class="panel"><h1>'+esc(task.title)+'</h1><p class="subtext">'+esc(task.col)+(task.due?' · Hạn '+dateLabel(task.due):'')+'</p><div>'+zenFormattedHTML(task.description||'')+'</div><div class="wf-focus-progress-meta"><span>'+task.checks.filter(c=>c.done).length+'/'+task.checks.length+' mục hoàn thành</span><strong>'+taskPct(task)+'%</strong></div>'+bar(taskPct(task),projectData.color)+'<h3>Checklist</h3>'+task.checks.map(c=>'<label class="check-row"><input type="checkbox" data-card-check="'+esc(c.id)+'" data-check-task="'+esc(task.id)+'" data-check-project="'+esc(projectData.id)+'" '+(c.done?'checked':'')+'><span>'+esc(c.text)+'</span></label>').join('')+'<button type="button" class="btn" data-task="'+esc(task.id)+'" data-pid="'+esc(projectData.id)+'">Chỉnh sửa công việc</button></article><aside class="panel"><h2>Ghi chú</h2>'+notes.map(n=>'<article class="wf-focus-note"><h3>'+esc(n.title)+'</h3><div>'+zenFormattedHTML(n.text||'')+'</div><button type="button" class="btn" data-wf-document="'+esc(n.id)+'">Mở ghi chú</button><button type="button" class="btn danger" data-focus-unlink="'+esc(n.id)+'">'+((projectData.noteIds||[]).includes(n.id)?'Bỏ liên kết dự án':'Bỏ liên kết task')+'</button></article>').join('')+(!notes.length?'<p class="subtext">Chưa có ghi chú liên kết. Bạn có thể tạo ghi chú và liên kết với công việc này.</p>':'')+'<div class="wf-focus-note-actions"><button type="button" class="btn primary" data-wf-focus-note>+ Viết ghi chú</button><details class="wf-focus-note-picker"><summary>Liên kết ghi chú có sẵn</summary><div><label>Tìm ghi chú<input type="search" data-wf-focus-search placeholder="Nhập tên ghi chú…"></label><div class="wf-focus-note-options">'+(data.notes||[]).filter(n=>!ids.includes(n.id)).map(n=>'<button type="button" data-wf-focus-link="'+esc(n.id)+'">'+esc(n.title||'Ghi chú không tên')+'</button>').join('')+'</div></div></details></div></aside></div>';
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-wf-focus],[data-wf-focus-exit],[data-wf-document],[data-wf-focus-note],[data-wf-focus-link]');if(!target)return;
 if(target.hasAttribute('data-wf-focus-exit')){_WF.focus=null;render();return;}
 if(target.dataset.wfFocus){_WF.focus={p:target.dataset.pid,t:target.dataset.wfFocus};view='focus';render();window.scrollTo(0,0);return;}
 if(target.dataset.wfDocument){const n=data.notes?.find(n=>n.id===target.dataset.wfDocument);if(n)noteForm(n);return;}
 if(target.dataset.wfFocusLink){const current=_WF.focus,p=current&&project(current.p),t=p?.tasks.find(x=>x.id===current.t),id=target.dataset.wfFocusLink;if(!t||!data.notes?.some(n=>n.id===id))return;if(wfSave(()=>{t.noteIds||=[];if(t.noteIds.length>=100)throw Error('Tối đa 100 ghi chú liên kết.');if(!t.noteIds.includes(id))t.noteIds.push(id);})){render();notify('Đã liên kết ghi chú với công việc.');}return;}
 if(target.hasAttribute('data-wf-focus-note'))noteForm();
});
wfPaintFocus();

function wfFilterChoices(root){
 const names=['Dự án','Mức độ','Trạng thái','Từ khóa','Sắp xếp'];
 root.querySelectorAll('select').forEach((select,index)=>{
  if(select.id==='filter-priority'&&select.options[0]?.value==='')select.options[0].textContent='Tất cả mức độ';
  let label=select.closest('label');if(!label){label=document.createElement('label');select.before(label);label.append(select);}
  label.classList.add('wf-filter-field');const name=names[index]||select.getAttribute('aria-label')||'Lựa chọn';
  [...label.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());const title=document.createElement('span');title.textContent=name;label.prepend(title);select.setAttribute('aria-label',name);
 });
}
const wfSettingsBefore=accountPanel;
accountPanel=function(){wfSettingsBefore();const body=$('#editor-body');if(!body?.querySelector('.profile-card'))return;body.classList.add('wf-settings');const profile=body.querySelector('.profile-card');const groups=[];
 const wrap=(title,nodes)=>{const d=document.createElement('details');d.className='wf-settings-group';const summary=document.createElement('summary');summary.textContent=title;d.append(summary);const content=document.createElement('div');content.className='wf-settings-content';nodes.forEach(n=>content.append(n));d.append(content);groups.push(d);return d;};
 const profileGroup=wrap('Hồ sơ',[profile]);profileGroup.open=true;
 body.querySelectorAll('.help-actions').forEach(row=>{if(row.querySelector('h3.settings-section')){while(row.firstChild)row.before(row.firstChild);row.remove();}});
 const headings=[...body.querySelectorAll(':scope > h3.settings-section')];headings.forEach(h=>{const nodes=[];let n=h.nextSibling;while(n&&!(n.nodeType===1&&(n.matches('h3.settings-section,.settings-signout')))){const next=n.nextSibling;nodes.push(n);n=next;}const title=h.textContent.includes('Thông báo')?'Thông báo':h.textContent.includes('Tổng kết tuần')?'Tổng kết tuần':h.textContent.includes('Dữ liệu')?'Dữ liệu & đồng bộ':'Tài khoản & bảo mật';h.remove();wrap(title,nodes);});
 const sessions=body.querySelector('.settings-signout');if(sessions)wrap('Phiên đăng nhập',[sessions]);
 const other=[...body.children].filter(n=>n.tagName!=='H2');if(other.length)wrap('Các tính năng khác',other);
 const help=document.createElement('button');help.type='button';help.className='btn';help.dataset.action='help';help.textContent='Hướng dẫn sử dụng';wrap('Hướng dẫn',[help]);
 const helpGroup=groups.pop();const sessionIndex=groups.findIndex(g=>g.querySelector('summary')?.textContent==='Phiên đăng nhập');groups.splice(sessionIndex<0?groups.length:sessionIndex,0,helpGroup);
 groups.forEach(group=>body.append(group));
 $('#editor').addEventListener('close',()=>body.classList.remove('wf-settings'),{once:true});
};

document.addEventListener('input',e=>{if(!e.target.matches('[data-wf-focus-search]'))return;const q=e.target.value.trim().toLocaleLowerCase('vi');e.target.closest('.wf-focus-note-picker').querySelectorAll('[data-wf-focus-link]').forEach(b=>b.hidden=!b.textContent.toLocaleLowerCase('vi').includes(q));});


// Project keyword colors use the same hue/saturation model as project colors.
function wfKeywordWheels(root){
 root.querySelectorAll('.keyword-row input[type=color]:not([data-wheel])').forEach(input=>{
  input.dataset.wheel='true';input.hidden=true;
  const picker=document.createElement('details');picker.className='wf-keyword-color';
  picker.innerHTML='<summary aria-label="Chọn màu từ khóa"><i></i></summary><div><canvas width="180" height="180" tabindex="0" role="slider" aria-label="Màu từ khóa: trái phải đổi sắc, lên xuống đổi bão hòa" aria-valuemin="0" aria-valuemax="360"></canvas><label>Độ sáng<input type="range" min="1" max="100"></label><label>HEX<input type="text" pattern="#[a-fA-F0-9]{6}" maxlength="7"></label></div>';
  input.after(picker);const canvas=picker.querySelector('canvas'),ctx=canvas.getContext('2d'),range=picker.querySelector('input[type=range]'),hex=picker.querySelector('input[type=text]');let hsv=colorToHSV(input.value);
  const paint=()=>{const img=ctx.createImageData(180,180);for(let y=0;y<180;y++)for(let x=0;x<180;x++){const dx=x-90,dy=y-90,r=Math.hypot(dx,dy)/89;if(r>1)continue;const rgb=hsvToColor((Math.atan2(dy,dx)*180/Math.PI+360)%360,r,hsv.v).rgb,i=(y*180+x)*4;img.data.set([...rgb,255],i);}ctx.putImageData(img,0,0);const angle=hsv.h*Math.PI/180;ctx.beginPath();ctx.arc(90+Math.cos(angle)*hsv.s*89,90+Math.sin(angle)*hsv.s*89,5,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();};
  const update=()=>{input.value=hsvToColor(hsv.h,hsv.s,hsv.v).hex;hex.value=input.value;range.value=hsv.v*100;picker.querySelector('i').style.background=input.value;canvas.setAttribute('aria-valuenow',Math.round(hsv.h));paint();input.dispatchEvent(new Event('input',{bubbles:true}));};
  const point=e=>{const r=canvas.getBoundingClientRect(),dx=(e.clientX-r.left)*180/r.width-90,dy=(e.clientY-r.top)*180/r.height-90;hsv.h=(Math.atan2(dy,dx)*180/Math.PI+360)%360;hsv.s=Math.min(1,Math.hypot(dx,dy)/89);update();};
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);point(e);};canvas.onpointermove=e=>{if(e.buttons)point(e);};canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();hsv.h=(hsv.h+(e.key==='ArrowRight'?5:e.key==='ArrowLeft'?-5:0)+360)%360;hsv.s=Math.max(0,Math.min(1,hsv.s+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0)));update();};range.oninput=()=>{hsv.v=range.value/100;update();};hex.onchange=()=>{if(/^#[a-f0-9]{6}$/i.test(hex.value)){hsv=colorToHSV(hex.value);update();}};update();
 });
}
const wfProjectRefineBefore=projectForm;
projectForm=function(p){wfProjectRefineBefore(p);const form=$('#editor-form'),rows=form.querySelector('#keyword-rows');if(!rows)return;const del=form.querySelector('[data-action=delete-project]');if(del){del.classList.add('zen-project-delete');rows.closest('.keyword-editor')?.after(del);}wfKeywordWheels(rows);const observer=new MutationObserver(()=>wfKeywordWheels(rows));observer.observe(rows,{childList:true});$('#editor').addEventListener('close',()=>observer.disconnect(),{once:true});form.addEventListener('submit',e=>{if(rows.children.length>5){e.preventDefault();e.stopImmediatePropagation();notify('Tối đa 5 từ khóa dự án. Hãy bỏ các từ khóa không cần thiết.');}},{capture:true});};

// Group task editing without changing the existing save handlers.
const zenTaskDetailBefore=taskDetail;
function zenArrangeTaskForm(isNew=false){const body=$('#editor-body'),form=$('#editor-form');
 body.querySelectorAll('.task-detail-header').forEach(h=>h.classList.add('calm-task-header'));const heading=body.querySelector('.wf-task-heading');if(heading)heading.textContent=isNew?'Công việc mới':'Chi tiết công việc';
 const section=(key,title)=>{const s=document.createElement('section');s.className='zen-task-section';const h=document.createElement('h3');h.textContent=title;s.append(h);return s;};
 const main=section('main','Nội dung chính'),schedule=section('schedule','Lịch & thời hạn'),actions=section('actions','Trạng thái & tài liệu'),checks=section('checks','Checklist');
 const title=form.querySelector('[name=title]')?.closest('.field'),description=body.querySelector('.wf-description-field');if(title)main.append(title);if(description)main.append(description);
 for(const selector of ['.form-intro','.priority-choices','[name=priority]','.keyword-choices','[name=tag]']){const el=body.querySelector(selector);if(el)main.append(el.closest('.field')||el);}
 body.querySelectorAll(':scope>.help-copy').forEach(el=>{if(el.textContent.includes('Lịch theo giờ')||el.textContent.includes('Chỉnh trực tiếp'))el.remove();});
 for(const name of ['start','end']){const label=form.querySelector('[name='+name+']')?.closest('.field');if(label)schedule.append(label);}
 const info=document.createElement('p');info.className='help-copy';info.textContent='Ngày kết thúc đồng thời là hạn hoàn thành. Giờ Việt Nam.';schedule.append(info);
 const controls=body.querySelector('.detail-actions'),tools=body.querySelector('.wf-task-tools');const col=form.querySelector('[name=col]')?.closest('.field');if(col){if(!isNew&&controls?.querySelector('.wf-state-choices'))col.classList.add('zen-state-select-secondary');actions.append(col);}if(controls)actions.append(controls);if(tools)actions.append(tools);
 const liveProgress=body.querySelector('.task-live-progress');if(liveProgress)checks.append(liveProgress);
 const oldHeading=[...body.querySelectorAll(':scope>h3')].find(h=>h.textContent==='Checklist');if(oldHeading)oldHeading.remove();const list=body.querySelector('.wf-check-sort-list');if(list)checks.append(list);const extra=form.querySelector('[name=extra-checks],[name=checks]')?.closest('.field');if(extra)checks.append(extra);
 const anchor=heading||body.firstChild;if(anchor){anchor.after(main);main.after(schedule);schedule.after(actions);actions.after(checks);}else body.prepend(main,schedule,actions,checks);
 body.querySelectorAll('.fields-row').forEach(row=>{if(!row.children.length)row.remove();});
 body.querySelectorAll(':scope>.help-copy').forEach(el=>{if(/Chọn ngày bắt đầu|Ngày kết thúc/.test(el.textContent))schedule.append(el);});
 if(!isNew){const remove=body.querySelector('[data-action="delete-task"]')||document.createElement('button');remove.type='button';remove.className='btn danger';remove.dataset.action='delete-task';remove.textContent='Xóa công việc';const area=document.createElement('section');area.className='zen-task-delete';area.append(remove);checks.after(area);}
 const status=document.createElement('p');status.className='zen-task-save-status';status.setAttribute('role','status');status.textContent=isNew?'Công việc mới chưa được lưu.':'Đã tải bản đã lưu. Chỉnh sửa rồi chọn Lưu.';body.prepend(status);form.addEventListener('input',()=>{status.dataset.dirty='true';status.textContent='Có thay đổi chưa lưu · Chọn Lưu để xác nhận.';},{signal:zenTaskSignal()});
};
taskDetail=function(p,t){zenTaskDetailBefore(p,t);zenArrangeTaskForm();};
const zenTaskFormBefore=taskForm;taskForm=function(p,t,col='List'){
 zenTaskFormBefore(p,t,col);
 if(!t&&$('#editor-body [name=title]'))zenArrangeTaskForm(true);
 const host=$('#editor-body .wf-description-field');if(!host||typeof NOTE_MOTIFS==='undefined')return;
 const selected=Object.hasOwn(NOTE_MOTIFS,t?.motif)?t.motif:'none',picker=document.createElement('details');picker.className='note-motif-picker task-motif-picker';
 picker.innerHTML='<summary><span>✦ Họa tiết công việc</span><span class="note-motif-current"></span></summary><p>Chọn họa tiết nhẹ nhàng cho thẻ công việc.</p><div class="note-motif-options" role="group" aria-label="Chọn họa tiết cho công việc">'+Object.entries(NOTE_MOTIFS).map(([id,item])=>'<button type="button" class="note-motif-option" data-task-motif="'+id+'" aria-pressed="'+(id===selected)+'" title="'+item.label+'"><span aria-hidden="true">'+item.icon+'</span><small>'+item.label+'</small></button>').join('')+'</div><input type="hidden" name="motif" value="'+selected+'">';
 host.append(picker);const input=picker.querySelector('[name=motif]'),current=picker.querySelector('.note-motif-current');
 const paint=()=>{current.textContent=NOTE_MOTIFS[input.value].icon+' '+NOTE_MOTIFS[input.value].label;zenArt(picker,input.value);};
 picker.querySelectorAll('[data-task-motif]').forEach(button=>{const svg=zenPattern(button.dataset.taskMotif),thumb=button.querySelector('span');if(svg&&button.dataset.taskMotif!=='none'){thumb.classList.add('zen-motif-thumb');thumb.style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';thumb.textContent='';}button.onclick=()=>{input.value=button.dataset.taskMotif;picker.querySelectorAll('[data-task-motif]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));paint();};});paint();
};
const zenTaskCardBeforeMotif=taskCard;taskCard=function(t,p){const template=document.createElement('template');template.innerHTML=zenTaskCardBeforeMotif(t,p).trim();const card=template.content.firstElementChild;if(card&&t.motif&&typeof zenArt==='function')zenArt(card,t.motif);return template.innerHTML;};
function zenTaskSignal(){const c=new AbortController();$('#editor').addEventListener('close',()=>c.abort(),{once:true});return c.signal;}
const zenProjectFormBefore=projectForm;
projectForm=function(p){zenProjectFormBefore(p);$('#editor')?.classList.add('project-edit-dialog');if(!p)return;const appearance=$('#editor-body .project-appearance');if(!appearance)return;const section=document.createElement('section');section.className='zen-project-links';appearance.after(section);
 const paint=()=>{section.replaceChildren();const h=document.createElement('h3');h.textContent='Ghi chú liên kết';section.append(h);const notes=(p.noteIds||[]).map(id=>data.notes?.find(n=>n.id===id)).filter(Boolean);if(!notes.length){const empty=document.createElement('p');empty.className='subtext';empty.textContent='Chưa có ghi chú liên kết. Chọn ghi chú có sẵn ở bên dưới để thêm vào dự án.';section.append(empty);}
 notes.forEach(n=>{const row=document.createElement('div');row.className='zen-project-note';const open=document.createElement('button');open.type='button';open.className='zen-project-note-open';open.innerHTML=svgIcon('attach')+'<span>'+esc(n.title||'Ghi chú không tên')+'</span>';open.onclick=()=>{const preview=document.createElement('div');preview.className='zen-project-note-preview';preview.innerHTML=zenFormattedHTML(n.text||'');const old=row.querySelector('.zen-project-note-preview');if(old)old.remove();else row.append(preview);};const remove=document.createElement('button');remove.type='button';remove.className='zen-unlink-note';remove.textContent='×';remove.setAttribute('aria-label','Bỏ liên kết '+n.title);remove.title='Bỏ liên kết; giữ nguyên ghi chú';remove.onclick=()=>{if(wfSave(()=>{p.noteIds=p.noteIds.filter(id=>id!==n.id);})){paint();refreshNoteOptions();notify('Đã bỏ liên kết. Ghi chú vẫn được giữ.');}};row.append(open,remove);section.append(row);});};paint();const add=document.createElement('details');add.className='project-note-picker';add.innerHTML='<summary>Liên kết ghi chú có sẵn</summary>';const search=document.createElement('input');search.type='search';search.placeholder='Tìm ghi chú theo tiêu đề…';search.setAttribute('aria-label','Tìm ghi chú để liên kết');add.append(search);const list=document.createElement('div');list.className='project-note-options';const empty=document.createElement('p');empty.className='project-note-empty';empty.setAttribute('role','status');add.append(empty);function refreshNoteOptions(){list.replaceChildren();const query=search.value.trim().toLocaleLowerCase('vi');const notes=(data.notes||[]).filter(n=>(n.title||'Ghi chú không tên').toLocaleLowerCase('vi').includes(query));empty.textContent=notes.length?notes.length+' ghi chú · Chọn để liên kết':query?'Không tìm thấy ghi chú phù hợp.':'Bạn chưa có ghi chú. Hãy tạo ghi chú trước khi liên kết.';for(const n of notes){const linked=(p.noteIds||[]).includes(n.id),b=document.createElement('button');b.type='button';b.className='btn project-note-option';b.disabled=linked;b.innerHTML='<span class="project-note-option-icon" aria-hidden="true">'+(linked?'✓':'＋')+'</span><span>'+esc(n.title||'Ghi chú không tên')+'</span><small>'+(linked?'Đã liên kết':'Liên kết')+'</small>';b.onclick=()=>{if(wfSave(()=>{p.noteIds||=[];if(!p.noteIds.includes(n.id))p.noteIds.push(n.id);})){paint();refreshNoteOptions();search.focus({preventScroll:true});notify('Đã liên kết ghi chú.');}};list.append(b);}}search.oninput=refreshNoteOptions;refreshNoteOptions();add.append(list);section.after(add);};
scheduleEvents=function(){return dueTasks().filter(t=>t.col!=='Done').flatMap(t=>{const events=[{...t,eventKind:t.start||t.end?'task':'deadline',eventStart:t.start||t.end||t.due,eventEnd:t.end||t.start||t.due}];for(const c of t.checks||[])if(c.start||c.end)events.push({...t,eventKind:'check',title:t.title+' / '+c.text,eventStart:c.start||c.end,eventEnd:c.end||c.start});return events;});};
function zenDateDetails(t){const fmt=v=>esc(v?v.replace('T',' · '):'Chưa đặt');return '<dl class="zen-date-details"><div><dt>Bắt đầu</dt><dd>'+fmt(t.start)+'</dd></div><div><dt>Kết thúc</dt><dd>'+fmt(t.end||t.due)+'</dd></div></dl>'; }
function zenIsCompletedTask(t){return String(t.col||'').toLowerCase()==='done'||t.done===true||t.completed===true;}
function zenUnscheduled(){const tasks=dueTasks().filter(t=>!zenIsCompletedTask(t)&&!t.start&&!t.end&&!t.due);return '<section class="panel zen-unscheduled"><h2>Chưa lên lịch <small>'+tasks.length+'</small></h2>'+(tasks.map(t=>timelineTask(t)).join('')||'<p class="subtext">Mọi công việc đã có lịch hoặc hạn.</p>')+'</section>';}
const zenCalendarBefore=workCalendar;
workCalendar=function(){return zenCalendarBefore().replace('<p class="help-copy">Ngày kết thúc là hạn hoàn thành. Công việc chưa đặt ngày nằm trong Timeline.</p>','<p class="help-copy">Khoảng thực hiện từ ngày bắt đầu đến ngày kết thúc; ngày kết thúc cũng là hạn hoàn thành. Công việc chưa đặt lịch nằm trong Timeline.</p>')+zenUnscheduled();};
workTimeline=function(){const tasks=dueTasks().filter(t=>t.start||t.end||t.due).sort((a,b)=>(a.start||a.end||a.due).localeCompare(b.start||b.end||b.due));return heading('LỊCH CÔNG VIỆC','Timeline','Bắt đầu và kết thúc · giờ Việt Nam','<button type="button" class="btn" data-zen-timeline-today>Hôm nay</button>')+(active&&project()?projectSummary(project()):'')+'<section class="panel zen-timeline">'+tasks.map(t=>'<article class="timeline-item" data-zen-day="'+esc((t.start||t.end||t.due).slice(0,10))+'">'+timelineTask(t).replace('</button>',zenDateDetails(t)+'</button>')+'</article>').join('')+'</section>'+zenUnscheduled();};
document.addEventListener('click',e=>{if(e.target.closest('[data-zen-timeline-today]')){const items=[...document.querySelectorAll('[data-zen-day]')];const target=items.find(x=>x.dataset.zenDay>=today())||items.at(-1);target?.scrollIntoView({behavior:'smooth',block:'center'});target?.classList.add('zen-today-focus');}});

// Shared view refinements run within the existing render lifecycle.
function wfWorkspaceUsability(){
 if(view==='dashboard'&&!document.querySelector('.wf-today-plan')){
  const section=document.createElement('section');section.className='wf-today-plan';section.setAttribute('aria-label','Việc cần ưu tiên');
  const stats=document.querySelector('#main .stats');if(stats)stats.before(section);else document.querySelector('#main').append(section);
 }
 const bulk=document.querySelector('.wf-bulk-tools');if(bulk&&!bulk.querySelector('.wf-bulk-title')){const title=document.createElement('strong');title.className='wf-bulk-title';title.textContent='Thao tác với mục đã chọn';bulk.prepend(title);}
 const filters=document.querySelector('.wf-filter-panel');if(filters&&!filters.querySelector('.wf-filter-hint')){const hint=document.createElement('p');hint.className='subtext wf-filter-hint';hint.textContent='Lọc để tìm công việc. Chọn các mục trong kết quả để thao tác hàng loạt.';filters.querySelector('.wf-filter-body')?.prepend(hint);}
}

document.addEventListener('click',e=>{const unlink=e.target.closest('[data-focus-unlink]');if(unlink){const f=_WF.focus,p=f&&project(f.p),t=p?.tasks.find(t=>t.id===f.t),id=unlink.dataset.focusUnlink;if(!p||!t)return;if(wfSave(()=>{t.noteIds=(t.noteIds||[]).filter(x=>x!==id);p.noteIds=(p.noteIds||[]).filter(x=>x!==id);})){render();notify('Đã bỏ liên kết; ghi chú vẫn được giữ.');}return;}if(e.target.closest('[data-project-note-add]')){const p=project();if(p)projectForm(p);}});

const wfNoteRemindersBeforeReceipts=dueNoteReminders;
dueNoteReminders=function(){return wfNoteRemindersBeforeReceipts().filter(n=>!(readReceiptOwner===currentUser?.id&&readReceiptKeys.has('notice:note-'+encodeURIComponent(noteReminderKey(n)))));};

const uxProjectForm=projectForm;
projectForm=function(p){uxProjectForm(p);const body=$('#editor-body'),appearance=body.querySelector('.project-appearance');if(!appearance)return;const dates=document.createElement('section');dates.className='project-dates fields-row';dates.innerHTML=field('Bắt đầu','project-start',p?.start||'','date')+field('Kết thúc','project-end',p?.end||'','date');appearance.before(dates);const motif=document.createElement('details');motif.className='note-motif-picker project-motif-picker';motif.innerHTML='<summary>✦ Họa tiết dự án</summary><input type="hidden" name="project-motif" value="'+esc(p?.motif||'none')+'"><div class="note-motif-options">'+Object.entries(NOTE_MOTIFS).map(([id,v])=>'<button type="button" class="note-motif-option" data-project-motif="'+id+'" aria-pressed="'+(id===(p?.motif||'none'))+'">'+v.icon+' '+v.label+'</button>').join('')+'</div>';appearance.after(motif);zenArt(motif,p?.motif||'none');motif.querySelectorAll('[data-project-motif]').forEach(b=>{if(b.dataset.projectMotif!=='none'){b.style.backgroundImage='linear-gradient(#ffffffa0,#ffffffa0),'+zenPattern(b.dataset.projectMotif);b.style.backgroundSize='cover';}});motif.querySelectorAll('button').forEach(b=>b.onclick=()=>{motif.querySelector('input').value=b.dataset.projectMotif;motif.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));zenArt(motif,b.dataset.projectMotif);});};
const uxTaskDetail=taskDetail;
taskDetail=function(p,t){uxTaskDetail(p,t);const button=document.createElement('button');button.type='button';button.className='btn task-focus-shortcut';button.title='Mở chế độ tập trung';button.dataset.tooltip=button.title;button.setAttribute('aria-label',button.title);button.innerHTML=svgIcon('leaf');button.onclick=()=>wfAfterTaskSave(()=>{$('#editor').close();_WF.focus={p:p.id,t:t.id};go('focus');});const heading=$('#editor-body .wf-task-heading');if(heading){heading.classList.add('wf-task-heading-row');heading.append(button);}else $('#editor-body .zen-task-save-status')?.after(button);};
const uxProjectCardBeforeMotif=projectCard;projectCard=function(p){const template=document.createElement('template');template.innerHTML=uxProjectCardBeforeMotif(p).trim();const card=template.content.firstElementChild;if(card&&p.motif&&typeof zenArt==='function')zenArt(card,p.motif);return template.innerHTML;};
const uxFocusPaint=wfPaintFocus;
wfPaintFocus=function(){uxFocusPaint();if(view!=='focus')return;const panel=$('#main .wf-focus-workspace>article');if(panel){panel.classList.add('wf-focus-task');const title=panel.querySelector(':scope>h1');if(title){const meta=title.nextElementSibling,head=document.createElement('header');head.className='wf-focus-task-heading';const eyebrow=document.createElement('small');eyebrow.textContent='ĐANG TẬP TRUNG';head.append(eyebrow,title);if(meta){meta.classList.add('wf-focus-task-meta');head.append(meta);}panel.prepend(head);}const description=panel.querySelector('.wf-focus-task-heading')?.nextElementSibling;if(description&&description.tagName!=='H3'&&!description.classList.contains('progress'))description.classList.add('wf-focus-task-description');panel.querySelector('.progress')?.classList.add('wf-focus-task-progress');const checklist=panel.querySelector(':scope>h3');checklist?.classList.add('wf-focus-checklist-heading');}else{const heading=$('#main .page-heading');if(heading&&!heading.querySelector('.focus-check-updates')){const button=document.createElement('button');button.type='button';button.className='btn focus-check-updates';button.title='Kiểm tra dữ liệu mới';button.setAttribute('aria-label',button.title);button.innerHTML=svgIcon('sync');button.onclick=async()=>{button.disabled=true;try{if(dirty)await flushCloud();await pollCloud();notify(dirty?'Đang chờ đồng bộ thay đổi trên máy.':'Đã kiểm tra dữ liệu mới.');}finally{button.disabled=false;}};heading.append(button);}}};
setInterval(()=>{if(view==='focus'&&!document.hidden)pollCloud();},5000);

const uxProjectRender=render;render=function(){uxProjectRender();zenArt(document.querySelector('#main'),view==='projects'?(project()?.motif||'none'):'none');};
