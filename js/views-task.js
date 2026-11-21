/* ============================================================
   NordFlow Tasks — страница задачи и форма задачи
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  NF.views = NF.views || {};

  var MAX_FILE = 300 * 1024; // 300 КБ на вложение (ограничение localStorage)

  /* ================= Форма задачи (создание / редактирование) ================= */

  NF.views.task = NF.views.task || {};
  NF.views.task.openForm = function (opts) {
    opts = opts || {};
    var user = S.currentUser();
    var isEdit = !!opts.taskId;
    var t = isEdit ? S.taskById(opts.taskId) : null;
    if (isEdit && !t) return;
    if (isEdit && !S.canEditTask(user, t)) {
      UI.toast('У вас нет прав на редактирование этой задачи', 'error');
      return;
    }

    var projects = S.visibleProjects(user);
    if (isEdit) projects = [S.projectById(t.projectId)];
    if (opts.projectId) projects = projects.filter(function (p) { return p.id === opts.projectId; });
    projects = projects.filter(function (p) { return S.canCreateTask(user, p) || isEdit; });
    if (!projects.length) { UI.toast('Нет проектов, где вам доступно создание задач', 'error'); return; }
    var p0 = projects[0];

    var d = isEdit ? {
      projectId: t.projectId, title: t.title, description: t.description,
      status: t.status, priority: t.priority, assigneeId: t.assigneeId,
      reporterId: t.reporterId, deadline: t.deadline, tags: t.tags.slice(), attachments: t.attachments.slice()
    } : {
      projectId: p0.id, title: '', description: '',
      status: 'backlog', priority: 'medium', assigneeId: user.id,
      reporterId: user.id, deadline: '', tags: [], attachments: []
    };

    var localAttachments = d.attachments.slice();
    var removedAttachments = [];

    var body =
      '<div class="field"><label class="field__label">Название<span class="req">*</span></label>' +
        '<input class="input" id="tf-title" maxlength="140" value="' + U.escapeHtml(d.title) + '" placeholder="Что нужно сделать?"></div>' +
      '<div class="field"><label class="field__label">Подробное описание</label>' +
        '<textarea class="input" id="tf-desc" rows="4" placeholder="Детали, критерии готовности, ссылки">' + U.escapeHtml(d.description) + '</textarea></div>' +
      '<div class="form-grid">' +
        '<div class="field"><label class="field__label">Проект<span class="req">*</span></label>' +
          '<select class="input" id="tf-project"' + (projects.length === 1 ? '' : '') + '>' +
            projects.map(function (p) { return '<option value="' + p.id + '"' + (d.projectId === p.id ? ' selected' : '') + '>' + U.escapeHtml(p.name) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label class="field__label">Статус<span class="req">*</span></label>' +
          '<select class="input" id="tf-status">' +
            U.statusOrder.map(function (s) { return '<option value="' + s + '"' + (d.status === s ? ' selected' : '') + '>' + U.statusMeta[s].label + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label class="field__label">Исполнитель<span class="req">*</span></label>' +
          '<select class="input" id="tf-assignee"></select></div>' +
        '<div class="field"><label class="field__label">Приоритет<span class="req">*</span></label>' +
          '<select class="input" id="tf-priority">' +
            ['critical', 'high', 'medium', 'low'].map(function (pr) { return '<option value="' + pr + '"' + (d.priority === pr ? ' selected' : '') + '>' + U.priorityMeta[pr].label + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label class="field__label">Постановщик</label>' +
          '<select class="input" id="tf-reporter">' + reporterOptions(d.reporterId) + '</select></div>' +
        '<div class="field"><label class="field__label">Дедлайн</label>' +
          '<input type="date" class="input" id="tf-deadline" value="' + (d.deadline || '') + '"></div>' +
      '</div>' +
      (isEdit ? '<div class="field__hint" style="margin-bottom:10px">Дата создания: ' + U.fmtDateTime(t.createdAt) + ' · Номер ' + S.taskCode(t) + '</div>' : '') +
      '<div class="field"><label class="field__label">Теги</label><div id="tf-tags"></div></div>' +
      '<div class="field"><label class="field__label">Вложения</label>' +
        '<div id="tf-att-list"></div>' +
        '<div class="row row--wrap" style="gap:8px">' +
          '<input class="input" id="tf-link-name" placeholder="Название ссылки" style="flex:1;min-width:120px">' +
          '<input class="input" id="tf-link-url" placeholder="https://…" style="flex:1.4;min-width:160px">' +
          '<button class="btn btn--soft btn--sm" id="tf-add-link" type="button">' + U.icon('link', 15) + ' Ссылка</button>' +
          '<button class="btn btn--soft btn--sm" id="tf-add-file" type="button">' + U.icon('paperclip', 15) + ' Файл</button>' +
          '<input type="file" id="tf-file" hidden>' +
        '</div>' +
        '<div class="field__hint">Файлы до 300 КБ сохраняются в приложении (ограничение демо-версии).</div>' +
      '</div>';

    function reporterOptions(cur) {
      // постановщик: сотрудник — только сам; РП/админ — любой пользователь
      var list = (user.role === 'employee') ? [user] : S.db().users;
      return list.map(function (u) { return '<option value="' + u.id + '"' + (cur === u.id ? ' selected' : '') + '>' + U.escapeHtml(u.name) + '</option>'; }).join('');
    }

    var m = UI.modal({
      title: isEdit ? 'Редактировать задачу' : 'Новая задача',
      size: 'lg',
      body: body,
      footer: '<button class="btn btn--ghost" data-cancel>Отмена</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Сохранить' : 'Создать задачу') + '</button>'
    });

    var chip = UI.chipInput(m.el.querySelector('#tf-tags'), d.tags);

    function assigneeOptionsFor(projectId, cur) {
      var p = S.projectById(projectId);
      var members = (p ? p.memberIds : []).map(S.userById).filter(Boolean);
      return members.map(function (u) {
        return '<option value="' + u.id + '"' + (cur === u.id ? ' selected' : '') + '>' + U.escapeHtml(u.name) + ' · ' + U.escapeHtml(u.position || '') + '</option>';
      }).join('');
    }

    var projectSel = m.el.querySelector('#tf-project');
    var assigneeSel = m.el.querySelector('#tf-assignee');
    function syncAssignees() {
      var cur = assigneeSel.value || d.assigneeId;
      assigneeSel.innerHTML = assigneeOptionsFor(projectSel.value, cur);
      if (!assigneeSel.value) {
        assigneeSel.innerHTML = '<option value="">— выберите исполнителя —</option>' + assigneeOptionsFor(projectSel.value, null);
      }
    }
    syncAssignees();
    projectSel.addEventListener('change', syncAssignees);

    function renderAttachments() {
      var box = m.el.querySelector('#tf-att-list');
      box.innerHTML = localAttachments.map(function (a, i) {
        return UI.attachRow(a, true, null).replace('data-remove', 'data-remove="' + i + '"');
      }).join('');
      box.querySelectorAll('[data-remove]').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = +b.dataset.remove;
          var att = localAttachments[i];
          if (isEdit && d.attachments.indexOf(att) !== -1) removedAttachments.push(att);
          localAttachments.splice(i, 1);
          renderAttachments();
        });
      });
    }
    renderAttachments();

    m.el.querySelector('#tf-add-link').addEventListener('click', function () {
      var name = m.el.querySelector('#tf-link-name').value.trim();
      var url = m.el.querySelector('#tf-link-url').value.trim();
      if (!url) { UI.toast('Укажите адрес ссылки', 'error'); return; }
      if (!/^https?:\/\//i.test(url) && !/^www\./i.test(url)) url = 'https://' + url;
      if (!name) name = url.replace(/^https?:\/\//i, '').slice(0, 60);
      localAttachments.push({ type: 'link', name: name, url: url });
      m.el.querySelector('#tf-link-name').value = '';
      m.el.querySelector('#tf-link-url').value = '';
      renderAttachments();
    });

    var fileBtn = m.el.querySelector('#tf-add-file');
    var fileInp = m.el.querySelector('#tf-file');
    fileBtn.addEventListener('click', function () { fileInp.click(); });
    fileInp.addEventListener('change', function () {
      var f = fileInp.files[0];
      if (!f) return;
      if (f.size > MAX_FILE) { UI.toast('Файл больше 300 КБ — прикрепите ссылкой', 'error'); fileInp.value = ''; return; }
      var r = new FileReader();
      r.onload = function () {
        localAttachments.push({ type: 'file', name: f.name, data: r.result, size: f.size });
        renderAttachments();
      };
      r.readAsDataURL(f);
      fileInp.value = '';
    });

    m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
    m.el.querySelector('[data-save]').addEventListener('click', function () {
      var title = m.el.querySelector('#tf-title').value.trim();
      var projectId = projectSel.value;
      var assigneeId = assigneeSel.value;
      var status = m.el.querySelector('#tf-status').value;
      var priority = m.el.querySelector('#tf-priority').value;
      if (!title) { UI.toast('Заполните название задачи', 'error'); m.el.querySelector('#tf-title').focus(); return; }
      if (!assigneeId) { UI.toast('Назначьте исполнителя задачи', 'error'); assigneeSel.focus(); return; }

      var data = {
        title: title,
        description: m.el.querySelector('#tf-desc').value,
        projectId: projectId,
        status: status,
        priority: priority,
        assigneeId: assigneeId,
        reporterId: m.el.querySelector('#tf-reporter').value || user.id,
        deadline: m.el.querySelector('#tf-deadline').value || null,
        tags: chip.get()
      };

      if (isEdit) {
        S.updateTask(t.id, data, user);
        // вложения: добавленные и удалённые
        localAttachments.forEach(function (a) {
          if (d.attachments.indexOf(a) === -1) S.addAttachment(t.id, a, user);
        });
        removedAttachments.forEach(function (a) {
          var idx = t.attachments.indexOf(a);
          if (idx !== -1) S.removeAttachment(t.id, idx, user);
        });
        UI.toast('Задача сохранена', 'ok');
      } else {
        data.attachments = localAttachments.slice();
        var nt = S.createTask(data, user);
        UI.toast('Задача ' + S.taskCode(nt) + ' создана' + (nt.assigneeId !== user.id ? ' — исполнитель получит уведомление' : ''), 'ok');
      }
      m.close();
      NF.refresh();
    });
  };

  /* ================= Страница задачи ================= */

  NF.views.task.page = {
    render: function (el, taskId) {
      var user = S.currentUser();
      var t = S.taskById(taskId);
      if (!t) {
        el.innerHTML = UI.emptyState('alert', 'Задача не найдена', 'Возможно, она была удалена. Вернитесь на главную.');
        return;
      }
      var p = S.projectById(t.projectId);
      if (!p || !S.canSeeProject(user, t.projectId)) {
        el.innerHTML = UI.emptyState('shield', 'Нет доступа', 'У вас нет доступа к проекту этой задачи.');
        return;
      }

      var assignee = S.userById(t.assigneeId);
      var reporter = S.userById(t.reporterId);
      var comments = S.taskComments(t.id);
      var history = S.taskHistory(t.id);
      var canEdit = S.canEditTask(user, t);
      var canMove = S.canMoveTask(user, t);
      var canAttach = S.canAttach(user, t);
      var over = U.isOverdue(t);

      var html =
        '<div class="row" style="margin-bottom:14px">' +
          '<button class="link-btn" onclick="NF.go(\'#/project/' + p.id + '/board\')">' + U.icon('chevronRight', 13) + ' ' + U.escapeHtml(p.name) + '</button>' +
          '<span class="muted">/</span><span class="mono-id">' + S.taskCode(t) + '</span>' +
          (over ? '<span class="badge badge--red">' + U.icon('alert', 12) + ' Просрочена</span>' : '') +
        '</div>' +
        '<div class="task-layout">' +
          '<div class="home-col">' +
            '<div class="card"><div class="card__body">' +
              '<div class="row row--wrap" style="gap:10px;align-items:flex-start">' +
                '<h2 style="font-size:19px;font-weight:800;flex:1;min-width:200px">' + U.escapeHtml(t.title) + '</h2>' +
                (canEdit ? '<button class="btn btn--ghost btn--sm" id="btn-edit-task">' + U.icon('edit', 14) + ' Редактировать</button>' : '') +
                (canMove ? '<button class="btn btn--soft btn--sm" id="btn-move">' + U.icon('kanban', 14) + ' Перенести</button>' : '') +
              '</div>' +
              '<div class="row row--wrap" style="gap:8px;margin-top:10px">' +
                U.statusBadge(t.status) + U.priorityBadge(t.priority) +
                t.tags.map(function (tag) { return '<span class="tag">' + U.escapeHtml(tag) + '</span>'; }).join('') +
              '</div>' +
              '<div class="divider"></div>' +
              '<div class="task-desc">' + (U.escapeHtml(t.description) || '<span class="muted">Описание не заполнено</span>') + '</div>' +
            '</div></div>' +

            /* Вложения */
            '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('paperclip', 16) + ' Вложения <span class="badge badge--gray">' + t.attachments.length + '</span></span></div><div class="card__body" style="padding-top:12px;padding-bottom:12px">' +
              (t.attachments.length
                ? t.attachments.map(function (a, i) { return UI.attachRow(a, canAttach, null).replace('data-remove', 'data-remove="' + i + '"'); }).join('')
                : '<span class="muted">Вложений нет</span>') +
              (canAttach ?
                '<div class="row row--wrap" style="gap:8px;margin-top:10px">' +
                  '<button class="btn btn--soft btn--sm" id="tp-add-link">' + U.icon('link', 14) + ' Добавить ссылку</button>' +
                  '<button class="btn btn--soft btn--sm" id="tp-add-file">' + U.icon('file', 14) + ' Прикрепить файл</button>' +
                  '<input type="file" id="tp-file" hidden>' +
                '</div>' : '') +
            '</div></div>' +

            /* Комментарии */
            '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('comment', 16) + ' Комментарии <span class="badge badge--gray">' + comments.length + '</span></span></div><div class="card__body">' +
              '<div id="comments-list">' +
                (comments.length ? comments.map(function (c) { return commentHtml(c, user); }).join('')
                  : '<span class="muted">Комментариев пока нет — начните обсуждение.</span>') +
              '</div>' +
              '<div class="comment-form">' +
                UI.avatar(user, '') +
                '<div class="comment-form__box">' +
                  '<textarea class="input" id="comment-text" placeholder="Напишите комментарий…"></textarea>' +
                  '<div class="row" style="justify-content:flex-end;margin-top:8px">' +
                    '<button class="btn btn--accent btn--sm" id="comment-send">' + U.icon('check', 14) + ' Отправить</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div></div>' +
          '</div>' +

          /* Правая колонка */
          '<div class="task-side">' +
            '<div class="card"><div class="card__head"><span class="card__title">Свойства</span></div><div class="card__body">' +
              '<div class="prop-list">' +
                '<div class="prop"><span class="prop__label">Статус</span><span class="prop__value">' +
                  (canMove
                    ? '<select class="input" style="width:auto;padding:5px 26px 5px 10px;font-size:13px" id="tp-status">' +
                        U.statusOrder.map(function (s) { return '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + U.statusMeta[s].label + '</option>'; }).join('') + '</select>'
                    : U.statusBadge(t.status)) +
                '</span></div>' +
                propRow('Приоритет', U.priorityBadge(t.priority)) +
                propRow('Исполнитель', '<span class="row" style="gap:7px">' + UI.avatar(assignee, 'sm') + U.escapeHtml(assignee ? assignee.name : 'Не назначен') + '</span>') +
                propRow('Постановщик', '<span class="row" style="gap:7px">' + UI.avatar(reporter, 'sm') + U.escapeHtml(reporter ? reporter.name : '—') + '</span>') +
                propRow('Проект', '<a href="#/project/' + p.id + '/board">' + U.escapeHtml(p.name) + '</a>') +
                propRow('Создана', U.fmtDateTime(t.createdAt)) +
                propRow('Дедлайн', '<span class="deadline ' + U.deadlineClass(t) + '">' + U.icon('calendar', 13) +
                  (t.deadline ? U.fmtDateFull(t.deadline) : 'без срока') + '</span>') +
              '</div>' +
            '</div></div>' +

            '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('activity', 16) + ' История изменений</span></div><div class="card__body" style="padding-top:8px">' +
              (history.length ? '<div class="history">' + history.map(function (h) { return historyHtml(h); }).join('') + '</div>'
                : '<span class="muted">Изменений пока нет</span>') +
            '</div></div>' +
          '</div>' +
        '</div>';

      function propRow(label, valueHtml) {
        return '<div class="prop"><span class="prop__label">' + label + '</span><span class="prop__value">' + valueHtml + '</span></div>';
      }

      el.innerHTML = html;

      /* --- биндинги --- */
      var et = el.querySelector('#btn-edit-task');
      if (et) et.addEventListener('click', function () { NF.views.task.openForm({ taskId: t.id }); });

      var mv = el.querySelector('#btn-move');
      if (mv) mv.addEventListener('click', function (e) { UI.quickMoveMenu(mv, t, user); });

      var stSel = el.querySelector('#tp-status');
      if (stSel) stSel.addEventListener('change', function () {
        S.updateTask(t.id, { status: stSel.value }, user);
        UI.toast('Статус: ' + U.statusMeta[stSel.value].label, 'ok');
        NF.refresh();
      });

      /* вложения на странице */
      el.querySelectorAll('[data-remove]').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.confirm({
            title: 'Удалить вложение',
            text: 'Удалить «' + U.escapeHtml(t.attachments[+b.dataset.remove].name) + '»?',
            okLabel: 'Удалить', danger: true,
            onOk: function () {
              S.removeAttachment(t.id, +b.dataset.remove, user);
              UI.toast('Вложение удалено');
              NF.refresh();
            }
          });
        });
      });
      var al = el.querySelector('#tp-add-link');
      if (al) al.addEventListener('click', function () { promptLink(); });
      var af = el.querySelector('#tp-add-file');
      if (af) {
        var fi = el.querySelector('#tp-file');
        af.addEventListener('click', function () { fi.click(); });
        fi.addEventListener('change', function () {
          var f = fi.files[0];
          if (!f) return;
          if (f.size > MAX_FILE) { UI.toast('Файл больше 300 КБ — прикрепите ссылкой', 'error'); fi.value = ''; return; }
          var r = new FileReader();
          r.onload = function () {
            S.addAttachment(t.id, { type: 'file', name: f.name, data: r.result, size: f.size }, user);
            UI.toast('Файл прикреплён', 'ok');
            NF.refresh();
          };
          r.readAsDataURL(f);
          fi.value = '';
        });
      }

      function promptLink() {
        var m = UI.modal({
          title: 'Добавить ссылку', size: 'sm',
          body:
            '<div class="field"><label class="field__label">Название</label><input class="input" id="pl-name" placeholder="Например: Макет в Figma"></div>' +
            '<div class="field"><label class="field__label">Адрес<span class="req">*</span></label><input class="input" id="pl-url" placeholder="https://…"></div>',
          footer: '<button class="btn btn--ghost" data-cancel>Отмена</button><button class="btn btn--primary" data-ok>Добавить</button>'
        });
        m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
        m.el.querySelector('[data-ok]').addEventListener('click', function () {
          var url = m.el.querySelector('#pl-url').value.trim();
          if (!url) { UI.toast('Укажите адрес ссылки', 'error'); return; }
          if (!/^https?:\/\//i.test(url) && !/^www\./i.test(url)) url = 'https://' + url;
          var name = m.el.querySelector('#pl-name').value.trim() || url.replace(/^https?:\/\//i, '').slice(0, 60);
          S.addAttachment(t.id, { type: 'link', name: name, url: url }, user);
          UI.toast('Ссылка добавлена', 'ok');
          m.close();
          NF.refresh();
        });
        setTimeout(function () { m.el.querySelector('#pl-url').focus(); }, 80);
      }

      /* комментарии */
      var send = el.querySelector('#comment-send');
      var ctext = el.querySelector('#comment-text');
      send.addEventListener('click', function () {
        var v = ctext.value.trim();
        if (!v) return;
        S.addComment(t.id, v, user);
        UI.toast('Комментарий добавлен', 'ok');
        NF.refresh();
      });
      ctext.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send.click();
      });

      bindCommentActions(el, t, user);
    }
  };

  function commentHtml(c, user) {
    var author = S.userById(c.authorId);
    var canEdit = c.authorId === user.id;
    var canDelete = c.authorId === user.id || user.role === 'admin';
    var edited = c.updatedAt ? '<span class="comment__time">· изменён</span>' : '';
    return '<div class="comment" data-cid="' + c.id + '">' +
      UI.avatar(author || { id: c.authorId, name: c.authorName }) +
      '<div class="comment__body">' +
        '<div class="comment__head">' +
          '<span class="comment__author">' + U.escapeHtml(c.authorName) + '</span>' +
          '<span class="comment__time">' + U.fmtDateTime(c.createdAt) + '</span>' + edited +
          '<span class="comment__actions">' +
            (canEdit ? '<button class="icon-btn" data-cedit title="Редактировать">' + U.icon('edit', 14) + '</button>' : '') +
            (canDelete ? '<button class="icon-btn" data-cdel title="Удалить">' + U.icon('trash', 14) + '</button>' : '') +
          '</span>' +
        '</div>' +
        '<div class="comment__text">' + U.escapeHtml(c.text) + '</div>' +
      '</div>' +
    '</div>';
  }

  function bindCommentActions(el, t, user) {
    el.querySelectorAll('.comment').forEach(function (node) {
      var c = S.db().comments.find(function (x) { return x.id === node.dataset.cid; });
      if (!c) return;
      var editBtn = node.querySelector('[data-cedit]');
      if (editBtn) editBtn.addEventListener('click', function () {
        var textEl = node.querySelector('.comment__text');
        textEl.innerHTML = '<textarea class="input" style="min-height:60px">' + U.escapeHtml(c.text) + '</textarea>' +
          '<div class="row" style="gap:8px;margin-top:8px"><button class="btn btn--primary btn--sm" data-save>Сохранить</button>' +
          '<button class="btn btn--ghost btn--sm" data-cancelc>Отмена</button></div>';
        var ta = textEl.querySelector('textarea');
        ta.focus();
        textEl.querySelector('[data-save]').addEventListener('click', function () {
          if (S.updateComment(c.id, ta.value, user)) { UI.toast('Комментарий изменён', 'ok'); NF.refresh(); }
          else UI.toast('Не удалось изменить комментарий', 'error');
        });
        textEl.querySelector('[data-cancelc]').addEventListener('click', function () {
          textEl.innerHTML = U.escapeHtml(c.text);
        });
      });
      var delBtn = node.querySelector('[data-cdel]');
      if (delBtn) delBtn.addEventListener('click', function () {
        UI.confirm({
          title: 'Удалить комментарий',
          text: 'Комментарий будет удалён без возможности восстановления.',
          okLabel: 'Удалить', danger: true,
          onOk: function () {
            S.deleteComment(c.id, user);
            UI.toast('Комментарий удалён');
            NF.refresh();
          }
        });
      });
    });
  }

  function historyHtml(h) {
    var ico = h.field === 'status' ? 'kanban' : (h.field === 'deadline' ? 'calendar' : (h.field === 'attachments' ? 'paperclip' : (h.field === 'create' ? 'plus' : 'edit')));
    var detail;
    if (h.field === 'create') detail = 'задача создана';
    else if (h.text) detail = U.escapeHtml(h.text);
    else detail = '<span class="history__field">' + U.escapeHtml(S.fieldLabel(h.field)) + '</span>: ' +
      U.escapeHtml(h.from || '') + ' → <b>' + U.escapeHtml(h.to || '') + '</b>';
    return '<div class="history__item">' +
      '<span class="history__ico">' + U.icon(ico, 13) + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div>' + detail + '</div>' +
        '<div class="muted" style="font-size:11px;margin-top:1px">' + U.escapeHtml(h.userName) + ' · ' + U.fmtDateTime(h.ts) + '</div>' +
      '</div>' +
    '</div>';
  }
})();
