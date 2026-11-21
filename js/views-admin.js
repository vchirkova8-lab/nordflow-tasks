/* ============================================================
   NordFlow Tasks — раздел «Пользователи» (только администратор)
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  NF.views = NF.views || {};

  NF.views.admin = {
    render: function (el) {
      var user = S.currentUser();
      if (user.role !== 'admin') {
        el.innerHTML = UI.emptyState('shield', 'Доступ только для администратора', 'Этот раздел виден администраторам компании.');
        return;
      }
      var users = S.db().users.slice().sort(function (a, b) {
        var rank = { admin: 0, manager: 1, employee: 2 };
        if (rank[a.role] !== rank[b.role]) return rank[a.role] - rank[b.role];
        return a.name < b.name ? -1 : 1;
      });
      var visTasks = S.tasksVisible(user); // у админа — все задачи

      var rows = users.map(function (u) {
        var c = S.countsFor(u.id, visTasks);
        var roleBadge = u.role === 'admin' ? '<span class="badge badge--blue">Администратор</span>'
          : (u.role === 'manager' ? '<span class="badge badge--teal">Руководитель проектов</span>'
          : '<span class="badge badge--gray">Сотрудник</span>');
        var isSelf = u.id === user.id;
        return '<tr>' +
          '<td data-l="Сотрудник" class="no-lbl"><span class="t-title" style="min-width:0">' + UI.avatar(u, 'sm') +
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U.escapeHtml(u.name) +
            '<span class="muted" style="display:block;font-weight:400;font-size:12px">' + U.escapeHtml(u.position || '') + '</span></span></span></td>' +
          '<td data-l="Почта"><span style="font-size:12.5px">' + U.escapeHtml(u.email) + '</span></td>' +
          '<td data-l="Роль">' + roleBadge + '</td>' +
          '<td data-l="Активные задачи"><b>' + c.active + '</b>' + (c.overdue ? ' <span class="badge badge--red">+' + c.overdue + ' просроч.</span>' : '') + '</td>' +
          '<td data-l="Действия" class="t-cell-right"><span class="row" style="gap:2px;justify-content:flex-end">' +
            '<button class="icon-btn" data-edit="' + u.id + '" title="Редактировать">' + U.icon('edit', 15) + '</button>' +
            (isSelf ? '' : '<button class="icon-btn" data-del="' + u.id + '" title="Удалить" style="color:var(--danger)">' + U.icon('trash', 15) + '</button>') +
          '</span></td>' +
        '</tr>';
      }).join('');

      el.innerHTML =
        '<div class="page-head">' +
          '<div><div class="page-head__title">Пользователи</div>' +
          '<div class="page-head__sub">Управление сотрудниками, ролями и доступом</div></div>' +
          '<div class="page-head__actions">' +
            '<button class="btn btn--ghost" id="btn-reset-demo">' + U.icon('archive', 15) + ' Сбросить демо-данные</button>' +
            '<button class="btn btn--cta" id="btn-add-user">' + U.icon('plus', 16) + ' Добавить сотрудника</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table class="table">' +
          '<thead><tr><th>Сотрудник</th><th>Электронная почта</th><th>Роль</th><th>Активные задачи</th><th></th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +
        '<div class="panel" style="margin-top:16px;background:var(--surface-2)">' +
          '<span class="muted">' + U.icon('shield', 15) + ' Самостоятельная регистрация отключена: учётные записи создаёт администратор. ' +
          'При удалении пользователя его задачи остаются, но остаются без исполнителя, а руководимые проекты передаются вам.</span>' +
        '</div>';

      el.querySelector('#btn-add-user').addEventListener('click', function () { openUserForm(null, user); });
      el.querySelector('#btn-reset-demo').addEventListener('click', function () {
        UI.confirm({
          title: 'Сбросить демо-данные',
          text: 'Все изменения будут удалены, данные вернутся к демонстрационному состоянию: 8 пользователей, 3 проекта, 28 задач. Продолжить?',
          okLabel: 'Сбросить', danger: true,
          onOk: function () {
            S.resetDemo();
            UI.toast('Демо-данные восстановлены', 'ok');
            NF.refresh();
          }
        });
      });
      el.querySelectorAll('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () { openUserForm(S.userById(b.dataset.edit), user); });
      });
      el.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          var u = S.userById(b.dataset.del);
          UI.confirm({
            title: 'Удалить пользователя',
            text: 'Удалить учётную запись <b>' + U.escapeHtml(u.name) + '</b> (' + U.escapeHtml(u.email) + ')? Задачи останутся без исполнителя.',
            okLabel: 'Удалить', danger: true,
            onOk: function () {
              var res = S.deleteUser(u.id, user);
              if (res.error) UI.toast(res.error, 'error');
              else { UI.toast('Пользователь удалён'); NF.refresh(); }
            }
          });
        });
      });
    }
  };

  function openUserForm(u, actor) {
    var isEdit = !!u;
    var body =
      '<div class="field"><label class="field__label">Имя и фамилия<span class="req">*</span></label>' +
        '<input class="input" id="uf-name" value="' + U.escapeHtml(isEdit ? u.name : '') + '" maxlength="60" placeholder="Например: Пётр Смирнов"></div>' +
      '<div class="form-grid">' +
        '<div class="field"><label class="field__label">Электронная почта<span class="req">*</span></label>' +
          '<input class="input" id="uf-email" type="email" value="' + U.escapeHtml(isEdit ? u.email : '') + '" placeholder="name@nordflow.io"></div>' +
        '<div class="field"><label class="field__label">Должность</label>' +
          '<input class="input" id="uf-position" value="' + U.escapeHtml(isEdit ? (u.position || '') : '') + '" maxlength="60" placeholder="Например: Backend-разработчик"></div>' +
        '<div class="field"><label class="field__label">Роль</label>' +
          '<select class="input" id="uf-role">' +
            '<option value="employee"' + (isEdit && u.role === 'employee' ? ' selected' : '') + '>Сотрудник</option>' +
            '<option value="manager"' + (isEdit && u.role === 'manager' ? ' selected' : '') + '>Руководитель проектов</option>' +
            '<option value="admin"' + (isEdit && u.role === 'admin' ? ' selected' : '') + '>Администратор</option>' +
          '</select></div>' +
        '<div class="field"><label class="field__label">' + (isEdit ? 'Новый пароль (необязательно)' : 'Пароль<span class="req">*</span>') + '</label>' +
          '<input class="input" id="uf-pass" placeholder="' + (isEdit ? 'Оставьте пустым, чтобы не менять' : 'Минимум 4 символа') + '"></div>' +
      '</div>' +
      (isEdit ? '<div class="field__hint">Фотографию, имя и пароль сотрудник может изменить сам в настройках профиля.</div>' : '');

    var m = UI.modal({
      title: isEdit ? 'Редактировать пользователя' : 'Новый сотрудник',
      size: 'lg',
      body: body,
      footer: '<button class="btn btn--ghost" data-cancel>Отмена</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Сохранить' : 'Создать') + '</button>'
    });

    m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
    m.el.querySelector('[data-save]').addEventListener('click', function () {
      var name = m.el.querySelector('#uf-name').value.trim();
      var email = m.el.querySelector('#uf-email').value.trim();
      var pass = m.el.querySelector('#uf-pass').value;
      if (!name) { UI.toast('Укажите имя сотрудника', 'error'); return; }
      if (!/^\S+@\S+\.\S+$/.test(email)) { UI.toast('Укажите корректную почту', 'error'); return; }
      if (!isEdit && pass.length < 4) { UI.toast('Пароль минимум 4 символа', 'error'); return; }

      var data = {
        name: name, email: email,
        position: m.el.querySelector('#uf-position').value.trim(),
        role: m.el.querySelector('#uf-role').value
      };

      var res;
      if (isEdit) {
        if (pass) data.password = pass;
        res = S.updateUser(u.id, data, actor);
      } else {
        data.password = pass;
        res = S.createUser(data, actor);
      }
      if (res.error) { UI.toast(res.error, 'error'); return; }
      UI.toast(isEdit ? 'Пользователь сохранён' : 'Сотрудник добавлен — сообщите ему логин и пароль', 'ok');
      m.close();
      NF.refresh();
    });
  }
})();
