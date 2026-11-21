/* ============================================================
   NordFlow Tasks — раздел «Главная»
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  NF.views = NF.views || {};

  NF.views.home = {
    render: function (el) {
      var user = S.currentUser();
      var myTasks = S.tasksVisible(user).filter(function (t) { return t.assigneeId === user.id; });
      var counts = S.countsFor(user.id, S.tasksVisible(user));

      var weekLabel = U.weekLabel();

      var html = '' +
        '<div class="greet">' +
          UI.avatar(user, 'lg') +
          '<div>' +
            '<div class="greet__title">Добрый день, ' + U.escapeHtml(user.name.split(' ')[0]) + '</div>' +
            '<div class="greet__date">' + U.fmtDateFull(U.todayStr()) + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="stats">' +
          stat('tasks', counts.active, 'Активные задачи', 'badge--teal', 'nfSetMyFilter(\'active\')') +
          stat('alert', counts.overdue, 'Просроченные', 'badge--red', counts.overdue ? 'nfSetMyFilter(\'overdue\')' : '') +
          stat('calendar', counts.week, 'На этой неделе', 'badge--blue', counts.week ? 'nfSetMyFilter(\'week\')' : '') +
        '</div>' +

        '<div class="home-grid">';

      // Левая колонка
      html += '<div class="home-col">';

      // Сводка руководителя
      var managed = S.visibleProjects(user).filter(function (p) {
        return user.role === 'admin' || p.managerId === user.id;
      });
      if ((user.role === 'manager' || user.role === 'admin') && managed.length) {
        html += '<div class="card"><div class="card__head">' +
          '<span class="card__title">' + U.icon('target', 17) + ' Сводка по команде</span>' +
          '<span class="spacer"></span><span class="muted">' + managed.length + ' ' + U.plural(managed.length, ['проект', 'проекта', 'проектов']) + '</span>' +
          '</div><div class="card__body" style="padding-top:8px">';
        managed.forEach(function (p) {
          var st = S.projectStats(p.id);
          html += '<div class="row" style="padding:9px 0;border-bottom:1px solid var(--border-2);cursor:pointer" onclick="NF.go(\'#/project/' + p.id + '/board\')">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U.escapeHtml(p.name) + '</div>' +
              '<div class="row row--wrap" style="gap:10px;margin-top:5px;font-size:12px;color:var(--text-2)">' +
                '<span class="mini-count">' + U.icon('tasks', 13) + st.open + ' ' + U.plural(st.open, ['открытая', 'открытые', 'открытых']) + '</span>' +
                (st.overdue ? '<span class="mini-count" style="color:var(--danger)">' + U.icon('alert', 13) + st.overdue + ' ' + U.plural(st.overdue, ['просроченная', 'просроченные', 'просроченных']) + '</span>' : '<span class="mini-count">' + U.icon('check', 13) + ' без просроченных</span>') +
                '<span class="mini-count">' + U.icon('users', 13) + p.memberIds.length + '</span>' +
              '</div>' +
              '<div class="progress" style="margin-top:7px;max-width:220px"><div class="progress__bar" style="width:' + st.progress + '%"></div></div>' +
            '</div>' +
            U.projectStatusBadge(p.status) +
          '</div>';
        });
        html += '</div></div>';
      }

      // Ближайшие дедлайны
      var dls = myTasks.filter(function (t) { return t.deadline && t.status !== 'done'; })
        .sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; })
        .slice(0, 5);
      html += '<div class="card"><div class="card__head">' +
        '<span class="card__title">' + U.icon('clock', 17) + ' Ближайшие дедлайны</span>' +
        '<span class="spacer"></span><button class="link-btn" onclick="NF.go(\'#/my\')">Все мои задачи</button>' +
        '</div><div class="card__body" style="padding-top:6px">';
      if (dls.length) {
        dls.forEach(function (t) {
          var cls = U.deadlineClass(t);
          html += '<div class="deadline-item" onclick="NF.go(\'#/task/' + t.id + '\')">' +
            '<span class="d-id">' + S.taskCode(t) + '</span>' +
            '<span class="d-title" style="color:' + (cls === 'deadline--over' ? 'var(--danger)' : 'inherit') + '">' + U.escapeHtml(t.title) + '</span>' +
            '<span class="deadline ' + cls + '">' + U.icon('calendar', 13) + U.fmtDateSmart(t.deadline) + '</span>' +
            U.priorityBadge(t.priority) +
          '</div>';
        });
      } else {
        html += UI.emptyState('checkCircle', 'Ближайших дедлайнов нет', 'Задачи со сроками появятся в этом списке.');
      }
      html += '</div></div>';

      // Последние обновления
      var feed = S.activityFeed(user, 8);
      html += '<div class="card"><div class="card__head">' +
        '<span class="card__title">' + U.icon('activity', 17) + ' Последние обновления</span>' +
        '</div><div class="card__body" style="padding-top:4px">';
      if (feed.length) {
        html += '<div class="feed">';
        feed.forEach(function (it) {
          var ico, text, time = U.timeAgo(it.ts);
          if (it.kind === 'comment') {
            ico = 'comment';
            var snippet = it.c.text.length > 70 ? it.c.text.slice(0, 70) + '…' : it.c.text;
            text = '<b>' + U.escapeHtml(it.c.authorName) + '</b> · комментарий к ' + S.taskCode(it.task) + ': «' + U.escapeHtml(snippet) + '»';
          } else {
            var h = it.h;
            ico = h.field === 'status' ? 'kanban' : 'edit';
            var detail = h.field === 'status'
              ? 'статус: «' + U.escapeHtml(h.from) + '» → «' + U.escapeHtml(h.to) + '»'
              : (h.field === 'deadline' ? 'срок: ' + U.escapeHtml(h.from) + ' → ' + U.escapeHtml(h.to)
              : (h.field === 'assignee' ? 'исполнитель: ' + U.escapeHtml(h.from) + ' → ' + U.escapeHtml(h.to)
              : (h.field === 'priority' ? 'приоритет: ' + U.escapeHtml(h.from) + ' → ' + U.escapeHtml(h.to)
              : (h.field === 'title' ? 'новое название: «' + U.escapeHtml(h.to) + '»'
              : U.escapeHtml(h.text || S.fieldLabel(h.field))))));
            text = '<b>' + U.escapeHtml(h.userName) + '</b> · ' + S.taskCode(it.task) + ' — ' + detail;
          }
          html += '<div class="feed__item" onclick="NF.go(\'#/task/' + it.task.id + '\')">' +
            '<span class="feed__ico">' + U.icon(ico, 15) + '</span>' +
            '<div style="flex:1;min-width:0"><div class="feed__text">' + text + '</div><div class="feed__time">' + time + '</div></div>' +
          '</div>';
        });
        html += '</div>';
      } else {
        html += UI.emptyState('activity', 'Обновлений пока нет', 'Здесь появятся изменения в ваших проектах.');
      }
      html += '</div></div>';

      html += '</div>'; // левая колонка

      // Правая колонка: Мои проекты
      html += '<div class="home-col">';
      var projects = S.visibleProjects(user).filter(function (p) { return p.status !== 'archived'; });
      html += '<div class="card"><div class="card__head">' +
        '<span class="card__title">' + U.icon('folder', 17) + ' ' + (user.role === 'admin' ? 'Проекты' : 'Мои проекты') + '</span>' +
        '<span class="spacer"></span><button class="link-btn" onclick="NF.go(\'#/projects\')">Все проекты</button>' +
        '</div><div class="card__body" style="padding-top:6px">';
      if (projects.length) {
        projects.forEach(function (p) {
          var st = S.projectStats(p.id);
          var pm = S.userById(p.managerId);
          html += '<div class="row" style="padding:10px 0;border-bottom:1px solid var(--border-2);cursor:pointer;gap:12px" onclick="NF.go(\'#/project/' + p.id + '/board\')">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:600;font-size:13.5px;margin-bottom:5px">' + U.escapeHtml(p.name) + '</div>' +
              '<div class="row" style="gap:10px"><div class="progress" style="max-width:150px"><div class="progress__bar" style="width:' + st.progress + '%"></div></div>' +
              '<span class="muted" style="font-size:12px">' + st.done + '/' + st.total + '</span></div>' +
            '</div>' +
            '<div style="text-align:right">' + U.projectStatusBadge(p.status) +
              '<div class="row" style="justify-content:flex-end;margin-top:6px;gap:6px;font-size:12px;color:var(--text-2)">' + UI.avatar(pm, 'sm') + ' <span>' + U.escapeHtml(pm ? pm.name.split(' ')[0] : '') + '</span></div>' +
            '</div>' +
          '</div>';
        });
      } else {
        html += UI.emptyState('folder', 'Проектов пока нет', user.role === 'admin' ? 'Создайте первый проект в разделе «Проекты».' : 'Вас добавят в проекты — они появятся здесь.');
      }
      html += '</div></div>';
      html += '</div>'; // правая колонка

      html += '</div>'; // grid

      el.innerHTML = html;
    }
  };

  function stat(icon, num, label, badgeCls, onclick) {
    return '<div class="stat' + (onclick ? ' stat--link' : '') + '"' + (onclick ? ' onclick="' + onclick + '"' : '') + '>' +
      '<span class="stat__ico ' + badgeCls.replace('badge--', 'badge--') + '" style="background:var(--surface-2);color:' +
      (label === 'Просроченные' ? 'var(--danger)' : label === 'На этой неделе' ? 'var(--info)' : 'var(--teal)') + '">' +
      U.icon(icon, 20) + '</span>' +
      '<div><div class="stat__num">' + num + '</div><div class="stat__label">' + label + '</div></div>' +
    '</div>';
  }

  // переход в «Мои задачи» с предустановленным фильтром
  window.nfSetMyFilter = function (preset) {
    NF.views.mytasks.preset = preset;
    NF.go('#/my');
  };
})();
