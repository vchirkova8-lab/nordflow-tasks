/* NordFlow Tasks — утилиты */
(function () {
  'use strict';
  window.NF = window.NF || {};

  var U = NF.util = {};

  /* ---------- Строки ---------- */
  U.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  U.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };
  U.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  };
  U.plural = function (n, forms) {
    // forms: ['задача','задачи','задач']
    n = Math.abs(n) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  };

  /* ---------- Даты ---------- */
  var MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var MONTHS_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  U.todayStr = function () { return U.tsToDateStr(Date.now()); };
  U.tsToDateStr = function (ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  U.dateStrToTs = function (s) {
    if (!s) return 0;
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  };
  U.addDaysStr = function (dateStr, n) {
    return U.tsToDateStr(U.dateStrToTs(dateStr) + n * 86400000);
  };
  U.daysBetween = function (fromStr, toStr) {
    // сколько дней от from до to (to - from), положительное = to позже
    return Math.round((U.dateStrToTs(toStr) - U.dateStrToTs(fromStr)) / 86400000);
  };
  U.fmtDate = function (s) {
    if (!s) return '—';
    var p = s.split('-');
    return +p[2] + ' ' + MONTHS[+p[1] - 1];
  };
  U.fmtDateFull = function (s) {
    if (!s) return '—';
    var p = s.split('-');
    return +p[2] + ' ' + MONTHS_FULL[+p[1] - 1] + ' ' + p[0] + ' г.';
  };
  U.fmtDateTime = function (ts) {
    var d = new Date(ts);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + hh + ':' + mm;
  };
  U.fmtDateSmart = function (s) {
    // сегодня/завтра/просрочено/дата
    if (!s) return 'без срока';
    var diff = U.daysBetween(U.todayStr(), s);
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    if (diff === -1) return 'вчера';
    return U.fmtDate(s);
  };
  U.deadlineClass = function (task) {
    if (!task.deadline || task.status === 'done') return '';
    var diff = U.daysBetween(U.todayStr(), task.deadline);
    if (diff < 0) return 'deadline--over';
    if (diff <= 1) return 'deadline--soon';
    return '';
  };
  U.isOverdue = function (task) {
    return !!task.deadline && task.status !== 'done' && U.daysBetween(U.todayStr(), task.deadline) < 0;
  };
  U.isThisWeek = function (s) {
    if (!s) return false;
    var now = new Date();
    var day = (now.getDay() + 6) % 7; // Пн = 0
    var mon = U.tsToDateStr(now.getTime() - day * 86400000);
    var sun = U.tsToDateStr(now.getTime() + (6 - day) * 86400000);
    return s >= mon && s <= sun;
  };
  U.weekLabel = function () {
    var now = new Date();
    var day = (now.getDay() + 6) % 7;
    var mon = new Date(now.getTime() - day * 86400000);
    return mon.getDate() + ' ' + MONTHS[mon.getMonth()] + ' – ' + (mon.getDate() + 6) + ' ' + MONTHS[mon.getMonth()];
  };
  U.timeAgo = function (ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' ' + U.plural(Math.floor(diff / 60), ['минуту', 'минуты', 'минут']) + ' назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ' + U.plural(Math.floor(diff / 3600), ['час', 'часа', 'часов']) + ' назад';
    var days = Math.floor(diff / 86400);
    if (days === 1) return 'вчера';
    if (days < 7) return days + ' ' + U.plural(days, ['день', 'дня', 'дней']) + ' назад';
    return U.fmtDateTime(ts);
  };

  /* ---------- Аватары ---------- */
  var AV_COLORS = ['#0B2E4F', '#00A9A5', '#2E86B5', '#7C5CBF', '#D97B21', '#2FA36B', '#C2507E', '#446FA5', '#8A6D3B', '#5E7C8B'];
  U.avatarColor = function (id) {
    var h = 0;
    var s = String(id || 'x');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
  };
  U.initials = function (name) {
    var parts = String(name || '').trim().split(/\s+/);
    var a = (parts[0] || '')[0] || '?';
    var b = (parts[1] || '')[0] || '';
    return (a + b).toUpperCase();
  };

  /* ---------- Иконки (lucide-подобные, stroke) ---------- */
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 5-5"/>',
    tasks: '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m3.5 6 1.5 1.5L7.5 5"/><path d="m3.5 12 1.5 1.5L7.5 11"/><path d="m3.5 18 1.5 1.5L7.5 17"/>',
    folder: '<path d="M4 5h5l2 3h9a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5"/><path d="M16 5.6a3.4 3.4 0 0 1 0 5.8"/><path d="M17.8 15.3c2 .7 3.3 2.2 3.7 4.7"/>',
    bell: '<path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4"/><path d="M12 17.2v.1"/>',
    paperclip: '<path d="m21 11.5-8.6 8.6a5.2 5.2 0 0 1-7.4-7.4l8.7-8.7a3.5 3.5 0 0 1 5 5l-8.7 8.7a1.8 1.8 0 0 1-2.5-2.5l7.9-8"/>',
    comment: '<path d="M21 12a8 8 0 0 1-8 8H4l2.4-2.9A8 8 0 1 1 21 12Z"/>',
    tag: '<path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8L3 11Z"/><circle cx="8" cy="8" r="1.6"/>',
    edit: '<path d="M14.5 4.5 19 9l-9.5 9.5-5 1.5 1.5-5L14.5 4.5Z"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6.5 7 7.5 20a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5L17.5 7"/><path d="M10 11.5v5"/><path d="M14 11.5v5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5"/><path d="M12 19.5V22"/><path d="m4.9 4.9 1.8 1.8"/><path d="m17.3 17.3 1.8 1.8"/><path d="M2 12h2.5"/><path d="M19.5 12H22"/><path d="m4.9 19.1 1.8-1.8"/><path d="m17.3 6.7 1.8-1.8"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    x: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 13 4.4a4 4 0 0 1 5.6 5.6l-2 2"/><path d="M13 17.5l-2 2.1a4 4 0 0 1-5.6-5.6l2-2.1"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    briefcase: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>',
    kanban: '<rect x="3.5" y="4" width="5" height="16" rx="1.4"/><rect x="9.8" y="4" width="5" height="10" rx="1.4"/><rect x="16.1" y="4" width="5" height="13" rx="1.4"/>',
    list: '<path d="M9 6h12"/><path d="M9 12h12"/><path d="M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.7 3 8.4 7 9.5 4-1.1 7-4.8 7-9.5V6l-7-3Z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M4 4l16 16"/><path d="M10.6 5.9A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-3 3.7"/><path d="M6.6 6.9A16.8 16.8 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.3-1"/><path d="M9.9 10.2a3 3 0 0 0 4 4.2"/>',
    key: '<circle cx="8" cy="15" r="4.5"/><path d="m11 12 9-9"/><path d="m17 6 2.5 2.5"/><path d="m14 9 2 2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 19 5.5-6 3 3.2L16 13l3 3.6"/>',
    grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.6 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.4A2 2 0 0 0 16.9 4H7.1a2 2 0 0 0-1.7 1.6Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4c4-2 7 2 12 0v9c-5 2-8-2-12 0"/>'
  };

  U.icon = function (name, size) {
    size = size || 18;
    return '<span class="icon" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg></span>';
  };

  U.statusMeta = {
    backlog:  { label: 'Бэклог',        badge: 'badge--gray',  color: '#8A9BAB' },
    planned:  { label: 'Запланировано', badge: 'badge--blue',  color: '#2E86B5' },
    inwork:   { label: 'В работе',      badge: 'badge--teal',  color: '#00A9A5' },
    review:   { label: 'На проверке',   badge: 'badge--amber', color: '#D97B21' },
    done:     { label: 'Выполнено',     badge: 'badge--green', color: '#2FA36B' }
  };
  U.statusOrder = ['backlog', 'planned', 'inwork', 'review', 'done'];

  U.priorityMeta = {
    low:      { label: 'Низкий',       cls: 'prio--low',      dot: '#8A9BAB' },
    medium:   { label: 'Средний',      cls: 'prio--medium',   dot: '#4CC9F0' },
    high:     { label: 'Высокий',      cls: 'prio--high',     dot: '#FF7A59' },
    critical: { label: 'Критический',  cls: 'prio--critical', dot: '#E5484D' }
  };
  U.priorityOrder = ['critical', 'high', 'medium', 'low'];

  U.projectStatusMeta = {
    planned:  { label: 'Планируется',   badge: 'badge--blue' },
    active:   { label: 'Активный',      badge: 'badge--teal' },
    paused:   { label: 'Приостановлен', badge: 'badge--amber' },
    done:     { label: 'Завершён',      badge: 'badge--green' },
    archived: { label: 'Архивный',      badge: 'badge--gray' }
  };
  U.projectStatusOrder = ['planned', 'active', 'paused', 'done', 'archived'];

  U.roleMeta = {
    admin:    { label: 'Администратор' },
    manager:  { label: 'Руководитель проектов' },
    employee: { label: 'Сотрудник' }
  };

  U.statusBadge = function (status) {
    var m = U.statusMeta[status] || U.statusMeta.backlog;
    return '<span class="badge ' + m.badge + '">' + m.label + '</span>';
  };
  U.projectStatusBadge = function (st) {
    var m = U.projectStatusMeta[st] || U.projectStatusMeta.planned;
    return '<span class="badge ' + m.badge + '">' + m.label + '</span>';
  };
  U.priorityBadge = function (p) {
    var m = U.priorityMeta[p] || U.priorityMeta.medium;
    return '<span class="prio ' + m.cls + '"><span class="prio__dot"></span>' + m.label + '</span>';
  };
})();
