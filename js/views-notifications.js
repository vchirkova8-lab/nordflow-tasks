/* ============================================================
   NordFlow Tasks — раздел «Уведомления»
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  NF.views = NF.views || {};

  NF.NOTIF_META = {
    assigned: { ico: 'tasks',    cls: 'badge--teal',  bg: 'var(--teal-soft)',  color: 'var(--teal)' },
    status:   { ico: 'kanban',   cls: 'badge--blue',  bg: 'var(--info-soft)',  color: 'var(--info)' },
    deadline: { ico: 'calendar', cls: 'badge--amber', bg: 'var(--warn-soft)',  color: 'var(--warn)' },
    comment:  { ico: 'comment',  cls: 'badge--gray',  bg: 'var(--surface-2)',  color: 'var(--text-2)' },
    due_soon: { ico: 'clock',    cls: 'badge--amber', bg: 'var(--warn-soft)',  color: 'var(--warn)' },
    overdue:  { ico: 'alert',    cls: 'badge--red',   bg: 'var(--danger-soft)',color: 'var(--danger)' }
  };

  NF.views.notifications = {
    render: function (el) {
      var user = S.currentUser();
      var list = S.myNotifications(user.id);
      var unread = S.unreadCount(user.id);

      el.innerHTML =
        '<div class="page-head">' +
          '<div><div class="page-head__title">Уведомления</div>' +
          '<div class="page-head__sub">' + (unread ? 'Непрочитанных: ' + unread : 'Все уведомления прочитаны') + '</div></div>' +
          '<div class="page-head__actions">' +
            (unread ? '<button class="btn btn--soft" id="btn-read-all">' + U.icon('check', 15) + ' Отметить все прочитанными</button>' : '') +
            '<button class="btn btn--ghost" id="btn-clear">' + U.icon('trash', 15) + ' Очистить прочитанные</button>' +
          '</div>' +
        '</div>';

      if (!list.length) {
        el.innerHTML += UI.emptyState('bell', 'Уведомлений нет', 'Здесь появятся назначения задач, смена статусов, комментарии и напоминания о дедлайнах.');
        return;
      }

      var html = '<div class="notif-list">';
      list.forEach(function (n) {
        var meta = NF.NOTIF_META[n.type] || NF.NOTIF_META.comment;
        var task = n.taskId ? S.taskById(n.taskId) : null;
        html += '<div class="notif' + (n.read ? '' : ' is-unread') + '" data-id="' + n.id + '" data-task="' + (task ? task.id : '') + '">' +
          '<span class="notif__ico" style="background:' + meta.bg + ';color:' + meta.color + '">' + U.icon(meta.ico, 17) + '</span>' +
          '<div class="notif__text">' + U.escapeHtml(n.text) +
            '<div class="notif__time">' + U.timeAgo(n.createdAt) + (n.read ? '' : ' · новое') + '</div>' +
          '</div>' +
          (n.read ? '' : '<span class="notif__dot"></span>') +
        '</div>';
      });
      html += '</div>';
      el.innerHTML += html;

      el.querySelector('#btn-clear').addEventListener('click', function () {
        S.clearRead(user.id);
        UI.toast('Прочитанные уведомления удалены');
        NF.refresh();
      });
      var ra = el.querySelector('#btn-read-all');
      if (ra) ra.addEventListener('click', function () {
        S.markAllRead(user.id);
        NF.refresh();
      });
      el.querySelectorAll('.notif').forEach(function (node) {
        node.addEventListener('click', function () {
          S.markNotifRead(node.dataset.id);
          if (node.dataset.task) NF.go('#/task/' + node.dataset.task);
          else NF.refresh();
        });
      });
    }
  };
})();
