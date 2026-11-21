/* ============================================================
   NordFlow Tasks — раздел «Мои задачи»
   Фильтры, поиск, вид «список / доска»
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  NF.views = NF.views || {};

  var state = {
    status: 'all', project: 'all', priority: 'all', deadline: 'all',
    q: '', view: 'list', preset: null
  };

  function applyPreset() {
    if (state.preset === 'active') { state.status = 'active'; state.deadline = 'all'; }
    else if (state.preset === 'overdue') { state.deadline = 'overdue'; }
    else if (state.preset === 'week') { state.deadline = 'week'; }
    state.preset = null;
  }

  function filtered(user, tasks) {
    var q = state.q.trim().toLowerCase();
    return tasks.filter(function (t) {
      if (state.status === 'active' && t.status === 'done') return false;
      if (state.status !== 'all' && state.status !== 'active' && t.status !== state.status) return false;
      if (state.project !== 'all' && t.projectId !== state.project) return false;
      if (state.priority !== 'all' && t.priority !== state.priority) return false;
      if (state.deadline === 'overdue') { if (!U.isOverdue(t)) return false; }
      else if (state.deadline === 'today') { if (!(t.deadline === U.todayStr() && t.status !== 'done')) return false; }
      else if (state.deadline === 'week') { if (!(t.deadline && t.status !== 'done' && U.isThisWeek(t.deadline))) return false; }
      else if (state.deadline === 'none') { if (t.deadline) return false; }
      if (q && (t.title.toLowerCase().indexOf(q) === -1 && S.taskCode(t).toLowerCase().indexOf(q) === -1)) return false;
      return true;
    }).sort(function (a, b) {
      // просроченные сверху, затем по сроку
      var oa = U.isOverdue(a) ? 0 : 1, ob = U.isOverdue(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return (a.deadline || '9999-99-99') < (b.deadline || '9999-99-99') ? -1 : 1;
    });
  }

  NF.views.mytasks = {
    preset: null,
    render: function (el) {
      var user = S.currentUser();
      if (state.preset) applyPreset();
      var all = S.tasksVisible(user).filter(function (t) { return t.assigneeId === user.id; });
      var tasks = filtered(user, all);
      var projects = S.visibleProjects(user);
      var creatable = projects.filter(function (p) { return S.canCreateTask(user, p); });

      var html =
        '<div class="page-head">' +
          '<div><div class="page-head__title">Мои задачи</div>' +
          '<div class="page-head__sub">Задачи, где вы назначены исполнителем</div></div>' +
          '<div class="page-head__actions">' +
            '<div class="seg">' +
              '<button data-view="list" class="' + (state.view === 'list' ? 'is-active' : '') + '">' + U.icon('list', 15) + ' Список</button>' +
              '<button data-view="board" class="' + (state.view === 'board' ? 'is-active' : '') + '">' + U.icon('kanban', 15) + ' Доска</button>' +
            '</div>' +
            (creatable.length ? '<button class="btn btn--cta" id="btn-new-task">' + U.icon('plus', 16) + ' Создать задачу</button>' : '') +
          '</div>' +
        '</div>' +

        '<div class="filters">' +
          '<div class="search-input">' + U.icon('search', 15) + '<input class="input" id="my-q" placeholder="Поиск по названию или номеру" value="' + U.escapeHtml(state.q) + '"></div>' +
          '<select class="input" data-f="status">' + statusOptions(state.status) + '</select>' +
          '<select class="input" data-f="project"><option value="all">Все проекты</option>' +
            projects.map(function (p) { return '<option value="' + p.id + '"' + (state.project === p.id ? ' selected' : '') + '>' + U.escapeHtml(p.name) + '</option>'; }).join('') + '</select>' +
          '<select class="input" data-f="priority"><option value="all">Любой приоритет</option>' +
            U.priorityOrder.map(function (p) { return '<option value="' + p + '"' + (state.priority === p ? ' selected' : '') + '>' + U.priorityMeta[p].label + '</option>'; }).join('') + '</select>' +
          '<select class="input" data-f="deadline">' + deadlineOptions(state.deadline) + '</select>' +
        '</div>';

      if (!tasks.length) {
        html += UI.emptyState('checkCircle', 'Задачи не найдены',
          all.length ? 'Попробуйте изменить фильтры или поисковый запрос.' : 'Пока вам не назначено ни одной задачи.');
      } else if (state.view === 'list') {
        html += '<div class="task-list">' + tasks.map(function (t) { return taskRow(t, user); }).join('') + '</div>';
      } else {
        html += '<div id="my-board"></div>';
      }

      el.innerHTML = html;

      // биндинг
      el.querySelectorAll('.seg [data-view]').forEach(function (b) {
        b.addEventListener('click', function () { state.view = b.dataset.view; NF.render(); });
      });
      el.querySelectorAll('.filters [data-f]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          state[sel.dataset.f] = sel.value;
          NF.render();
        });
      });
      var q = el.querySelector('#my-q');
      q.addEventListener('input', U.debounce(function () {
        state.q = q.value;
        renderListOnly();
      }, 220));
      var nt = el.querySelector('#btn-new-task');
      if (nt) nt.addEventListener('click', function () {
        NF.views.task.openForm({ projectId: creatable.length === 1 ? creatable[0].id : null });
      });

      if (state.view === 'board') {
        var board = UI.board({
          tasks: tasks,
          canDrag: function (t) { return S.canMoveTask(user, t); },
          cardHtml: function (t) { return UI.kanbanCard(t, { showProject: true }); },
          onMove: function (id, to) {
            var t = S.taskById(id);
            S.updateTask(id, { status: to }, user);
            NF.refresh();
            UI.toast('Статус: ' + U.statusMeta[to].label + (t && to === 'done' ? ' — задача выполнена!' : ''));
          }
        });
        bindBoardEvents(board, user);
        el.querySelector('#my-board').appendChild(board);
      }

      function renderListOnly() {
        var nowTasks = filtered(user, S.tasksVisible(user).filter(function (t) { return t.assigneeId === user.id; }));
        var wrap = el.querySelector('.task-list');
        if (!wrap) { NF.render(); return; }
        wrap.innerHTML = nowTasks.length ? nowTasks.map(function (t) { return taskRow(t, user); }).join('') : '';
        if (!nowTasks.length) NF.render();
      }
    }
  };

  function bindBoardEvents(board, user) {
    board.addEventListener('click', function (e) {
      var more = e.target.closest('.kb-card__more');
      var card = e.target.closest('.kb-card');
      if (!card) return;
      var t = S.taskById(card.dataset.id);
      if (more) {
        e.stopPropagation();
        UI.quickMoveMenu(more, t, user);
        return;
      }
      if (!NF.dragJustHappened()) NF.go('#/task/' + t.id);
    });
  }

  function taskRow(t, user) {
    var S_ = NF.store;
    var project = S_.projectById(t.projectId);
    var reporter = S_.userById(t.reporterId);
    var over = U.isOverdue(t);
    var cCount = S_.taskComments(t.id).length;
    return '<div class="task-row' + (over ? ' task-row--over' : '') + '" style="border-left-color:' + UI.prioDotStyle(t.priority) + '" onclick="NF.go(\'#/task/' + t.id + '\')">' +
      '<div class="task-row__main">' +
        '<div class="task-row__title">' + U.escapeHtml(t.title) +
          (over ? '<span class="badge badge--red">' + U.icon('alert', 12) + ' Просрочена</span>' : '') +
        '</div>' +
        '<div class="task-row__meta">' +
          '<span class="meta-item mono-id">' + S_.taskCode(t) + '</span>' +
          (project ? '<span class="meta-item">' + U.icon('folder', 13) + U.escapeHtml(project.name) + '</span>' : '') +
          '<span class="meta-item">' + U.icon('user', 13) + 'Постановщик: ' + U.escapeHtml(reporter ? reporter.name : '—') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="task-row__side">' +
        U.statusBadge(t.status) +
        U.priorityBadge(t.priority) +
        (t.deadline ? '<span class="deadline ' + U.deadlineClass(t) + '">' + U.icon('calendar', 13) + U.fmtDateSmart(t.deadline) + '</span>' : '') +
        (cCount ? '<span class="mini-count">' + U.icon('comment', 14) + cCount + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function statusOptions(cur) {
    return '<option value="all"' + (cur === 'all' ? ' selected' : '') + '>Все статусы</option>' +
      '<option value="active"' + (cur === 'active' ? ' selected' : '') + '>Активные (не выполненные)</option>' +
      U.statusOrder.map(function (s) {
        return '<option value="' + s + '"' + (cur === s ? ' selected' : '') + '>' + U.statusMeta[s].label + '</option>';
      }).join('');
  }
  function deadlineOptions(cur) {
    return '<option value="all"' + (cur === 'all' ? ' selected' : '') + '>Все сроки</option>' +
      '<option value="overdue"' + (cur === 'overdue' ? ' selected' : '') + '>Только просроченные</option>' +
      '<option value="today"' + (cur === 'today' ? ' selected' : '') + '>Срок — сегодня</option>' +
      '<option value="week"' + (cur === 'week' ? ' selected' : '') + '>Срок — на этой неделе</option>' +
      '<option value="none"' + (cur === 'none' ? ' selected' : '') + '>Без срока</option>';
  }
})();
