/* ============================================================
   NordFlow Tasks — раздел «Проекты» и страница проекта
   Вкладки: Доска · Список задач · Участники · Информация
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  NF.views = NF.views || {};

  /* ================= Список проектов ================= */

  NF.views.projects = {
    render: function (el) {
      var user = S.currentUser();
      var projects = S.visibleProjects(user)
        .slice().sort(function (a, b) {
          // активные первыми, затем по статусу и дате завершения
          var rank = { active: 0, planned: 1, paused: 2, done: 3, archived: 4 };
          if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
          return (a.endDate || '9999') < (b.endDate || '9999') ? -1 : 1;
        });

      var html = '<div class="page-head">' +
        '<div><div class="page-head__title">Проекты</div>' +
        '<div class="page-head__sub">' + projects.length + ' ' + U.plural(projects.length, ['проект', 'проекта', 'проектов']) + ' доступно вам</div></div>' +
        '<div class="page-head__actions">' +
        (S.canCreateProject(user) ? '<button class="btn btn--cta" id="btn-new-project">' + U.icon('plus', 16) + ' Создать проект</button>' : '') +
        '</div></div>';

      if (!projects.length) {
        html += UI.emptyState('folder', 'Проектов пока нет',
          user.role === 'admin' ? 'Создайте первый проект, чтобы начать работу.' : 'Администратор добавит вас в проект — он появится здесь.');
      } else {
        html += '<div class="cards-grid">' + projects.map(function (p) { return projCard(p, user); }).join('') + '</div>';
      }
      el.innerHTML = html;

      var np = el.querySelector('#btn-new-project');
      if (np) np.addEventListener('click', function () { openProjectForm(null, user); });
      el.querySelectorAll('.proj-card').forEach(function (c) {
        c.addEventListener('click', function () { NF.go('#/project/' + c.dataset.id + '/board'); });
      });
    }
  };

  function projCard(p, user) {
    var st = S.projectStats(p.id);
    var pm = S.userById(p.managerId);
    return '<div class="proj-card" data-id="' + p.id + '">' +
      '<div class="proj-card__top">' +
        '<div class="proj-card__name">' + U.escapeHtml(p.name) + '</div>' +
        U.projectStatusBadge(p.status) +
      '</div>' +
      '<div class="proj-card__desc">' + U.escapeHtml(p.description || 'Без описания') + '</div>' +
      '<div class="proj-card__meta">' +
        '<span class="meta-item">' + U.icon('tasks', 14) + st.open + ' ' + U.plural(st.open, ['открытая задача', 'открытые задачи', 'открытых задач']) + '</span>' +
        '<span class="meta-item">' + U.icon('users', 14) + p.memberIds.length + ' ' + U.plural(p.memberIds.length, ['участник', 'участника', 'участников']) + '</span>' +
        (st.overdue ? '<span class="meta-item" style="color:var(--danger)">' + U.icon('alert', 14) + st.overdue + ' ' + U.plural(st.overdue, ['просрочена', 'просрочены', 'просрочены']) + '</span>' : '') +
      '</div>' +
      '<div class="row" style="gap:9px;margin-top:2px"><div class="progress"><div class="progress__bar" style="width:' + st.progress + '%"></div></div><span class="muted" style="font-size:12px">' + st.progress + '%</span></div>' +
      '<div class="proj-card__foot">' +
        '<span class="proj-card__manager">' + UI.avatar(pm, 'sm') + '<span>' + U.escapeHtml(pm ? pm.name : '—') + '</span></span>' +
        (p.endDate ? '<span class="deadline">' + U.icon('calendar', 13) + ' до ' + U.fmtDate(p.endDate) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  /* ================= Форма создания/редактирования проекта ================= */

  function openProjectForm(project, user) {
    var isEdit = !!project;
    var users = S.db().users;
    var p = project || { name: '', description: '', managerId: '', memberIds: [], startDate: U.todayStr(), endDate: '', status: 'planned', allowMemberCreate: true };

    var body =
      '<div class="field"><label class="field__label">Название проекта<span class="req">*</span></label>' +
      '<input class="input" id="pf-name" maxlength="120" value="' + U.escapeHtml(p.name) + '" placeholder="Например: Сайт для клиента «GreenStone»"></div>' +
      '<div class="field"><label class="field__label">Описание</label>' +
      '<textarea class="input" id="pf-desc" rows="3" placeholder="Кратко о целях и составе работ">' + U.escapeHtml(p.description) + '</textarea></div>' +
      '<div class="form-grid">' +
        '<div class="field"><label class="field__label">Руководитель проекта<span class="req">*</span></label>' +
          '<select class="input" id="pf-manager">' +
            '<option value="">— выберите —</option>' +
            users.map(function (u) { return '<option value="' + u.id + '"' + (p.managerId === u.id ? ' selected' : '') + '>' + U.escapeHtml(u.name) + (u.role === 'manager' ? ' · РП' : (u.role === 'admin' ? ' · Админ' : '')) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label class="field__label">Статус</label>' +
          '<select class="input" id="pf-status">' +
            U.projectStatusOrder.map(function (s) { return '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + U.projectStatusMeta[s].label + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field"><label class="field__label">Дата начала</label>' +
          '<input type="date" class="input" id="pf-start" value="' + (p.startDate || '') + '"></div>' +
        '<div class="field"><label class="field__label">Плановая дата завершения</label>' +
          '<input type="date" class="input" id="pf-end" value="' + (p.endDate || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="field__label">Участники проекта</label><div class="panel" style="padding:10px 14px;display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;max-height:180px;overflow-y:auto">' +
        users.map(function (u) {
          var checked = (p.memberIds || []).indexOf(u.id) !== -1;
          return '<label class="checkbox"><input type="checkbox" value="' + u.id + '"' + (checked ? ' checked' : '') + '>' + UI.avatar(u, 'sm') + '<span style="margin-left:8px">' + U.escapeHtml(u.name) + '</span></label>';
        }).join('') +
      '</div><div class="field__hint">Руководитель проекта добавляется в участники автоматически.</div></div>' +
      '<label class="checkbox" style="margin-top:2px"><input type="checkbox" id="pf-members-create"' + (p.allowMemberCreate ? ' checked' : '') + '><span>Разрешить сотрудникам создавать задачи в этом проекте</span></label>';

    var m = UI.modal({
      title: isEdit ? 'Редактировать проект' : 'Создать проект',
      size: 'lg',
      body: body,
      footer: '<button class="btn btn--ghost" data-cancel>Отмена</button>' +
        '<button class="btn btn--primary" data-save>' + (isEdit ? 'Сохранить' : 'Создать проект') + '</button>'
    });

    m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
    m.el.querySelector('[data-save]').addEventListener('click', function () {
      var name = m.el.querySelector('#pf-name').value.trim();
      var managerId = m.el.querySelector('#pf-manager').value;
      var err = '';
      if (!name) err = 'Укажите название проекта';
      else if (!managerId) err = 'Назначьте руководителя проекта';
      if (err) { UI.toast(err, 'error'); return; }

      var memberIds = [];
      m.el.querySelectorAll('.panel .checkbox input:checked').forEach(function (c) { memberIds.push(c.value); });

      var data = {
        name: name,
        description: m.el.querySelector('#pf-desc').value.trim(),
        managerId: managerId,
        memberIds: memberIds,
        startDate: m.el.querySelector('#pf-start').value || null,
        endDate: m.el.querySelector('#pf-end').value || null,
        status: m.el.querySelector('#pf-status').value,
        allowMemberCreate: m.el.querySelector('#pf-members-create').checked
      };

      if (isEdit) {
        S.updateProject(p.id, data, user);
        UI.toast('Проект сохранён', 'ok');
      } else {
        var np = S.createProject(data, user);
        UI.toast('Проект создан', 'ok');
        m.close();
        NF.go('#/project/' + np.id + '/board');
        return;
      }
      m.close();
      NF.refresh();
    });
  }

  NF.views.projects.openForm = openProjectForm;

  /* ================= Страница проекта ================= */

  var boardFilter = { assignee: 'all' };

  NF.views.project = {
    render: function (el, projectId, tab) {
      var user = S.currentUser();
      var p = S.projectById(projectId);
      if (!p || !S.canSeeProject(user, projectId)) {
        el.innerHTML = UI.emptyState('shield', 'Нет доступа', 'Проект не найден или у вас нет к нему доступа.');
        return;
      }
      tab = tab || 'board';
      var st = S.projectStats(p.id);
      var pm = S.userById(p.managerId);
      var tasks = S.projectTasks(p.id);
      var canEdit = S.canEditProject(user);
      var canCreate = S.canCreateTask(user, p);

      var html =
        '<div class="page-head">' +
          '<div style="min-width:0">' +
            '<div class="row row--wrap" style="gap:10px"><span class="page-head__title">' + U.escapeHtml(p.name) + '</span>' + U.projectStatusBadge(p.status) + '</div>' +
            '<div class="page-head__sub row row--wrap" style="gap:14px">' +
              '<span>' + UI.avatar(pm, 'sm') + ' Руководитель: <b>' + U.escapeHtml(pm ? pm.name : '—') + '</b></span>' +
              '<span>' + U.icon('calendar', 14) + ' ' + U.fmtDate(p.startDate) + ' — ' + (p.endDate ? U.fmtDate(p.endDate) : 'без даты') + '</span>' +
              '<span>' + U.icon('tasks', 14) + ' ' + st.open + ' ' + U.plural(st.open, ['открытая', 'открытые', 'открытых']) + ' · ' + st.overdue + ' ' + U.plural(st.overdue, ['просроченная', 'просроченные', 'просроченных']) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="page-head__actions">' +
            (canCreate ? '<button class="btn btn--cta" id="btn-new-task">' + U.icon('plus', 16) + ' Создать задачу</button>' : '') +
            (canEdit ? '<button class="btn btn--ghost" id="btn-edit-project">' + U.icon('edit', 15) + ' Редактировать</button>' : '') +
          '</div>' +
        '</div>' +

        '<div class="tabs">' +
          tabBtn('board', 'Доска') +
          tabBtn('list', 'Список задач', st.total) +
          tabBtn('members', 'Участники', p.memberIds.length) +
          tabBtn('info', 'Информация о проекте') +
        '</div>' +
        '<div id="proj-tab"></div>';

      function tabBtn(key, label, count) {
        return '<button class="tabs__item' + (tab === key ? ' is-active' : '') + '" data-tab="' + key + '">' + label +
          (count !== undefined ? '<span class="count">' + count + '</span>' : '') + '</button>';
      }

      el.innerHTML = html;

      el.querySelectorAll('.tabs__item').forEach(function (b) {
        b.addEventListener('click', function () {
          NF.go('#/project/' + p.id + '/' + b.dataset.tab, { keepScroll: false });
        });
      });
      var bt = el.querySelector('#btn-new-task');
      if (bt) bt.addEventListener('click', function () { NF.views.task.openForm({ projectId: p.id }); });
      var ep = el.querySelector('#btn-edit-project');
      if (ep) ep.addEventListener('click', function () { openProjectForm(p, user); });

      var tabEl = el.querySelector('#proj-tab');
      if (tab === 'board') renderBoardTab(tabEl, p, user);
      else if (tab === 'list') renderListTab(tabEl, p, user);
      else if (tab === 'members') renderMembersTab(tabEl, p, user);
      else renderInfoTab(tabEl, p, user);
    }
  };

  /* ---------- Вкладка «Доска» ---------- */
  function renderBoardTab(tabEl, p, user) {
    var tasks = S.projectTasks(p.id);
    var members = p.memberIds.map(S.userById).filter(Boolean);
    if (boardFilter.assignee === 'all' || !p.memberIds.some(function (m) { return boardFilter.assignee === m; })) {
      // сбрасывать фильтр при смене проекта не будем — просто валидируем
    }
    var fTasks = tasks.filter(function (t) { return boardFilter.assignee === 'all' || t.assigneeId === boardFilter.assignee; });

    tabEl.innerHTML =
      '<div class="filters">' +
        '<span class="muted" style="font-weight:600">' + U.icon('filter', 14) + ' Исполнитель:</span>' +
        '<select class="input" id="board-assignee">' +
          '<option value="all">Все участники</option>' +
          members.map(function (m) { return '<option value="' + m.id + '"' + (boardFilter.assignee === m.id ? ' selected' : '') + '>' + U.escapeHtml(m.name) + '</option>'; }).join('') +
        '</select>' +
        '<span class="spacer"></span>' +
        '<span class="muted">Перетаскивайте карточки между колонками — статус обновится автоматически</span>' +
      '</div>' +
      '<div class="board-wrap"></div>';

    tabEl.querySelector('#board-assignee').addEventListener('change', function (e) {
      boardFilter.assignee = e.target.value;
      NF.render();
    });

    var board = UI.board({
      tasks: fTasks,
      canDrag: function (t) { return S.canMoveTask(user, t); },
      cardHtml: function (t) { return UI.kanbanCard(t, {}); },
      onMove: function (id, to) {
        var t = S.taskById(id);
        S.updateTask(id, { status: to }, user);
        NF.refresh();
        UI.toast('Статус: ' + U.statusMeta[to].label);
      }
    });
    board.addEventListener('click', function (e) {
      var more = e.target.closest('.kb-card__more');
      var card = e.target.closest('.kb-card');
      if (!card) return;
      var t = S.taskById(card.dataset.id);
      if (more) { e.stopPropagation(); UI.quickMoveMenu(more, t, user); return; }
      if (!NF.dragJustHappened()) NF.go('#/task/' + t.id);
    });
    tabEl.querySelector('.board-wrap').appendChild(board);
  }

  /* ---------- Вкладка «Список задач» ---------- */
  function renderListTab(tabEl, p, user) {
    var tasks = S.projectTasks(p.id).slice().sort(function (a, b) {
      var oa = U.isOverdue(a) ? 0 : 1, ob = U.isOverdue(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      if (a.deadline && b.deadline) return a.deadline < b.deadline ? -1 : 1;
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return S.taskCode(a) < S.taskCode(b) ? -1 : 1;
    });

    if (!tasks.length) {
      tabEl.innerHTML = UI.emptyState('tasks', 'В проекте пока нет задач', 'Создайте первую задачу кнопкой «Создать задачу».');
      return;
    }

    var rows = tasks.map(function (t) {
      var a = S.userById(t.assigneeId);
      var cCount = S.taskComments(t.id).length;
      var over = U.isOverdue(t);
      return '<tr data-id="' + t.id + '">' +
        '<td class="no-lbl"><span class="t-title" style="border-left:3px solid ' + UI.prioDotStyle(t.priority) + ';padding-left:9px">' + U.escapeHtml(t.title) + (over ? '&nbsp;<span class="badge badge--red">Просрочена</span>' : '') + '</span></td>' +
        '<td data-l="Номер"><span class="t-id">' + S.taskCode(t) + '</span></td>' +
        '<td data-l="Исполнитель"><span class="row" style="gap:8px">' + UI.avatar(a, 'sm') + '<span>' + U.escapeHtml(a ? a.name : 'Не назначен') + '</span></span></td>' +
        '<td data-l="Приоритет">' + U.priorityBadge(t.priority) + '</td>' +
        '<td data-l="Срок"><span class="deadline ' + U.deadlineClass(t) + '">' + (t.deadline ? U.fmtDateSmart(t.deadline) : '—') + '</span></td>' +
        '<td data-l="Статус">' + U.statusBadge(t.status) + '</td>' +
        '<td data-l="Обсуждение" class="t-cell-right"><span class="mini-count">' + U.icon('comment', 14) + cCount + '</span></td>' +
      '</tr>';
    }).join('');

    tabEl.innerHTML = '<div class="table-wrap"><table class="table">' +
      '<thead><tr><th>Задача</th><th>Номер</th><th>Исполнитель</th><th>Приоритет</th><th>Срок</th><th>Статус</th><th>Обсуждение</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';

    tabEl.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () { NF.go('#/task/' + tr.dataset.id); });
    });
  }

  /* ---------- Вкладка «Участники» ---------- */
  function renderMembersTab(tabEl, p, user) {
    var canManage = S.canManageMembers(user, p);
    var notMembers = S.db().users.filter(function (u) { return p.memberIds.indexOf(u.id) === -1; });

    var html = '<div class="page-head" style="margin-bottom:14px">' +
      '<div class="page-head__sub" style="margin:0">Участники проекта и их загрузка в нём</div>' +
      (canManage && notMembers.length ? '<button class="btn btn--primary btn--sm" id="btn-add-member">' + U.icon('plus', 15) + ' Добавить участника</button>' : '') +
      '</div><div class="cards-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">';

    p.memberIds.forEach(function (uid) {
      var u = S.userById(uid);
      if (!u) return;
      var isMgr = p.managerId === u.id;
      var active = S.projectTasks(p.id).filter(function (t) { return t.assigneeId === u.id && t.status !== 'done'; }).length;
      var over = S.projectTasks(p.id).filter(function (t) { return t.assigneeId === u.id && U.isOverdue(t); }).length;
      html += '<div class="member-card">' +
        '<div class="member-card__top">' + UI.avatar(u, 'lg') +
          '<div style="min-width:0"><div class="member-card__name">' + U.escapeHtml(u.name) + (isMgr ? ' <span class="badge badge--teal">Руководитель</span>' : '') + '</div>' +
          '<div class="member-card__pos">' + U.escapeHtml(u.position || '') + '</div></div>' +
        '</div>' +
        '<div class="member-card__mail">' + U.icon('mail', 13) + ' ' + U.escapeHtml(u.email) + '</div>' +
        '<div class="member-stats">' +
          '<span class="badge badge--gray">' + active + ' активных</span>' +
          (over ? '<span class="badge badge--red">' + over + ' просрочено</span>' : '') +
        '</div>' +
        (canManage && !isMgr ? '<button class="btn btn--danger btn--sm" style="width:100%" data-remove="' + u.id + '">' + U.icon('trash', 14) + ' Убрать из проекта</button>' : '') +
      '</div>';
    });
    html += '</div>';
    tabEl.innerHTML = html;

    var add = tabEl.querySelector('#btn-add-member');
    if (add) add.addEventListener('click', function () {
      UI.menu(add.getBoundingClientRect(), notMembers.map(function (u) {
        return { label: u.name + ' · ' + (u.position || ''), icon: 'user', onClick: function () {
          S.addMember(p.id, u.id, user);
          UI.toast(u.name + ' добавлен(а) в проект', 'ok');
          NF.refresh();
        } };
      }));
    });
    tabEl.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var uid = b.dataset.remove;
        var u = S.userById(uid);
        UI.confirm({
          title: 'Убрать участника',
          text: 'Убрать <b>' + U.escapeHtml(u.name) + '</b> из проекта «' + U.escapeHtml(p.name) + '»? Назначенные задачи останутся, но он потеряет доступ к проекту.',
          okLabel: 'Убрать', danger: true,
          onOk: function () {
            S.removeMember(p.id, uid, user);
            UI.toast('Участник удалён из проекта');
            NF.refresh();
          }
        });
      });
    });
  }

  /* ---------- Вкладка «Информация о проекте» ---------- */
  function renderInfoTab(tabEl, p, user) {
    var st = S.projectStats(p.id);
    var pm = S.userById(p.managerId);
    var canEdit = S.canEditProject(user);

    tabEl.innerHTML =
      '<div class="task-layout">' +
        '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('briefcase', 16) + ' О проекте</span></div><div class="card__body">' +
          '<div class="task-desc">' + (U.escapeHtml(p.description) || '<span class="muted">Описание не заполнено</span>') + '</div>' +
          '<div class="divider"></div>' +
          '<div class="prop-list">' +
            prop('Статус', '<span class="row" style="gap:8px">' + U.projectStatusBadge(p.status) +
              (canEdit ? '<select class="input" style="width:auto;padding:4px 26px 4px 9px;font-size:12.5px" id="quick-status">' +
                U.projectStatusOrder.map(function (s) { return '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + U.projectStatusMeta[s].label + '</option>'; }).join('') + '</select>' : '') + '</span>') +
            prop('Руководитель', '<span class="row" style="gap:8px">' + UI.avatar(pm, 'sm') + U.escapeHtml(pm ? pm.name : '—') + '</span>') +
            prop('Дата начала', U.fmtDateFull(p.startDate)) +
            prop('Плановое завершение', p.endDate ? U.fmtDateFull(p.endDate) : '—') +
            prop('Создан', U.fmtDateTime(p.createdAt)) +
            prop('Участников', p.memberIds.length) +
          '</div>' +
        '</div></div>' +
        '<div class="task-side">' +
          '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('target', 16) + ' Прогресс</span></div><div class="card__body">' +
            '<div class="row" style="gap:10px"><div class="progress" style="height:10px"><div class="progress__bar" style="width:' + st.progress + '%"></div></div><b>' + st.progress + '%</b></div>' +
            '<div class="divider"></div>' +
            '<div class="prop-list">' +
              prop('Всего задач', st.total) +
              prop('Выполнено', st.done) +
              prop('Открытых', st.open) +
              prop('Просрочено', st.overdue) +
            '</div>' +
          '</div></div>' +
          '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('users', 16) + ' Участники</span></div><div class="card__body" style="display:flex;flex-wrap:wrap;gap:8px">' +
            p.memberIds.map(function (uid) { var u = S.userById(uid); return u ? UI.avatar(u, 'lg') : ''; }).join('') +
          '</div></div>' +
        '</div>' +
      '</div>';

    function prop(label, valueHtml) {
      return '<div class="prop"><span class="prop__label">' + label + '</span><span class="prop__value">' + valueHtml + '</span></div>';
    }

    var qs = tabEl.querySelector('#quick-status');
    if (qs) qs.addEventListener('change', function () {
      S.updateProject(p.id, { status: qs.value }, user);
      UI.toast('Статус проекта: ' + U.projectStatusMeta[qs.value].label, 'ok');
      NF.refresh();
    });
  }
})();
