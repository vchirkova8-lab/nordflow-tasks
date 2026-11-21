/* ============================================================
   NordFlow Tasks — раздел «Команда» и настройки профиля
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  NF.views = NF.views || {};

  /* ================= Команда ================= */

  NF.views.team = {
    render: function (el) {
      var user = S.currentUser();
      var visTasks = S.tasksVisible(user);
      var users = S.db().users.slice().sort(function (a, b) {
        var rank = { admin: 0, manager: 1, employee: 2 };
        if (rank[a.role] !== rank[b.role]) return rank[a.role] - rank[b.role];
        return a.name < b.name ? -1 : 1;
      });

      var html = '<div class="page-head">' +
        '<div><div class="page-head__title">Команда</div>' +
        '<div class="page-head__sub">' + users.length + ' ' + U.plural(users.length, ['сотрудник', 'сотрудника', 'сотрудников']) + ' · загрузка считается по проектам, доступным вам</div></div>' +
        '</div><div class="team-grid">';

      users.forEach(function (u) {
        var c = S.countsFor(u.id, visTasks);
        var load = loadMeta(c.active);
        var roleBadge = u.role === 'admin' ? ' <span class="badge badge--blue">Администратор</span>'
          : (u.role === 'manager' ? ' <span class="badge badge--teal">РП</span>' : '');
        html += '<div class="member-card" data-id="' + u.id + '">' +
          '<div class="member-card__top">' + UI.avatar(u, 'lg') +
            '<div style="min-width:0"><div class="member-card__name">' + U.escapeHtml(u.name) + roleBadge + '</div>' +
            '<div class="member-card__pos">' + U.escapeHtml(u.position || '') + '</div></div>' +
          '</div>' +
          '<div class="member-card__mail">' + U.icon('mail', 13) + ' ' + U.escapeHtml(u.email) + '</div>' +
          '<div class="member-stats">' +
            '<span class="badge badge--gray">' + c.active + ' активных</span>' +
            (c.overdue ? '<span class="badge badge--red">' + c.overdue + ' просрочено</span>' : '') +
          '</div>' +
          '<div class="load-bar"><div class="progress"><div class="progress__bar" style="width:' + load.w + '%;background:' + load.color + '"></div></div>' +
            '<span style="color:' + load.color + ';font-weight:700;font-size:11.5px">' + load.label + '</span></div>' +
        '</div>';
      });

      html += '</div>';
      el.innerHTML = html;

      el.querySelectorAll('.member-card').forEach(function (card) {
        card.addEventListener('click', function () { openMemberCard(card.dataset.id, user, visTasks); });
      });
    }
  };

  function loadMeta(active) {
    if (active >= 6) return { w: 100, label: 'Высокая', color: 'var(--danger)' };
    if (active >= 3) return { w: 62, label: 'Средняя', color: 'var(--warn)' };
    return { w: 30, label: 'Низкая', color: 'var(--teal)' };
  }

  function openMemberCard(userId, viewer, visTasks) {
    var u = S.userById(userId);
    if (!u) return;
    var canSeeTasks = viewer.role === 'admin' || viewer.role === 'manager';
    var c = S.countsFor(u.id, visTasks);
    var activeTasks = visTasks.filter(function (t) {
      return t.assigneeId === u.id && t.status !== 'done';
    }).sort(function (a, b) {
      var oa = U.isOverdue(a) ? 0 : 1, ob = U.isOverdue(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
    });
    var doneCount = visTasks.filter(function (t) { return t.assigneeId === u.id && t.status === 'done'; }).length;

    var body = '<div class="row" style="gap:16px;margin-bottom:16px">' + UI.avatar(u, 'xl') +
      '<div><div style="font-family:var(--font-head);font-weight:800;font-size:17px">' + U.escapeHtml(u.name) + '</div>' +
      '<div class="muted">' + U.escapeHtml(u.position || '') + ' · ' + U.roleMeta[u.role].label + '</div>' +
      '<div class="muted" style="margin-top:4px">' + U.icon('mail', 13) + ' ' + U.escapeHtml(u.email) + '</div></div></div>' +
      '<div class="member-stats" style="margin-bottom:12px">' +
        '<span class="badge badge--gray">' + activeTasks.length + ' активных задач</span>' +
        '<span class="badge badge--green">' + doneCount + ' выполнено</span>' +
        (c.overdue ? '<span class="badge badge--red">' + c.overdue + ' просрочено</span>' : '') +
      '</div>';

    if (canSeeTasks) {
      body += '<div class="section-title">' + U.icon('tasks', 15) + ' Активные задачи сотрудника</div>';
      if (activeTasks.length) {
        body += '<div class="task-list">' + activeTasks.slice(0, 8).map(function (t) {
          var p = S.projectById(t.projectId);
          var over = U.isOverdue(t);
          return '<div class="task-row' + (over ? ' task-row--over' : '') + '" style="border-left-color:' + UI.prioDotStyle(t.priority) + '" onclick="UI.closeAllModals();NF.go(\'#/task/' + t.id + '\')">' +
            '<div class="task-row__main">' +
              '<div class="task-row__title">' + U.escapeHtml(t.title) + (over ? ' <span class="badge badge--red">Просрочена</span>' : '') + '</div>' +
              '<div class="task-row__meta"><span class="mono-id">' + S.taskCode(t) + '</span>' +
              (p ? '<span class="meta-item">' + U.icon('folder', 13) + U.escapeHtml(p.name) + '</span>' : '') +
              '</div></div>' +
            '<div class="task-row__side">' + U.statusBadge(t.status) +
            (t.deadline ? '<span class="deadline ' + U.deadlineClass(t) + '">' + U.fmtDateSmart(t.deadline) + '</span>' : '') + '</div>' +
          '</div>';
        }).join('') + '</div>';
        if (activeTasks.length > 8) body += '<div class="muted" style="margin-top:8px">и ещё ' + (activeTasks.length - 8) + ' задач…</div>';
      } else {
        body += UI.emptyState('checkCircle', 'Активных задач нет', 'Все задачи сотрудника в доступных вам проектах выполнены.');
      }
    } else {
      body += '<div class="panel" style="background:var(--surface-2)"><span class="muted">Список задач сотрудника доступен руководителям проектов.</span></div>';
    }

    var mm = UI.modal({ title: 'Карточка сотрудника', size: 'lg', body: body, footer: '<button class="btn btn--ghost" data-close2>Закрыть</button>' });
    mm.el.querySelector('[data-close2]').addEventListener('click', mm.close);
  }

  /* ================= Профиль ================= */

  NF.views.profile = {
    render: function (el) {
      var user = S.currentUser();

      el.innerHTML =
        '<div class="page-head"><div><div class="page-head__title">Настройки профиля</div>' +
        '<div class="page-head__sub">Личные данные, оформление и безопасность</div></div></div>' +
        '<div class="task-layout">' +
          '<div class="home-col">' +

            '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('user', 16) + ' Личные данные</span></div><div class="card__body">' +
              '<div class="row" style="gap:18px;margin-bottom:18px;align-items:center">' +
                '<div id="profile-avatar">' + UI.avatar(user, 'xl') + '</div>' +
                '<div class="row row--wrap" style="gap:8px">' +
                  '<button class="btn btn--primary btn--sm" id="btn-avatar">' + U.icon('image', 15) + ' Загрузить фото</button>' +
                  (user.avatar ? '<button class="btn btn--danger btn--sm" id="btn-avatar-del">' + U.icon('trash', 15) + ' Удалить</button>' : '') +
                  '<input type="file" id="avatar-file" accept="image/*" hidden>' +
                '</div>' +
              '</div>' +
              '<div class="form-grid">' +
                '<div class="field"><label class="field__label">Имя и фамилия</label>' +
                  '<input class="input" id="pr-name" value="' + U.escapeHtml(user.name) + '" maxlength="60"></div>' +
                '<div class="field"><label class="field__label">Должность</label>' +
                  '<input class="input" id="pr-position" value="' + U.escapeHtml(user.position || '') + '" maxlength="60"></div>' +
              '</div>' +
              '<button class="btn btn--primary" id="btn-save-profile">Сохранить</button>' +
            '</div></div>' +

            '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('key', 16) + ' Смена пароля</span></div><div class="card__body">' +
              '<div class="form-grid">' +
                '<div class="field"><label class="field__label">Новый пароль</label>' +
                  '<input type="password" class="input" id="pr-pass" placeholder="Минимум 4 символа"></div>' +
                '<div class="field"><label class="field__label">Повторите пароль</label>' +
                  '<input type="password" class="input" id="pr-pass2"></div>' +
              '</div>' +
              '<button class="btn btn--primary" id="btn-save-pass">Изменить пароль</button>' +
            '</div></div>' +

          '</div>' +
          '<div class="task-side">' +

            '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('briefcase', 16) + ' Учётная запись</span></div><div class="card__body">' +
              '<div class="prop-list">' +
                prop('Электронная почта', U.escapeHtml(user.email)) +
                prop('Роль', '<span class="badge badge--teal">' + U.roleMeta[user.role].label + '</span>') +
              '</div>' +
              '<div class="field__hint" style="margin-top:10px">Почту и роль может изменить только администратор в разделе «Пользователи».</div>' +
            '</div></div>' +

            '<div class="card"><div class="card__head"><span class="card__title">' + U.icon('sun', 16) + ' Оформление</span></div><div class="card__body">' +
              '<label class="checkbox" style="margin-bottom:10px"><input type="radio" name="pr-theme" value="light"' + (user.theme !== 'dark' ? ' checked' : '') + '><span>' + U.icon('sun', 15) + ' Светлая тема</span></label>' +
              '<label class="checkbox"><input type="radio" name="pr-theme" value="dark"' + (user.theme === 'dark' ? ' checked' : '') + '><span>' + U.icon('moon', 15) + ' Тёмная тема</span></label>' +
            '</div></div>' +

          '</div>' +
        '</div>';

      function prop(label, valueHtml) {
        return '<div class="prop"><span class="prop__label">' + label + '</span><span class="prop__value">' + valueHtml + '</span></div>';
      }

      /* фото */
      var avBtn = el.querySelector('#btn-avatar');
      var avFile = el.querySelector('#avatar-file');
      avBtn.addEventListener('click', function () { avFile.click(); });
      avFile.addEventListener('change', function () {
        var f = avFile.files[0];
        if (!f) return;
        if (f.size > 4 * 1024 * 1024) { UI.toast('Фото больше 4 МБ — выберите файл поменьше', 'error'); return; }
        var img = new Image();
        var r = new FileReader();
        r.onload = function () {
          img.onload = function () {
            var size = 160;
            var canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            var ctx = canvas.getContext('2d');
            var s = Math.min(img.width, img.height);
            ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
            var data = canvas.toDataURL('image/jpeg', 0.85);
            S.updateProfile(user.id, { avatar: data });
            UI.toast('Фото обновлено', 'ok');
            NF.refresh();
          };
          img.src = r.result;
        };
        r.readAsDataURL(f);
        avFile.value = '';
      });
      var avDel = el.querySelector('#btn-avatar-del');
      if (avDel) avDel.addEventListener('click', function () {
        S.updateProfile(user.id, { avatar: null });
        UI.toast('Фото удалено');
        NF.refresh();
      });

      /* профиль */
      el.querySelector('#btn-save-profile').addEventListener('click', function () {
        var name = el.querySelector('#pr-name').value.trim();
        if (!name) { UI.toast('Имя не может быть пустым', 'error'); return; }
        S.updateProfile(user.id, { name: name, position: el.querySelector('#pr-position').value.trim() });
        UI.toast('Профиль сохранён', 'ok');
        NF.refresh();
      });

      /* пароль */
      el.querySelector('#btn-save-pass').addEventListener('click', function () {
        var p1 = el.querySelector('#pr-pass').value, p2 = el.querySelector('#pr-pass2').value;
        if (p1.length < 4) { UI.toast('Пароль слишком короткий (минимум 4 символа)', 'error'); return; }
        if (p1 !== p2) { UI.toast('Пароли не совпадают', 'error'); return; }
        S.changePassword(user.id, p1);
        el.querySelector('#pr-pass').value = '';
        el.querySelector('#pr-pass2').value = '';
        UI.toast('Пароль изменён', 'ok');
      });

      /* тема */
      el.querySelectorAll('[name="pr-theme"]').forEach(function (r) {
        r.addEventListener('change', function () {
          S.updateProfile(user.id, { theme: r.value });
          NF.app.applyTheme(r.value);
          NF.render();
        });
      });
    }
  };

  NF.views.team.openMember = openMemberCard;
})();
