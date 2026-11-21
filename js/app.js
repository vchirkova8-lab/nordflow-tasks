/* ============================================================
   NordFlow Tasks — точка входа: авторизация, каркас интерфейса,
   роутер, глобальный поиск, уведомления, темы
   ============================================================ */
(function () {
  'use strict';
  var U = NF.util, S = NF.store, UI = NF.ui;
  var app = NF.app = {};

  /* ================= Тема ================= */

  app.applyTheme = function (theme) {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem('nf_theme', theme); } catch (e) {}
  };

  /* ================= Роутер ================= */

  var SECTIONS = {
    home:          { title: 'Главная',        icon: 'home' },
    my:            { title: 'Мои задачи',     icon: 'tasks' },
    projects:      { title: 'Проекты',        icon: 'folder' },
    team:          { title: 'Команда',        icon: 'users' },
    notifications: { title: 'Уведомления',    icon: 'bell' },
    profile:       { title: 'Настройки профиля', icon: 'settings' },
    admin:         { title: 'Пользователи',   icon: 'shield' }
  };

  function parseHash() {
    var h = (location.hash || '#/home').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', a: parts[1] || null, b: parts[2] || null };
  }

  app.render = function () {
    UI.closeAllModals();
    var user = S.currentUser();
    var root = document.getElementById('app');

    if (!user) { renderAuth(root); return; }

    var r = parseHash();
    // права
    if (r.name === 'admin' && user.role !== 'admin') r = { name: 'home', a: null, b: null };
    if (['home', 'my', 'projects', 'team', 'notifications', 'profile', 'admin', 'project', 'task'].indexOf(r.name) === -1) {
      r = { name: 'home', a: null, b: null };
      location.hash = '#/home';
    }

    document.title = 'NordFlow Tasks — ' + (SECTIONS[r.name] ? SECTIONS[r.name].title : 'Проект');

    root.innerHTML = shellHtml(user, r);
    bindShell(user, r);

    var page = document.getElementById('page');
    switch (r.name) {
      case 'home': NF.views.home.render(page); break;
      case 'my': NF.views.mytasks.render(page); break;
      case 'projects': NF.views.projects.render(page); break;
      case 'project': NF.views.project.render(page, r.a, r.b); break;
      case 'task': NF.views.task.page.render(page, r.a); break;
      case 'team': NF.views.team.render(page); break;
      case 'notifications': NF.views.notifications.render(page); break;
      case 'profile': NF.views.profile.render(page); break;
      case 'admin': NF.views.admin.render(page); break;
    }
  };

  function shellHtml(user, r) {
    var unread = S.unreadCount(user.id);
    var item = function (key, href, label, icon, badge) {
      var active = (r.name === key) || (key === 'projects' && r.name === 'project') || (key === 'my' && r.name === 'task');
      return '<a class="sidebar__item' + (active ? ' is-active' : '') + '" href="' + href + '">' +
        U.icon(icon, 18) + '<span>' + label + '</span>' +
        (badge ? '<span class="sidebar__badge">' + badge + '</span>' : '') + '</a>';
    };
    var sidebar =
      '<aside class="sidebar" id="sidebar">' +
        '<a class="sidebar__brand" href="#/home">' +
          '<img src="info/Logo/logoicon.png" alt="NordFlow">' +
          '<span class="sidebar__brand-name">NordFlow<small>Tasks</small></span>' +
        '</a>' +
        '<nav class="sidebar__nav">' +
          '<div class="sidebar__section">Работа</div>' +
          item('home', '#/home', 'Главная', 'home') +
          item('my', '#/my', 'Мои задачи', 'tasks') +
          item('projects', '#/projects', 'Проекты', 'folder') +
          item('team', '#/team', 'Команда', 'users') +
          '<div class="sidebar__section">Личное</div>' +
          item('notifications', '#/notifications', 'Уведомления', 'bell', unread || '') +
          item('profile', '#/profile', 'Настройки профиля', 'settings') +
          (user.role === 'admin' ? '<div class="sidebar__section">Администрирование</div>' + item('admin', '#/admin/users', 'Пользователи', 'shield') : '') +
        '</nav>' +
        '<div class="sidebar__foot">NordFlow Tasks · v1.0 MVP</div>' +
      '</aside>';

    var topbar =
      '<header class="topbar">' +
        '<button class="icon-btn burger" id="btn-burger" aria-label="Меню">' + U.icon('menu', 21) + '</button>' +
        '<div class="search-input topbar-search">' + U.icon('search', 15) +
          '<input class="input" id="global-search" placeholder="Поиск задач, проектов, сотрудников" autocomplete="off">' +
        '</div>' +
        '<button class="icon-btn" id="btn-search-m" aria-label="Поиск">' + U.icon('search', 19) + '</button>' +
        '<span class="spacer"></span>' +
        '<button class="icon-btn" id="btn-bell" aria-label="Уведомления">' + U.icon('bell', 19) + (unread ? '<span class="dot">' + unread + '</span>' : '') + '</button>' +
        '<button class="icon-btn" id="btn-theme" aria-label="Сменить тему">' + U.icon(user.theme === 'dark' ? 'sun' : 'moon', 19) + '</button>' +
        '<button class="icon-btn" id="btn-user" style="width:auto;padding:0 6px;gap:8px;display:inline-flex" aria-label="Профиль">' +
          UI.avatar(user, 'sm') + '<span style="font-size:13px;font-weight:600" class="hide-sm">' + U.escapeHtml(user.name.split(' ')[0]) + '</span>' +
        '</button>' +
      '</header>';

    return '<div class="shell">' + sidebar +
      '<div class="main">' + topbar +
      '<main class="page" id="page"></main>' +
      '</div></div>';
  }

  function bindShell(user, r) {
    /* --- мобильное меню --- */
    var sidebar = document.getElementById('sidebar');
    var burger = document.getElementById('btn-burger');
    if (burger) {
      burger.addEventListener('click', function () {
        var open = sidebar.classList.toggle('is-open');
        var scrim = document.querySelector('.sidebar-scrim');
        if (open && !scrim) {
          scrim = document.createElement('div');
          scrim.className = 'sidebar-scrim';
          document.body.appendChild(scrim);
          scrim.addEventListener('click', closeDrawer);
        } else if (!open && scrim) scrim.remove();
      });
    }
    function closeDrawer() {
      sidebar.classList.remove('is-open');
      var scrim = document.querySelector('.sidebar-scrim');
      if (scrim) scrim.remove();
    }
    sidebar.querySelectorAll('.sidebar__item').forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });

    /* --- тема --- */
    document.getElementById('btn-theme').addEventListener('click', function () {
      var next = user.theme === 'dark' ? 'light' : 'dark';
      S.updateProfile(user.id, { theme: next });
      app.applyTheme(next);
      NF.render();
    });

    /* --- профиль --- */
    document.getElementById('btn-user').addEventListener('click', function (e) {
      var rect = e.currentTarget.getBoundingClientRect();
      UI.menu(rect, [
        { labelHtml: '<div class="row" style="gap:10px">' + UI.avatar(user, '') + '<div><b>' + U.escapeHtml(user.name) + '</b><div style="font-size:11.5px;color:var(--text-3)">' + U.roleMeta[user.role].label + '</div></div></div>' },
        { sep: true },
        { label: 'Настройки профиля', icon: 'settings', onClick: function () { NF.go('#/profile'); } },
        { label: 'Выйти из аккаунта', icon: 'logout', danger: true, onClick: app.logout }
      ], { right: true });
    });

    /* --- уведомления --- */
    document.getElementById('btn-bell').addEventListener('click', function (e) {
      var rect = e.currentTarget.getBoundingClientRect();
      var list = S.myNotifications(user.id).slice(0, 8);
      var unreadN = S.unreadCount(user.id);
      var html = '<div class="row" style="padding:2px 4px 0"><span class="bell-pop__title">Уведомления</span><span class="spacer"></span>' +
        (unreadN ? '<button class="link-btn" id="bp-readall">Прочитать все</button>' : '') + '</div>';
      if (!list.length) {
        html += '<div class="search-pop__empty">Уведомлений пока нет</div>';
      } else {
        list.forEach(function (n) {
          var meta = NF.NOTIF_META[n.type] || NF.NOTIF_META.comment;
          var task = n.taskId ? S.taskById(n.taskId) : null;
          html += '<div class="notif' + (n.read ? '' : ' is-unread') + '" data-id="' + n.id + '" data-task="' + (task ? task.id : '') + '">' +
            '<span class="notif__ico" style="background:' + meta.bg + ';color:' + meta.color + ';width:30px;height:30px">' + U.icon(meta.ico, 14) + '</span>' +
            '<div class="notif__text" style="font-size:12.5px">' + U.escapeHtml(n.text) +
            '<div class="notif__time">' + U.timeAgo(n.createdAt) + '</div></div>' +
          '</div>';
        });
      }
      html += '<div class="menu__sep"></div><div style="padding:6px 10px 4px"><button class="btn btn--soft btn--sm btn--block" id="bp-all">Все уведомления</button></div>';

      var pop = document.createElement('div');
      pop.className = 'menu bell-pop';
      pop.innerHTML = html;
      document.body.appendChild(pop);
      var w = pop.offsetWidth;
      pop.style.left = Math.max(10, Math.min(rect.right - w, window.innerWidth - w - 10)) + 'px';
      pop.style.top = rect.bottom + 8 + 'px';

      pop.querySelector('#bp-all').addEventListener('click', function () { pop.remove(); NF.go('#/notifications'); });
      var ra = pop.querySelector('#bp-readall');
      if (ra) ra.addEventListener('click', function () {
        S.markAllRead(user.id); pop.remove(); NF.render();
      });
      pop.querySelectorAll('.notif').forEach(function (node) {
        node.addEventListener('click', function () {
          S.markNotifRead(node.dataset.id);
          pop.remove();
          if (node.dataset.task) NF.go('#/task/' + node.dataset.task);
          else NF.render();
        });
      });
      setTimeout(function () {
        function off(ev) { if (!pop.contains(ev.target) && ev.target.id !== 'btn-bell') { pop.remove(); document.removeEventListener('pointerdown', off); } }
        document.addEventListener('pointerdown', off);
      }, 0);
    });

    /* --- глобальный поиск --- */
    var searchInput = document.getElementById('global-search');
    var searchBtnM = document.getElementById('btn-search-m');
    if (searchInput) bindInlineSearch(searchInput, user);
    if (searchBtnM) searchBtnM.addEventListener('click', function () {
      openMobileSearch(user);
    });
  }

  /* ---------- Поиск ---------- */

  function searchAll(user, q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return null;
    var res = { projects: [], tasks: [], users: [] };
    S.visibleProjects(user).forEach(function (p) {
      if (p.name.toLowerCase().indexOf(q) !== -1 || (p.description || '').toLowerCase().indexOf(q) !== -1) res.projects.push(p);
    });
    S.tasksVisible(user).forEach(function (t) {
      if (t.title.toLowerCase().indexOf(q) !== -1 || S.taskCode(t).toLowerCase().indexOf(q) !== -1) res.tasks.push(t);
    });
    res.tasks.sort(function (a, b) {
      var oa = U.isOverdue(a) ? 0 : 1, ob = U.isOverdue(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
    });
    S.db().users.forEach(function (u) {
      if (u.name.toLowerCase().indexOf(q) !== -1 || (u.position || '').toLowerCase().indexOf(q) !== -1 || u.email.toLowerCase().indexOf(q) !== -1) res.users.push(u);
    });
    return res;
  }

  function resultsHtml(user, res) {
    if (!res) return '<div class="search-pop__empty">Введите минимум 2 символа</div>';
    if (!res.projects.length && !res.tasks.length && !res.users.length) {
      return '<div class="search-pop__empty">Ничего не найдено</div>';
    }
    var html = '';
    if (res.projects.length) {
      html += '<div class="search-pop__group">Проекты</div>';
      res.projects.slice(0, 5).forEach(function (p) {
        var pm = S.userById(p.managerId);
        html += '<div class="search-pop__item" data-go="p:' + p.id + '">' +
          '<span class="feed__ico">' + U.icon('folder', 15) + '</span>' +
          '<div style="min-width:0"><div class="search-pop__title">' + U.escapeHtml(p.name) + '</div>' +
          '<div class="search-pop__sub">Руководитель: ' + U.escapeHtml(pm ? pm.name : '—') + '</div></div>' +
          U.projectStatusBadge(p.status) + '</div>';
      });
    }
    if (res.tasks.length) {
      html += '<div class="search-pop__group">Задачи</div>';
      res.tasks.slice(0, 7).forEach(function (t) {
        var p = S.projectById(t.projectId);
        html += '<div class="search-pop__item" data-go="t:' + t.id + '">' +
          '<span class="feed__ico">' + U.icon('tasks', 15) + '</span>' +
          '<div style="min-width:0"><div class="search-pop__title">' + U.escapeHtml(t.title) + '</div>' +
          '<div class="search-pop__sub">' + S.taskCode(t) + (p ? ' · ' + U.escapeHtml(p.name) : '') + '</div></div>' +
          U.statusBadge(t.status) + '</div>';
      });
    }
    if (res.users.length) {
      html += '<div class="search-pop__group">Сотрудники</div>';
      res.users.slice(0, 5).forEach(function (u) {
        html += '<div class="search-pop__item" data-go="u:' + u.id + '">' +
          UI.avatar(u, 'sm') +
          '<div style="min-width:0"><div class="search-pop__title">' + U.escapeHtml(u.name) + '</div>' +
          '<div class="search-pop__sub">' + U.escapeHtml(u.position || '') + ' · ' + U.escapeHtml(u.email) + '</div></div>' +
        '</div>';
      });
    }
    return html;
  }

  function bindGoHandler(pop, user) {
    pop.addEventListener('click', function (e) {
      var item = e.target.closest('[data-go]');
      if (!item) return;
      var kind = item.dataset.go[0], id = item.dataset.go.slice(2);
      pop.remove();
      document.querySelectorAll('.search-pop').forEach(function (x) { if (x !== pop) x.remove(); });
      if (kind === 'p') NF.go('#/project/' + id + '/board');
      else if (kind === 't') NF.go('#/task/' + id);
      else if (kind === 'u') {
        NF.go('#/team');
        setTimeout(function () {
          if (NF.views.team.openMember) NF.views.team.openMember(id);
        }, 120);
      }
    });
  }

  function bindInlineSearch(input, user) {
    var pop = null;
    function close() { if (pop) { pop.remove(); pop = null; } }
    input.addEventListener('input', U.debounce(function () {
      var res = searchAll(user, input.value);
      close();
      if (!res) return;
      pop = document.createElement('div');
      pop.className = 'search-pop';
      pop.innerHTML = resultsHtml(user, res);
      document.body.appendChild(pop);
      var r = input.getBoundingClientRect();
      pop.style.left = Math.max(10, r.left) + 'px';
      pop.style.top = r.bottom + 8 + 'px';
      if (window.innerWidth < 760) { pop.style.left = '8px'; pop.style.right = '8px'; }
      bindGoHandler(pop, user);
    }, 180));
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); input.blur(); } });
    setTimeout(function () {
      function off(ev) {
        if (pop && !pop.contains(ev.target) && ev.target !== input) { close(); document.removeEventListener('pointerdown', off); }
      }
      document.addEventListener('pointerdown', off);
    }, 0);
  }

  function openMobileSearch(user) {
    var m = UI.modal({
      title: 'Поиск',
      body: '<div class="search-input">' + U.icon('search', 15) +
        '<input class="input" id="ms-input" placeholder="Задачи, проекты, сотрудники…" autocomplete="off"></div>' +
        '<div id="ms-results" style="margin-top:10px"></div>',
      footer: '<button class="btn btn--ghost" data-msclose>Закрыть</button>'
    });
    m.el.querySelector('[data-msclose]').addEventListener('click', m.close);
    var inp = m.el.querySelector('#ms-input');
    var box = m.el.querySelector('#ms-results');
    setTimeout(function () { inp.focus(); }, 80);
    inp.addEventListener('input', U.debounce(function () {
      var res = searchAll(user, inp.value);
      box.innerHTML = resultsHtml(user, res);
      bindGoHandler(box, user);
      box.addEventListener('click', function () { m.close(); });
    }, 160));
  }

  /* ================= Авторизация ================= */

  function renderAuth(root) {
    document.title = 'NordFlow Tasks — вход';
    var demoUsers = [
      { id: 'u1', label: 'Анна Волкова', sub: 'Администратор' },
      { id: 'u2', label: 'Максим Орлов', sub: 'Руководитель проектов' },
      { id: 'u3', label: 'Елена Соколова', sub: 'Сотрудник' }
    ];
    root.innerHTML =
      '<div class="auth">' +
        '<div class="auth__hero">' +
          '<div class="auth__hero-bg" style="background-image:url(\'info/Logo/coverhero.png\')"></div>' +
          '<div class="auth__hero-scrim"></div>' +
          '<div class="auth__brand">' +
            '<img src="info/Logo/logoicon.png" alt="NordFlow">' +
            '<div class="auth__brand-name">NordFlow<small>Tasks</small></div>' +
          '</div>' +
          '<div>' +
            '<h1 class="auth__hero-title">Все задачи компании в одном потоке</h1>' +
            '<p class="auth__hero-sub">Проекты, Kanban-доски, дедлайны и обсуждения — без сложности Jira. Войдите, чтобы продолжить работу.</p>' +
          '</div>' +
          '<div class="auth__hero-foot">© 2026 NordFlow · внутренний сервис управления задачами</div>' +
        '</div>' +
        '<div class="auth__form-wrap"><div class="auth__form">' +
          '<div class="auth__card">' +
            '<div class="auth__title">Вход в систему</div>' +
            '<div class="auth__sub">Используйте корпоративную почту и пароль</div>' +
            '<div id="auth-error" hidden></div>' +
            '<form id="auth-form" novalidate>' +
              '<div class="field"><label class="field__label">Электронная почта</label>' +
                '<input class="input" type="email" id="auth-email" placeholder="name@nordflow.io" autocomplete="username"></div>' +
              '<div class="field"><label class="field__label">Пароль</label>' +
                '<div class="input-wrap"><input class="input" type="password" id="auth-pass" placeholder="••••••••" autocomplete="current-password">' +
                '<button type="button" class="icon-btn eye" id="auth-eye" aria-label="Показать пароль">' + U.icon('eye', 17) + '</button></div></div>' +
              '<button class="btn btn--cta btn--lg btn--block" type="submit">' + U.icon('logout', 17) + ' Войти</button>' +
            '</form>' +
            '<div class="auth__demo">' +
              '<div class="auth__demo-label">Демо-доступы · пароль nordflow</div>' +
              '<div class="auth__demo-chips">' +
                demoUsers.map(function (d) {
                  var u = S.userById(d.id);
                  return '<button type="button" class="demo-chip" data-u="' + d.id + '">' + UI.avatar(u, 'sm') +
                    '<span>' + d.label + '<small>' + d.sub + '</small></span></button>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div></div>' +
      '</div>';

    var form = document.getElementById('auth-form');
    var email = document.getElementById('auth-email');
    var pass = document.getElementById('auth-pass');
    var errBox = document.getElementById('auth-error');
    var eye = document.getElementById('auth-eye');

    eye.addEventListener('click', function () {
      var show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      eye.innerHTML = U.icon(show ? 'eyeOff' : 'eye', 17);
      pass.focus();
    });

    document.querySelectorAll('.demo-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var u = S.userById(chip.dataset.u);
        email.value = u.email;
        pass.value = 'nordflow';
        errBox.hidden = true;
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit'));
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = email.value.trim(), pw = pass.value;
      if (!/^\S+@\S+\.\S+$/.test(em)) { showErr('Введите электронную почту в формате name@nordflow.io'); return; }
      if (!pw) { showErr('Введите пароль'); return; }
      var u = S.login(em, pw);
      if (!u) { showErr('Неверная электронная почта или пароль'); pass.value = ''; return; }
      S.setSession(u.id);
      app.applyTheme(u.theme || 'light');
      NF.render();
      UI.toast('Добро пожаловать, ' + u.name.split(' ')[0] + '!', 'ok');
    });

    function showErr(msg) {
      errBox.hidden = false;
      errBox.className = 'auth__error';
      errBox.innerHTML = U.icon('alert', 16) + '<span>' + msg + '</span>';
    }
    setTimeout(function () { email.focus(); }, 100);
  }

  /* ================= Выход ================= */

  app.logout = function () {
    S.clearSession();
    app.applyTheme('light');
    location.hash = '#/home';
    NF.render();
    UI.toast('Вы вышли из аккаунта');
  };

  /* ================= Навигация ================= */

  NF.go = function (hash) {
    if (location.hash === hash) app.render();
    else location.hash = hash;
  };
  NF.render = function () { app.render(); };
  NF.refresh = function () { app.render(); };
  NF.closeAllModals = UI.closeAllModals;
  app.toast = UI.toast;

  /* ================= Запуск ================= */

  function boot() {
    S.load();
    var savedTheme = 'light';
    try { savedTheme = localStorage.getItem('nf_theme') || 'light'; } catch (e) {}
    app.applyTheme(savedTheme);
    var user = S.currentUser();
    if (user && user.theme) app.applyTheme(user.theme);

    S.scanDeadlines();
    setInterval(function () { S.scanDeadlines(); }, 60000);

    window.addEventListener('hashchange', app.render);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!UI.closeTopModal()) {
          document.querySelectorAll('.menu, .search-pop').forEach(function (m) { m.remove(); });
        }
      }
    });
    app.render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
