/* ============================================================
   NordFlow Tasks — общие UI-компоненты:
   аватары, модальные окна, меню, тосты, канбан с DnD,
   чипы тегов, вложения
   ============================================================ */
(function () {
  'use strict';
  window.NF = window.NF || {};
  var U = NF.util;
  var UI = NF.ui = {};

  /* ---------- Аватар ---------- */
  UI.avatar = function (user, size) {
    size = size || '';
    var cls = size ? ' avatar--' + size : '';
    if (!user) {
      return '<span class="avatar' + cls + '" style="background:#64748B">' + U.icon('user', size === 'xl' ? 30 : (size === 'lg' ? 18 : 13)) + '</span>';
    }
    var style = 'background:' + U.avatarColor(user.id);
    if (user.avatar) {
      return '<span class="avatar' + cls + '"><img src="' + user.avatar + '" alt=""></span>';
    }
    return '<span class="avatar' + cls + '" style="' + style + '" title="' + U.escapeHtml(user.name) + '">' + U.initials(user.name) + '</span>';
  };

  UI.avatarStack = function (users, max) {
    max = max || 4;
    var list = users.slice(0, max);
    var rest = users.length - list.length;
    var html = '<span class="avatar-stack">';
    list.forEach(function (u) { html += UI.avatar(u, 'sm'); });
    if (rest > 0) html += '<span class="avatar avatar--sm" style="background:#54677C">+' + rest + '</span>';
    html += '</span>';
    return html;
  };

  /* ---------- Тосты ---------- */
  UI.toastWrap = null;
  UI.toast = function (text, type) {
    if (!UI.toastWrap) {
      UI.toastWrap = document.createElement('div');
      UI.toastWrap.className = 'toast-wrap';
      document.body.appendChild(UI.toastWrap);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast--error' : (type === 'ok' ? ' toast--ok' : ''));
    var ico = type === 'error' ? 'alert' : 'check';
    el.innerHTML = U.icon(ico, 17) + '<span>' + U.escapeHtml(text) + '</span>';
    UI.toastWrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(function () { el.remove(); }, 320);
    }, 2800);
  };

  /* ---------- Модальные окна ---------- */
  UI.closeTopModal = function () {
    var overlays = document.querySelectorAll('.overlay');
    if (overlays.length) { overlays[overlays.length - 1].remove(); return true; }
    return false;
  };
  UI.closeAllModals = function () {
    document.querySelectorAll('.overlay').forEach(function (o) { o.remove(); });
    document.querySelectorAll('.menu').forEach(function (m) { m.remove(); });
    document.querySelectorAll('.search-pop').forEach(function (m) { m.remove(); });
  };
  UI.modal = function (opts) {
    // opts: {title, body (html-строка), footer (html), size: ''|'sm'|'lg', onClose, noFooter}
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML =
      '<div class="modal' + (opts.size ? ' modal--' + opts.size : '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal__head">' +
          '<div class="modal__title">' + opts.title + '</div>' +
          '<button class="icon-btn modal__close" type="button" aria-label="Закрыть">' + U.icon('x', 19) + '</button>' +
        '</div>' +
        '<div class="modal__body">' + (opts.body || '') + '</div>' +
        (opts.footer ? '<div class="modal__foot">' + opts.footer + '</div>' : '') +
      '</div>';
    document.body.appendChild(ov);
    function close() {
      ov.remove();
      if (opts.onClose) opts.onClose();
    }
    ov.querySelector('.modal__close').addEventListener('click', close);
    ov.addEventListener('pointerdown', function (e) {
      if (e.target === ov) {
        // на мобильном модалка на весь экран — случайный клик вне не страшен
        if (window.innerWidth > 760) close();
      }
    });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var firstInput = ov.querySelector('.modal__body input, .modal__body select, .modal__body textarea');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 60);
    return { el: ov, close: close };
  };

  UI.confirm = function (opts) {
    // {title, text, okLabel, danger, onOk}
    var m = UI.modal({
      title: opts.title || 'Подтверждение',
      size: 'sm',
      body: '<p style="font-size:14px;color:var(--text-2)">' + opts.text + '</p>',
      footer:
        '<button class="btn btn--ghost" data-act="cancel">Отмена</button>' +
        '<button class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-act="ok">' + U.escapeHtml(opts.okLabel || 'Подтвердить') + '</button>'
    });
    m.el.querySelector('[data-act="cancel"]').addEventListener('click', m.close);
    m.el.querySelector('[data-act="ok"]').addEventListener('click', function () {
      m.close();
      if (opts.onOk) opts.onOk();
    });
    return m;
  };

  /* ---------- Выпадающее меню ---------- */
  UI.menu = function (anchorRect, items, opts) {
    // items: [{label, icon, danger, onClick}] или {sep:true}
    document.querySelectorAll('.menu').forEach(function (m) { m.remove(); });
    var el = document.createElement('div');
    el.className = 'menu';
    var html = '';
    items.forEach(function (it, i) {
      if (it.sep) { html += '<div class="menu__sep"></div>'; return; }
      if (it.labelHtml) { html += '<div class="menu__label">' + it.labelHtml + '</div>'; return; }
      html += '<button type="button" class="menu__item' + (it.danger ? ' menu__item--danger' : '') + '" data-i="' + i + '">' +
        (it.icon ? U.icon(it.icon, 16) : '') + '<span>' + U.escapeHtml(it.label) + '</span></button>';
    });
    el.innerHTML = html;
    document.body.appendChild(el);
    var w = el.offsetWidth, h = el.offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight;
    var x = Math.min(anchorRect.left, vw - w - 10);
    var y = anchorRect.bottom + 6;
    if (y + h > vh - 10) y = Math.max(10, anchorRect.top - h - 6);
    if (opts && opts.right) x = Math.max(10, Math.min(x, anchorRect.right - w));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (!b) return;
      el.remove();
      var it = items[+b.dataset.i];
      if (it && it.onClick) it.onClick();
    });
    setTimeout(function () {
      function off(ev) {
        if (!el.contains(ev.target)) { el.remove(); document.removeEventListener('pointerdown', off); }
      }
      document.addEventListener('pointerdown', off);
    }, 0);
    return el;
  };

  /* ---------- Чипы тегов ---------- */
  UI.chipInput = function (container, initial) {
    var tags = (initial || []).slice();
    container.classList.add('chips');
    function render() {
      container.innerHTML =
        '<div class="chips__box">' +
          tags.map(function (t, i) {
            return '<span class="chip chip--teal">' + U.escapeHtml(t) +
              '<button type="button" class="chip__x" data-i="' + i + '" aria-label="Удалить тег">' + U.icon('x', 12) + '</button></span>';
          }).join('') +
          '<input type="text" class="chips__input" placeholder="Добавить тег и Enter">' +
        '</div>';
      container.querySelectorAll('.chip__x').forEach(function (b) {
        b.addEventListener('click', function () {
          tags.splice(+b.dataset.i, 1);
          render();
        });
      });
      var inp = container.querySelector('.chips__input');
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          var v = inp.value.trim().replace(/,+$/, '');
          if (v && tags.indexOf(v) === -1 && tags.length < 8) { tags.push(v); render(); }
        } else if (e.key === 'Backspace' && !inp.value && tags.length) {
          tags.pop(); render();
        }
      });
    }
    render();
    return { get: function () { return tags.slice(); } };
  };

  /* ---------- Канбан-доска с drag-n-drop ---------- */
  UI.board = function (opts) {
    // opts: { tasks (для колонок по статусу), groups, statuses, cardHtml(t), onMove(id, toStatus), canDrag(t), emptyText, idPrefix }
    var root = document.createElement('div');
    root.className = 'board';
    var groups = opts.groups || NF.store.byStatus(opts.tasks || []);
    var html = '';
    U.statusOrder.forEach(function (st) {
      var list = groups[st] || [];
      var meta = U.statusMeta[st];
      html += '<div class="kb-col" data-status="' + st + '">' +
        '<div class="kb-col__head">' +
          '<span class="icon" style="color:' + meta.color + '"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="' + meta.color + '"/></svg></span>' +
          '<span class="kb-col__label">' + meta.label + '</span>' +
          '<span class="kb-col__count">' + list.length + '</span>' +
        '</div>' +
        '<div class="kb-col__body">';
      if (list.length) {
        list.forEach(function (t) { html += opts.cardHtml(t); });
      } else {
        html += '<div class="kb-empty">' + (opts.emptyText || 'Нет задач') + '</div>';
      }
      html += '</div></div>';
    });
    root.innerHTML = html;
    enableBoardDrag(root, opts);
    return root;
  };

  function enableBoardDrag(root, opts) {
    var drag = null;

    root.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      var card = e.target.closest('.kb-card');
      if (!card) return;
      if (e.target.closest('.kb-card__more')) return; // клик по меню кнопке
      var task = NF.store.taskById(card.dataset.id);
      if (!task) return;
      if (opts.canDrag && !opts.canDrag(task)) return;

      drag = {
        card: card, id: card.dataset.id, from: task.status,
        startX: e.clientX, startY: e.clientY, started: false,
        touch: e.pointerType !== 'mouse', targetCol: null, pid: e.pointerId
      };
      if (!drag.touch) {
        // мышью: стартуем после порога движения
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      } else {
        // тач: длинное нажатие 350 мс
        drag.timer = setTimeout(function () {
          if (drag && !drag.started) startDrag(e.clientX, e.clientY);
        }, 350);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      }
    });

    function startDrag(x, y) {
      if (!drag || drag.started) return;
      drag.started = true;
      clearTimeout(drag.timer);
      var rect = drag.card.getBoundingClientRect();
      drag.w = rect.width;
      var ghost = drag.card.cloneNode(true);
      ghost.className = 'kb-ghost';
      ghost.style.width = Math.min(rect.width, 280) + 'px';
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      moveGhost(x, y);
      drag.card.classList.add('is-dragged');
      document.body.classList.add('is-dragging');
      document.addEventListener('touchmove', blockScroll, { passive: false });
    }

    function blockScroll(e) {
      if (drag && drag.started) e.preventDefault();
    }

    function moveGhost(x, y) {
      drag.ghost.style.left = (x - Math.min(drag.w, 280) / 2) + 'px';
      drag.ghost.style.top = (y - 22) + 'px';
    }

    function colAt(x, y) {
      var els = document.elementsFromPoint(x, y);
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.classList && el.classList.contains('kb-body')) return el.closest('.kb-col');
        if (el.classList && el.classList.contains('kb-col__body')) return el.closest('.kb-col');
      }
      var under = document.elementFromPoint(x, y);
      var col = under && under.closest ? under.closest('.kb-col') : null;
      return col;
    }

    function onMove(e) {
      if (!drag) return;
      if (!drag.started) {
        var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
        if (Math.hypot(dx, dy) > 7) {
          if (drag.touch) { clearTimeout(drag.timer); drag = null; return; } // это скролл, не перетаскивание
          startDrag(e.clientX, e.clientY);
        }
        return;
      }
      e.preventDefault();
      moveGhost(e.clientX, e.clientY);
      var col = colAt(e.clientX, e.clientY);
      if (drag.targetCol && drag.targetCol !== col) drag.targetCol.classList.remove('is-target');
      if (col) col.classList.add('is-target');
      drag.targetCol = col;
      // автопрокрутка доски у краёв
      var r = root.getBoundingClientRect();
      if (e.clientX < r.left + 46) root.scrollLeft -= 9;
      else if (e.clientX > r.right - 46) root.scrollLeft += 9;
    }

    function onUp(e) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.removeEventListener('touchmove', blockScroll);
      if (!drag) return;
      clearTimeout(drag.timer);
      if (!drag.started) { drag = null; return; }
      if (drag.ghost) drag.ghost.remove();
      drag.card.classList.remove('is-dragged');
      document.body.classList.remove('is-dragging');
      if (drag.targetCol) drag.targetCol.classList.remove('is-target');
      var to = drag.targetCol ? drag.targetCol.dataset.status : null;
      var id = drag.id, from = drag.from;
      drag = null;
      if (to && to !== from && opts.onMove) opts.onMove(id, to);
    }
  }

  /* ---------- Карточка задачи (для доски) ---------- */
  UI.kanbanCard = function (t, opts) {
    opts = opts || {};
    var S = NF.store;
    var user = S.userById(t.assigneeId);
    var cCount = NF.store.taskComments(t.id).length;
    var over = U.isOverdue(t);
    var prio = U.priorityMeta[t.priority] || U.priorityMeta.medium;
    var project = opts.showProject ? S.projectById(t.projectId) : null;
    var html =
      '<div class="kb-card' + (over ? ' kb-card--over' : '') + '" data-id="' + t.id + '" style="border-left-color:' + prio.dot + '">' +
        '<div class="kb-card__title">' + U.escapeHtml(t.title) + '</div>' +
        '<div class="kb-card__row">' +
          '<span class="kb-card__id">' + S.taskCode(t) + '</span>' +
          (project ? '<span class="tag">' + U.escapeHtml(project.name.length > 26 ? project.name.slice(0, 26) + '…' : project.name) + '</span>' : '') +
          (over ? '<span class="badge badge--red">' + U.icon('alert', 12) + ' Просрочена</span>' : '') +
        '</div>' +
        '<div class="kb-card__foot">' +
          (t.deadline ? '<span class="deadline ' + U.deadlineClass(t) + '">' + U.icon('calendar', 13) + U.fmtDateSmart(t.deadline) + '</span>' : '<span class="deadline muted" style="font-size:12px">без срока</span>') +
          (cCount ? '<span class="mini-count">' + U.icon('comment', 13) + cCount + '</span>' : '') +
          (t.attachments.length ? '<span class="mini-count">' + U.icon('paperclip', 13) + t.attachments.length + '</span>' : '') +
          '<span class="kb-card__more">' + UI.avatar(user, 'sm') + '</span>' +
        '</div>' +
      '</div>';
    return html;
  };

  /* Меню быстрого переноса статуса (мобильный сценарий) */
  UI.quickMoveMenu = function (anchorEl, task, actor) {
    var S = NF.store;
    if (!S.canMoveTask(actor, task)) return;
    var items = [];
    U.statusOrder.forEach(function (st) {
      if (st === task.status) return;
      items.push({
        label: '→ ' + U.statusMeta[st].label,
        icon: st === 'done' ? 'checkCircle' : 'kanban',
        onClick: function () {
          S.updateTask(task.id, { status: st }, actor);
          NF.refresh();
          UI.toast('Статус изменён: ' + U.statusMeta[st].label);
        }
      });
    });
    var r = anchorEl.getBoundingClientRect();
    UI.menu(r, items, { right: true });
  };

  /* ---------- Вложения ---------- */
  UI.attachIcon = function (att) {
    if (att.type === 'link') return 'link';
    return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att.name || '') ? 'image' : 'file';
  };
  UI.attachRow = function (att, canDelete, onRemove) {
    var isLink = att.type === 'link';
    var inner = isLink
      ? '<a class="attach__name" href="' + U.escapeHtml(att.url) + '" target="_blank" rel="noopener">' + U.escapeHtml(att.name) + '</a>'
      : '<a class="attach__name" href="' + att.data + '" download="' + U.escapeHtml(att.name) + '">' + U.escapeHtml(att.name) + '</a>';
    var meta = isLink ? 'ссылка' : (att.size ? Math.round(att.size / 1024) + ' КБ' : 'файл');
    return '<div class="attach">' +
      '<span class="attach__ico">' + U.icon(UI.attachIcon(att), 17) + '</span>' +
      inner +
      '<span class="attach__meta">' + meta + '</span>' +
      (canDelete ? '<button type="button" class="icon-btn" style="width:30px;height:30px" data-remove>' + U.icon('trash', 15) + '</button>' : '') +
      '</div>';
  };

  /* ---------- Прочие мелочи ---------- */
  UI.emptyState = function (icon, title, text) {
    return '<div class="empty"><div class="empty__ico">' + U.icon(icon, 26) + '</div>' +
      '<div class="empty__title">' + title + '</div><div class="empty__text">' + text + '</div></div>';
  };

  UI.prioDotStyle = function (p) {
    return (U.priorityMeta[p] || U.priorityMeta.medium).dot;
  };

  /* Защита от «клика по карточке сразу после перетаскивания» */
  var _dragJust = false;
  document.addEventListener('pointerup', function () {
    if (document.body.classList.contains('is-dragging')) {
      _dragJust = true;
      setTimeout(function () { _dragJust = false; }, 180);
    }
  }, true);
  NF.dragJustHappened = function () { return _dragJust; };

  /* Форматирование ввода даты для <input type=date> */
  UI.dateInputValue = function (dateStr) { return dateStr || ''; };
})();
