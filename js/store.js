/* ============================================================
   NordFlow Tasks — слой данных: localStorage, демо-данные,
   права доступа, история изменений, уведомления
   ============================================================ */
(function () {
  'use strict';
  window.NF = window.NF || {};
  var U = NF.util;

  var DB_KEY = 'nf_tasks_db_v1';
  var SESSION_KEY = 'nf_tasks_session_v1';
  var DAY = 86400000;

  var S = NF.store = {};
  var db = null;

  /* ================= Демо-данные ================= */

  function seedDB() {
    var now = Date.now();
    var T = U.todayStr();
    function D(n) { return U.addDaysStr(T, n); }          // дата-строка со смещением
    function ts(daysAgo, hoursShift) { return now - daysAgo * DAY + (hoursShift || 0) * 3600000; }

    var users = [
      { id: 'u1', name: 'Анна Волкова',   position: 'Операционный директор', email: 'anna.volkova@nordflow.io',   password: 'nordflow', role: 'admin',    theme: 'light' },
      { id: 'u2', name: 'Максим Орлов',   position: 'Руководитель проекта',  email: 'maksim.orlov@nordflow.io',  password: 'nordflow', role: 'manager',  theme: 'light' },
      { id: 'u3', name: 'Елена Соколова', position: 'Дизайнер',              email: 'elena.sokolova@nordflow.io', password: 'nordflow', role: 'employee', theme: 'light' },
      { id: 'u4', name: 'Илья Морозов',   position: 'Frontend-разработчик',  email: 'ilya.morozov@nordflow.io',  password: 'nordflow', role: 'employee', theme: 'dark'  },
      { id: 'u5', name: 'Виктор Лебедев', position: 'Backend-разработчик',   email: 'viktor.lebedev@nordflow.io', password: 'nordflow', role: 'employee', theme: 'light' },
      { id: 'u6', name: 'Ольга Крылова',  position: 'Маркетолог',            email: 'olga.krylova@nordflow.io',  password: 'nordflow', role: 'manager',  theme: 'light' },
      { id: 'u7', name: 'Дмитрий Фролов', position: 'Тестировщик',           email: 'dmitry.frolov@nordflow.io', password: 'nordflow', role: 'employee', theme: 'light' },
      { id: 'u8', name: 'Мария Белова',   position: 'Аналитик',              email: 'maria.belova@nordflow.io',  password: 'nordflow', role: 'employee', theme: 'light' }
    ];

    var projects = [
      {
        id: 'p1', name: 'Сайт для клиента «GreenStone»',
        description: 'Корпоративный сайт с каталогом продукции и формой заявки для клиента GreenStone. Дизайн, вёрстка, backend, наполнение и запуск.',
        managerId: 'u2', memberIds: ['u2', 'u3', 'u4', 'u5', 'u7', 'u8'],
        startDate: D(-32), endDate: D(38), status: 'active', allowMemberCreate: true, createdAt: ts(33)
      },
      {
        id: 'p2', name: 'Запуск рекламной кампании NordFlow',
        description: 'Рекламная кампания студии: позиционирование, баннеры, тексты, посадочные страницы, аналитика и контент-план на месяц.',
        managerId: 'u6', memberIds: ['u1', 'u3', 'u4', 'u6', 'u7', 'u8'],
        startDate: D(-14), endDate: D(26), status: 'active', allowMemberCreate: true, createdAt: ts(15)
      },
      {
        id: 'p3', name: 'Внутренняя автоматизация отдела продаж',
        description: 'Аудит процессов продаж, выбор CRM-платформы, интеграция с телефонией и отчётность по лидам.',
        managerId: 'u2', memberIds: ['u2', 'u4', 'u5', 'u8'],
        startDate: D(-10), endDate: D(70), status: 'planned', allowMemberCreate: false, createdAt: ts(11)
      }
    ];

    /* [id, projectId, title, status, priority, assigneeId, reporterId,
        createdDaysAgo, deadlineOffset(или null), tags, description] */
    var T_ = [
      ['t1',  'p1', 'Согласовать структуру и прототип главной страницы', 'done',    'medium',   'u3', 'u2', 32, -24, ['дизайн', 'прототип'], 'Собрать структуру страниц, согласовать прототип главной с клиентом и зафиксировать правки перед началом дизайна.'],
      ['t2',  'p1', 'Дизайн главной страницы', 'done',     'high',     'u3', 'u2', 30, -20, ['дизайн'], 'Отрисовать главную страницу по брендбуку GreenStone: обложка, блок услуг, каталог, контакты.'],
      ['t3',  'p1', 'Дизайн внутренних страниц (каталог, контакты)', 'inwork',   'high',     'u3', 'u2', 18, 4,   ['дизайн'], 'Внутренние страницы каталога и контактов в стиле главной. Передать в вёрстку после согласования.'],
      ['t4',  'p1', 'Вёрстка главной страницы', 'review',   'high',     'u4', 'u2', 16, -1,  ['frontend'], 'Адаптивная вёрстка главной по макету. Проверить в Chrome, Safari и на мобильном разрешении.'],
      ['t5',  'p1', 'Вёрстка страницы каталога', 'inwork',   'medium',   'u4', 'u2', 12, 6,   ['frontend'], 'Сетка карточек товаров, фильтры и пагинация по макету каталога.'],
      ['t6',  'p1', 'Подключение формы заявки к CRM', 'planned',  'high',     'u5', 'u2', 10, 9,   ['backend', 'интеграции'], 'Передавать заявки с сайта в CRM клиента через webhook, добавить защиту от спама.'],
      ['t7',  'p1', 'Настройка хостинга и домена', 'backlog',  'medium',   'u5', 'u2', 9,  18,  ['devops'], 'Подготовить окружение, SSL-сертификат и настроить деплой.'],
      ['t8',  'p1', 'Наполнение каталога контентом', 'backlog',  'low',      'u8', 'u2', 8,  21,  ['контент'], 'Загрузить карточки товаров и описания от клиента в каталог.'],
      ['t9',  'p1', 'Тестирование форм и валидации', 'planned',  'medium',   'u7', 'u2', 7,  12,  ['тестирование'], 'Проверить все формы сайта: заявка, подписка, обратный звонок. Оформить баг-репорты.'],
      ['t10', 'p1', 'Кроссбраузерное тестирование', 'backlog',  'low',      'u7', 'u2', 6,  25,  ['тестирование'], 'Chrome, Firefox, Safari, Edge + мобильные браузеры.'],
      ['t11', 'p1', 'SEO-требования к шаблонам страниц', 'done',     'medium',   'u8', 'u2', 20, -15, ['seo'], 'Мета-теги, семантика заголовков, микроразметка для шаблонов сайта.'],
      ['t12', 'p1', 'Мобильная адаптация страниц', 'planned',  'high',     'u4', 'u2', 5,  8,   ['frontend'], 'Довести адаптив внутренних страниц: меню, таблицы, слайдеры.'],
      ['t13', 'p1', 'Обновить логотип в подвале сайта', 'inwork',   'low',      'u4', 'u4', 2,  -3,  ['frontend'], 'Клиент прислал обновлённый логотип — заменить в подвале и в favicon.'],
      ['t14', 'p1', 'Собрать обратную связь по дизайну от клиента', 'review', 'medium', 'u2', 'u1', 4, 2,  ['дизайн'], 'Собрать замечания клиента по текущим макетам и оформить список правок.'],

      ['t15', 'p2', 'Сформировать позиционирование кампании', 'done',    'high',     'u8', 'u6', 13, -8, ['маркетинг'], 'Сформулировать позиционирование и ключевые сообщения кампании NordFlow.'],
      ['t16', 'p2', 'Тексты для рекламных объявлений', 'review',   'medium',   'u8', 'u6', 9,  1,  ['контент'], 'Тексты для объявлений в соцсетях и контекстной рекламы — 5 вариантов на сегмент.'],
      ['t17', 'p2', 'Дизайн баннеров для соцсетей', 'inwork',   'high',     'u3', 'u6', 8,  3,   ['дизайн'], 'Серия баннеров 1080×1080 и 1080×1350 в фирменном стиле.'],
      ['t18', 'p2', 'Смета рекламного бюджета', 'inwork',   'critical', 'u6', 'u1', 6,  -2,  ['бюджет'], 'Посчитать бюджет по каналам, заложить резерв на тесты. Согласовать с Анной.'],
      ['t19', 'p2', 'Подготовить посадочные страницы под кампанию', 'planned', 'medium', 'u4', 'u6', 5, 10, ['frontend'], 'Собрать лендинги под два сегмента кампании из готовых блоков.'],
      ['t20', 'p2', 'Настроить аналитику и цели в Метрике', 'backlog',  'low',      'u8', 'u6', 4,  14,  ['аналитика'], 'Цели, события и отчёты по источникам для посадочных страниц.'],
      ['t21', 'p2', 'Согласовать публикации с юридическим отделом', 'planned', 'medium', 'u1', 'u6', 3, 5, ['документы'], 'Проверить формулировки в рекламных материалах перед публикацией.'],
      ['t22', 'p2', 'Составить контент-план на месяц', 'inwork',   'high',     'u8', 'u6', 9,  -4,  ['контент'], 'Контент-план публикаций на следующий месяц по позиционированию кампании.'],
      ['t23', 'p2', 'Бриф для видеопродакшена', 'done',     'low',      'u6', 'u6', 6,  -2,  ['маркетинг'], 'Составить бриф для съёмки короткого промо-ролика студии.'],

      ['t24', 'p3', 'Аудит текущего процесса продаж', 'inwork',   'high',     'u8', 'u2', 10, 2,   ['аналитика'], 'Интервью с отделом продаж, карта процесса, узкие места. Итог — отчёт с рекомендациями.'],
      ['t25', 'p3', 'Выбор платформы для интеграции CRM', 'planned',  'critical', 'u5', 'u2', 7,  7,   ['crm'], 'Сравнить кандидатов по критериям: цена, интеграции, поддержка. Оформить решение.'],
      ['t26', 'p3', 'Прототип отчёта по лидам', 'backlog',  'medium',   'u8', 'u2', 5,  20,  ['аналитика'], 'Макет отчёта: источники лидов, конверсии, динамика по неделям.'],
      ['t27', 'p3', 'Требования к интеграции с телефонией', 'backlog',  'medium',   'u5', 'u2', 3,  25,  ['crm'], 'Собрать требования к интеграции: логирование звонков, карточка клиента.'],
      ['t28', 'p3', 'Оценка сроков внедрения', 'planned',  'high',     'u2', 'u1', 2,  16,  ['планирование'], 'Оценить сроки по этапам внедрения и согласовать план с руководством.']
    ];

    var tasks = T_.map(function (r) {
      var status = r[3];
      var steps = flowSteps(status);
      return {
        id: r[0], num: null, title: r[2], description: r[10],
        projectId: r[1], status: status, priority: r[4],
        assigneeId: r[5], reporterId: r[6],
        createdAt: ts(r[7], -2), updatedAt: ts(Math.max(r[7] - 1, 0), -1),
        deadline: r[8] === null ? null : D(r[8]),
        tags: r[9],
        attachments: []
      };
    });
    // номера задач: единая сквозная нумерация NDF-101…
    tasks.forEach(function (t, i) { t.num = 101 + i; });

    function flowSteps(status) {
      if (status === 'done') return ['inwork', 'review', 'done'];
      if (status === 'review') return ['inwork', 'review'];
      if (status === 'inwork') return ['inwork'];
      if (status === 'planned') return ['planned'];
      return [];
    }

    /* История изменений: создается по «живому» сценарию */
    var history = [];
    function hAdd(task, userId, field, from, to, tsVal) {
      var u = users.find(function (x) { return x.id === userId; });
      history.push({ id: U.uid('h'), taskId: task.id, userId: userId, userName: u ? u.name : '',
        field: field, from: from, to: to, ts: tsVal });
    }
    tasks.forEach(function (t) {
      var r = T_.find(function (x) { return x[0] === t.id; });
      var cAgo = r[7];
      hAdd(t, t.reporterId, 'create', null, null, t.createdAt);
      var steps = flowSteps(t.status);
      var span = Math.max(1, cAgo - 1) * DAY;
      steps.forEach(function (st, i) {
        var at = t.createdAt + span * (0.2 + i * 0.25);
        if (at > now - 2 * 3600000) at = now - 2 * 3600000 - i * 3600000;
        hAdd(t, t.assigneeId === t.reporterId ? t.reporterId : (i === 0 ? t.reporterId : t.assigneeId),
          'status', st === 'inwork' ? 'Бэклог' : (st === 'review' ? 'В работе' : (st === 'done' ? 'На проверке' : (st === 'planned' ? 'Бэклог' : 'Запланировано'))), U.statusMeta[st].label, at);
      });
    });
    // несколько явных правок для истории
    (function () {
      var t4 = tasks.find(function (x) { return x.id === 't4'; });
      hAdd(t4, 'u2', 'deadline', '18 ноя', '20 ноя', now - 4 * DAY);
      var t18 = tasks.find(function (x) { return x.id === 't18'; });
      hAdd(t18, 'u1', 'priority', 'Высокий', 'Критический', now - 3 * DAY);
      var t22 = tasks.find(function (x) { return x.id === 't22'; });
      hAdd(t22, 'u6', 'deadline', '15 ноя', '17 ноя', now - 6 * DAY);
      var t5 = tasks.find(function (x) { return x.id === 't5'; });
      hAdd(t5, 'u2', 'assignee', 'Елена Соколова', 'Илья Морозов', now - 5 * DAY);
      var t12 = tasks.find(function (x) { return x.id === 't12'; });
      hAdd(t12, 'u2', 'tags', '', 'frontend, адаптив', now - 3 * DAY);
    })();

    /* Комментарии */
    function cAdd(taskId, authorId, text, daysAgo, hours) {
      var u = users.find(function (x) { return x.id === authorId; });
      return { id: U.uid('c'), taskId: taskId, authorId: authorId, authorName: u ? u.name : '',
        text: text, createdAt: ts(daysAgo, hours || 0), updatedAt: 0 };
    }
    var comments = [
      cAdd('t4', 'u2', 'Клиент попросил изменить оттенок кнопки в шапке на фирменный зелёный — учти это в вёрстке.', 5, 3),
      cAdd('t4', 'u7', 'Принял, готов тестировать. Как закончишь правки — напиши.', 4, 5),
      cAdd('t4', 'u4', 'Правки внёс, отправил на проверку. На мобильном проверил на 360px и 414px.', 2, 4),
      cAdd('t3', 'u2', 'Отправила прототип клиенту — ждём замечания до конца недели.', 6, 2),
      cAdd('t18', 'u1', 'Жду смету по каналам. Не забудь резерв на тестовые показы — минимум 10%.', 3, 6),
      cAdd('t22', 'u6', 'Мария, опирайся на позиционирование из t15, тональность — как в брендбуке.', 5, 1),
      cAdd('t22', 'u8', 'Черновик плана готов, выкладываю на проверку сегодня.', 1, 2),
      cAdd('t24', 'u8', 'Провёл 5 интервью с отделом продаж. Основная боль — потеря лидов между этапами.', 2, 3),
      cAdd('t17', 'u6', 'Для баннеров возьми тизер про «MVP за 6 недель» — он лучше всего кликается.', 2, 7)
    ];

    /* Уведомления (демо, часть непрочитанных) */
    var notifications = [
      { id: U.uid('n'), userId: 'u4', type: 'assigned', text: 'Вам назначена задача NDF-119 «Подготовить посадочные страницы под кампанию»', taskId: 't19', createdAt: ts(2, 1), read: false, key: null },
      { id: U.uid('n'), userId: 'u4', type: 'comment',  text: 'Новый комментарий к задаче NDF-104 «Вёрстка главной страницы» · Дмитрий Фролов', taskId: 't4', createdAt: ts(2, 4), read: false, key: null },
      { id: U.uid('n'), userId: 'u2', type: 'status',   text: 'Статус NDF-104 «Вёрстка главной страницы» изменён: «В работе» → «На проверке» · Илья Морозов', taskId: 't4', createdAt: ts(2, 4), read: false, key: null },
      { id: U.uid('n'), userId: 'u6', type: 'comment',  text: 'Новый комментарий к задаче NDF-122 «Составить контент-план на месяц» · Мария Белова', taskId: 't22', createdAt: ts(1, 2), read: false, key: null },
      { id: U.uid('n'), userId: 'u8', type: 'comment',  text: 'Новый комментарий к задаче NDF-122 «Составить контент-план на месяц» · Ольга Крылова', taskId: 't22', createdAt: ts(5, 1), read: true,  key: null },
      { id: U.uid('n'), userId: 'u5', type: 'assigned', text: 'Вам назначена задача NDF-106 «Подключение формы заявки к CRM»', taskId: 't6', createdAt: ts(3, 2), read: true,  key: null },
      { id: U.uid('n'), userId: 'u3', type: 'deadline', text: 'Срок задачи NDF-103 «Дизайн внутренних страниц (каталог, контакты)» перенесён', taskId: 't3', createdAt: ts(4, 3), read: true,  key: null }
    ];

    return {
      version: 1,
      createdAt: now,
      seq: { task: 129 },
      users: users,
      deletedUsers: {},
      projects: projects,
      tasks: tasks,
      comments: comments,
      history: history,
      notifications: notifications
    };
  }

  /* ================= Загрузка и сохранение ================= */

  S.load = function () {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) {
        db = JSON.parse(raw);
        if (!db || db.version !== 1 || !db.users || !db.users.length) db = seedDB();
      } else {
        db = seedDB();
      }
    } catch (e) {
      db = seedDB();
    }
    S.save();
  };
  S.save = function () {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Не удалось сохранить данные (переполнено хранилище?)', e);
      if (NF.app && NF.app.toast) NF.app.toast('Не удалось сохранить данные: хранилище переполнено', 'error');
    }
  };
  S.resetDemo = function () {
    db = seedDB();
    S.save();
  };
  S.db = function () { return db; };

  /* ================= Сессия ================= */

  S.getSession = function () {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  };
  S.setSession = function (userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: userId, at: Date.now() }));
  };
  S.clearSession = function () { localStorage.removeItem(SESSION_KEY); };
  S.currentUser = function () {
    var s = S.getSession();
    if (!s) return null;
    var u = S.userById(s.userId);
    if (!u) { S.clearSession(); return null; }
    return u;
  };
  S.login = function (email, password) {
    var e = String(email || '').trim().toLowerCase();
    var u = db.users.find(function (x) { return x.email.toLowerCase() === e && x.password === password; });
    return u || null;
  };

  /* ================= Доступ по пользователям ================= */

  S.userById = function (id) {
    return db.users.find(function (u) { return u.id === id; }) || null;
  };
  S.userName = function (id) {
    var u = S.userById(id);
    return u ? u.name : (db.deletedUsers[id] || 'Удалённый пользователь');
  };
  S.userByEmail = function (email) {
    var e = String(email || '').trim().toLowerCase();
    return db.users.find(function (u) { return u.email.toLowerCase() === e; }) || null;
  };

  /* ================= Проекты и доступ ================= */

  S.projectById = function (id) { return db.projects.find(function (p) { return p.id === id; }) || null; };
  S.taskById = function (id) { return db.tasks.find(function (t) { return t.id === id; }) || null; };
  S.taskCode = function (t) { return 'NDF-' + t.num; };

  S.visibleProjects = function (user) {
    if (!user) return [];
    if (user.role === 'admin') return db.projects.slice();
    return db.projects.filter(function (p) {
      return p.managerId === user.id || (p.memberIds || []).indexOf(user.id) !== -1;
    });
  };
  S.canSeeProject = function (user, projectId) {
    return S.visibleProjects(user).some(function (p) { return p.id === projectId; });
  };
  S.projectTasks = function (projectId) {
    return db.tasks.filter(function (t) { return t.projectId === projectId; });
  };
  S.tasksVisible = function (user) {
    var ids = {};
    S.visibleProjects(user).forEach(function (p) { ids[p.id] = 1; });
    return db.tasks.filter(function (t) { return ids[t.projectId]; });
  };

  /* ================= Права ================= */

  S.isManagerOf = function (user, project) {
    return !!user && !!project && (user.role === 'admin' || (user.role === 'manager' && project.managerId === user.id));
  };
  S.canCreateProject = function (user) { return !!user && user.role === 'admin'; };
  S.canEditProject = function (user) { return !!user && user.role === 'admin'; };
  S.canCreateTask = function (user, project) {
    if (!user || !project) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager') return project.managerId === user.id;
    return !!project.allowMemberCreate && (project.memberIds || []).indexOf(user.id) !== -1;
  };
  S.canEditTask = function (user, task) {
    // полное редактирование полей
    if (!user || !task) return false;
    if (user.role === 'admin') return true;
    var p = S.projectById(task.projectId);
    if (user.role === 'manager') return !!p && p.managerId === user.id;
    return false;
  };
  S.canMoveTask = function (user, task) {
    // смена статуса
    if (!user || !task) return false;
    if (S.canEditTask(user, task)) return true;
    return task.assigneeId === user.id;
  };
  S.canManageMembers = function (user, project) {
    return S.isManagerOf(user, project);
  };
  S.canAttach = function (user, task) {
    if (!user || !task) return false;
    return S.canEditTask(user, task) || task.assigneeId === user.id || task.reporterId === user.id;
  };

  /* ================= Уведомления ================= */

  function notify(userIds, data, actorId) {
    var seen = {};
    userIds.forEach(function (id) {
      if (!id || id === actorId || seen[id]) return;
      seen[id] = 1;
      if (data.key && db.notifications.some(function (n) { return n.userId === id && n.key === data.key; })) return;
      db.notifications.push({
        id: U.uid('n'), userId: id, type: data.type, text: data.text,
        taskId: data.taskId || null, projectId: data.projectId || null,
        createdAt: Date.now(), read: false, key: data.key || null
      });
    });
  }

  S.scanDeadlines = function () {
    var today = U.todayStr();
    db.tasks.forEach(function (t) {
      if (!t.deadline || t.status === 'done' || !t.assigneeId) return;
      var diff = U.daysBetween(today, t.deadline);
      if (diff < 0) {
        notify([t.assigneeId], {
          type: 'overdue', taskId: t.id, key: 'over-' + t.id + '-' + t.deadline,
          text: 'Задача ' + S.taskCode(t) + ' «' + t.title + '» просрочена — срок был ' + U.fmtDate(t.deadline)
        });
      } else if (diff <= 2) {
        notify([t.assigneeId], {
          type: 'due_soon', taskId: t.id, key: 'soon-' + t.id + '-' + t.deadline,
          text: 'Дедлайн ' + S.taskCode(t) + ' «' + t.title + '» — ' + (diff === 0 ? 'сегодня' : (diff === 1 ? 'завтра' : 'через ' + diff + ' ' + U.plural(diff, ['день', 'дня', 'дней'])))
        });
      }
    });
  };

  S.myNotifications = function (userId) {
    return db.notifications.filter(function (n) { return n.userId === userId; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
  };
  S.unreadCount = function (userId) {
    return db.notifications.filter(function (n) { return n.userId === userId && !n.read; }).length;
  };
  S.markNotifRead = function (id) {
    var n = db.notifications.find(function (x) { return x.id === id; });
    if (n) { n.read = true; S.save(); }
  };
  S.markAllRead = function (userId) {
    db.notifications.forEach(function (n) { if (n.userId === userId) n.read = true; });
    S.save();
  };
  S.clearRead = function (userId) {
    db.notifications = db.notifications.filter(function (n) { return !(n.userId === userId && n.read); });
    S.save();
  };

  /* ================= История ================= */

  function hAdd(taskId, actor, field, from, to, text) {
    db.history.push({
      id: U.uid('h'), taskId: taskId, userId: actor.id, userName: actor.name,
      field: field, from: from || null, to: to || null, text: text || null, ts: Date.now()
    });
  }
  S.taskHistory = function (taskId) {
    return db.history.filter(function (h) { return h.taskId === taskId; })
      .sort(function (a, b) { return b.ts - a.ts; });
  };
  var FIELD_LABELS = {
    title: 'Название', description: 'Описание', status: 'Статус', priority: 'Приоритет',
    assignee: 'Исполнитель', reporter: 'Постановщик', deadline: 'Срок', tags: 'Теги',
    attachments: 'Вложения', project: 'Проект'
  };
  S.fieldLabel = function (f) { return FIELD_LABELS[f] || f; };

  /* ================= Комментарии ================= */

  S.taskComments = function (taskId) {
    return db.comments.filter(function (c) { return c.taskId === taskId; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
  };
  S.addComment = function (taskId, text, actor) {
    var t = S.taskById(taskId);
    if (!t || !text.trim()) return null;
    db.comments.push({
      id: U.uid('c'), taskId: taskId, authorId: actor.id, authorName: actor.name,
      text: text.trim(), createdAt: Date.now(), updatedAt: 0
    });
    t.updatedAt = Date.now();
    // уведомить: исполнитель, постановщик и предыдущие комментаторы
    var targets = [t.assigneeId, t.reporterId];
    db.comments.forEach(function (c) { if (c.taskId === taskId) targets.push(c.authorId); });
    var snippet = text.trim();
    if (snippet.length > 60) snippet = snippet.slice(0, 60) + '…';
    notify(targets, {
      type: 'comment', taskId: taskId,
      text: 'Новый комментарий к задаче ' + S.taskCode(t) + ' «' + t.title + '» · ' + actor.name + ': «' + snippet + '»'
    }, actor.id);
    S.save();
    S.scanDeadlines();
    return true;
  };
  S.updateComment = function (commentId, text, actor) {
    var c = db.comments.find(function (x) { return x.id === commentId; });
    if (!c || c.authorId !== actor.id || !text.trim()) return false;
    c.text = text.trim();
    c.updatedAt = Date.now();
    S.save();
    return true;
  };
  S.deleteComment = function (commentId, actor) {
    var c = db.comments.find(function (x) { return x.id === commentId; });
    if (!c) return false;
    if (c.authorId !== actor.id && actor.role !== 'admin') return false;
    db.comments = db.comments.filter(function (x) { return x.id !== commentId; });
    S.save();
    return true;
  };

  /* ================= Задачи ================= */

  S.createTask = function (data, actor) {
    var num = db.seq.task;
    db.seq.task += 1;
    var t = {
      id: U.uid('t'), num: num,
      title: data.title.trim(),
      description: (data.description || '').trim(),
      projectId: data.projectId,
      status: data.status || 'backlog',
      priority: data.priority || 'medium',
      assigneeId: data.assigneeId,
      reporterId: data.reporterId || actor.id,
      createdAt: Date.now(), updatedAt: Date.now(),
      deadline: data.deadline || null,
      tags: data.tags || [],
      attachments: data.attachments || []
    };
    db.tasks.push(t);
    hAdd(t.id, actor, 'create', null, null, null);
    if (t.assigneeId) {
      notify([t.assigneeId], {
        type: 'assigned', taskId: t.id,
        text: 'Вам назначена задача ' + S.taskCode(t) + ' «' + t.title + '»'
      }, actor.id);
    }
    S.save();
    S.scanDeadlines();
    return t;
  };

  S.updateTask = function (id, patch, actor) {
    var t = S.taskById(id);
    if (!t) return null;
    var changed = [];

    // дата-поля для истории
    function prioLabel(v) { return (U.priorityMeta[v] || {}).label || v; }
    function statusLabel(v) { return (U.statusMeta[v] || {}).label || v; }

    if (patch.title !== undefined && patch.title.trim() && patch.title.trim() !== t.title) {
      hAdd(id, actor, 'title', t.title, patch.title.trim());
      t.title = patch.title.trim(); changed.push('title');
    }
    if (patch.description !== undefined && patch.description.trim() !== t.description) {
      hAdd(id, actor, 'description', null, null, 'описание обновлено');
      t.description = patch.description.trim(); changed.push('description');
    }
    if (patch.status !== undefined && patch.status !== t.status) {
      var oldStatus = t.status;
      hAdd(id, actor, 'status', statusLabel(oldStatus), statusLabel(patch.status));
      t.status = patch.status; changed.push('status');
      notify([t.assigneeId, t.reporterId], {
        type: 'status', taskId: t.id,
        text: 'Статус ' + S.taskCode(t) + ' «' + t.title + '» изменён: «' + statusLabel(oldStatus) + '» → «' + statusLabel(patch.status) + '» · ' + actor.name
      }, actor.id);
    }
    if (patch.priority !== undefined && patch.priority !== t.priority) {
      hAdd(id, actor, 'priority', prioLabel(t.priority), prioLabel(patch.priority));
      t.priority = patch.priority; changed.push('priority');
    }
    if (patch.assigneeId !== undefined && patch.assigneeId !== t.assigneeId) {
      hAdd(id, actor, 'assignee', t.assigneeId ? S.userName(t.assigneeId) : 'Не назначен',
        patch.assigneeId ? S.userName(patch.assigneeId) : 'Не назначен');
      t.assigneeId = patch.assigneeId || null; changed.push('assignee');
      if (t.assigneeId) {
        notify([t.assigneeId], {
          type: 'assigned', taskId: t.id,
          text: 'Вам назначена задача ' + S.taskCode(t) + ' «' + t.title + '»'
        }, actor.id);
      }
    }
    if (patch.reporterId !== undefined && patch.reporterId !== t.reporterId) {
      hAdd(id, actor, 'reporter', S.userName(t.reporterId), S.userName(patch.reporterId));
      t.reporterId = patch.reporterId || null; changed.push('reporter');
    }
    if (patch.deadline !== undefined) {
      var nd = patch.deadline || null;
      if (nd !== t.deadline) {
        hAdd(id, actor, 'deadline', t.deadline ? U.fmtDate(t.deadline) : 'без срока', nd ? U.fmtDate(nd) : 'без срока');
        t.deadline = nd; changed.push('deadline');
        if (t.assigneeId && nd) {
          notify([t.assigneeId], {
            type: 'deadline', taskId: t.id, key: 'dl-' + t.id + '-' + nd,
            text: 'Срок задачи ' + S.taskCode(t) + ' «' + t.title + '» перенесён на ' + U.fmtDate(nd)
          }, actor.id);
        }
      }
    }
    if (patch.projectId !== undefined && patch.projectId !== t.projectId) {
      hAdd(id, actor, 'project', S.projectById(t.projectId).name, S.projectById(patch.projectId).name);
      t.projectId = patch.projectId; changed.push('project');
    }
    if (patch.tags !== undefined && JSON.stringify(patch.tags) !== JSON.stringify(t.tags)) {
      hAdd(id, actor, 'tags', t.tags.join(', '), patch.tags.join(', '));
      t.tags = patch.tags; changed.push('tags');
    }
    if (changed.length) t.updatedAt = Date.now();
    S.save();
    S.scanDeadlines();
    return t;
  };

  S.addAttachment = function (taskId, att, actor) {
    var t = S.taskById(taskId);
    if (!t) return false;
    t.attachments.push(att);
    hAdd(taskId, actor, 'attachments', null, null, 'добавлено вложение «' + att.name + '»');
    t.updatedAt = Date.now();
    S.save();
    return true;
  };
  S.removeAttachment = function (taskId, index, actor) {
    var t = S.taskById(taskId);
    if (!t || !t.attachments[index]) return false;
    var name = t.attachments[index].name;
    t.attachments.splice(index, 1);
    hAdd(taskId, actor, 'attachments', null, null, 'удалено вложение «' + name + '»');
    t.updatedAt = Date.now();
    S.save();
    return true;
  };

  /* ================= Проекты ================= */

  S.createProject = function (data, actor) {
    var p = {
      id: U.uid('p'),
      name: data.name.trim(),
      description: (data.description || '').trim(),
      managerId: data.managerId,
      memberIds: (data.memberIds || []).slice(),
      startDate: data.startDate || U.todayStr(),
      endDate: data.endDate || null,
      status: data.status || 'planned',
      allowMemberCreate: !!data.allowMemberCreate,
      createdAt: Date.now()
    };
    if (p.memberIds.indexOf(p.managerId) === -1) p.memberIds.push(p.managerId);
    db.projects.push(p);
    S.save();
    return p;
  };
  S.updateProject = function (id, patch, actor) {
    var p = S.projectById(id);
    if (!p) return null;
    ['name', 'description', 'managerId', 'startDate', 'endDate', 'status', 'allowMemberCreate'].forEach(function (k) {
      if (patch[k] !== undefined) p[k] = patch[k];
    });
    if (patch.memberIds !== undefined) {
      p.memberIds = patch.memberIds.slice();
      if (p.memberIds.indexOf(p.managerId) === -1) p.memberIds.push(p.managerId);
    }
    S.save();
    return p;
  };
  S.addMember = function (projectId, userId, actor) {
    var p = S.projectById(projectId);
    if (!p || !S.userById(userId)) return false;
    if (p.memberIds.indexOf(userId) === -1) p.memberIds.push(userId);
    S.save();
    return true;
  };
  S.removeMember = function (projectId, userId, actor) {
    var p = S.projectById(projectId);
    if (!p || userId === p.managerId) return false;
    p.memberIds = p.memberIds.filter(function (x) { return x !== userId; });
    S.save();
    return true;
  };

  /* ================= Пользователи (админ) ================= */

  S.createUser = function (data, actor) {
    if (S.userByEmail(data.email)) return { error: 'Пользователь с такой почтой уже существует' };
    var u = {
      id: U.uid('u'),
      name: data.name.trim(),
      position: (data.position || '').trim(),
      email: data.email.trim(),
      password: data.password || 'nordflow',
      role: data.role || 'employee',
      avatar: null,
      theme: 'light'
    };
    db.users.push(u);
    S.save();
    return { user: u };
  };
  S.updateUser = function (id, patch, actor) {
    var u = S.userById(id);
    if (!u) return { error: 'Пользователь не найден' };
    if (patch.email !== undefined) {
      var other = S.userByEmail(patch.email);
      if (other && other.id !== id) return { error: 'Пользователь с такой почтой уже существует' };
      u.email = patch.email.trim();
    }
    if (patch.name !== undefined) u.name = patch.name.trim();
    if (patch.position !== undefined) u.position = patch.position.trim();
    if (patch.role !== undefined) u.role = patch.role;
    if (patch.password) u.password = patch.password;
    S.save();
    return { user: u };
  };
  S.deleteUser = function (id, actor) {
    if (id === actor.id) return { error: 'Нельзя удалить свою учётную запись' };
    var u = S.userById(id);
    if (!u) return { error: 'Пользователь не найден' };
    db.deletedUsers[id] = { name: u.name, position: u.position };
    db.users = db.users.filter(function (x) { return x.id !== id; });
    // задачи остаются без исполнителя
    db.tasks.forEach(function (t) {
      if (t.assigneeId === id) t.assigneeId = null;
      if (t.reporterId === id) t.reporterId = null;
    });
    // проекты: убрать из участников, руководителя передать админу
    db.projects.forEach(function (p) {
      p.memberIds = p.memberIds.filter(function (x) { return x !== id; });
      if (p.managerId === id) p.managerId = actor.id;
    });
    db.notifications = db.notifications.filter(function (n) { return n.userId !== id; });
    S.save();
    return { ok: true };
  };
  S.changePassword = function (id, newPass) {
    var u = S.userById(id);
    if (!u) return false;
    u.password = newPass;
    S.save();
    return true;
  };
  S.updateProfile = function (id, patch) {
    var u = S.userById(id);
    if (!u) return false;
    if (patch.name !== undefined) u.name = patch.name.trim();
    if (patch.position !== undefined) u.position = patch.position.trim();
    if (patch.avatar !== undefined) u.avatar = patch.avatar; // dataURL или null
    if (patch.theme !== undefined) u.theme = patch.theme;
    S.save();
    return true;
  };

  /* ================= Агрегаты ================= */

  S.countsFor = function (userId, visibleTasks) {
    var act = 0, over = 0, week = 0;
    (visibleTasks || []).forEach(function (t) {
      if (t.assigneeId !== userId) return;
      if (t.status !== 'done') {
        act++;
        if (U.isOverdue(t)) over++;
        else if (t.deadline && U.isThisWeek(t.deadline)) week++;
      }
    });
    return { active: act, overdue: over, week: week };
  };
  S.projectStats = function (projectId) {
    var total = 0, done = 0, open = 0, overdue = 0;
    S.projectTasks(projectId).forEach(function (t) {
      total++;
      if (t.status === 'done') done++; else { open++; if (U.isOverdue(t)) overdue++; }
    });
    return { total: total, done: done, open: open, overdue: overdue, progress: total ? Math.round(done / total * 100) : 0 };
  };
  S.byStatus = function (tasks) {
    var res = {};
    U.statusOrder.forEach(function (s) { res[s] = []; });
    tasks.forEach(function (t) { (res[t.status] || (res[t.status] = [])).push(t); });
    Object.keys(res).forEach(function (k) {
      res[k].sort(function (a, b) {
        var pa = { critical: 0, high: 1, medium: 2, low: 3 }[a.priority], pb = { critical: 0, high: 1, medium: 2, low: 3 }[b.priority];
        if (pa !== pb) return pa - pb;
        return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
      });
    });
    return res;
  };

  /* Лента событий по видимым проектам (история + комментарии) */
  S.activityFeed = function (user, limit) {
    var vis = {};
    S.visibleProjects(user).forEach(function (p) { vis[p.id] = 1; });
    var taskIds = {};
    db.tasks.forEach(function (t) { if (vis[t.projectId]) taskIds[t.id] = t; });
    var items = [];
    db.history.forEach(function (h) {
      if (h.field === 'create' || !taskIds[h.taskId]) return;
      items.push({ kind: 'history', ts: h.ts, task: taskIds[h.taskId], h: h });
    });
    db.comments.forEach(function (c) {
      if (!taskIds[c.taskId]) return;
      items.push({ kind: 'comment', ts: c.createdAt, task: taskIds[c.taskId], c: c });
    });
    items.sort(function (a, b) { return b.ts - a.ts; });
    return items.slice(0, limit || 8);
  };
})();
