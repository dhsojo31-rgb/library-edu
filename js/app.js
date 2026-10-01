/*
 * 도서관 탐험대 — 화면과 동작
 * 콘텐츠(책, 미션, 분류)는 data 폴더의 파일에서 고칠 수 있습니다.
 */
(function () {
  'use strict';

  const BOOKS = window.LIBRARY_BOOKS || [];
  const M = window.LIBRARY_MISSIONS || {};
  const CLS = window.LIBRARY_CLASSIFICATIONS || [];
  const DEFAULT_ORDER = ['rules', 'bookinfo', 'classify', 'callnumber', 'order', 'search', 'find', 'loan'];
  const customOrder = window.LIBRARY_MISSION_ORDER;
  const STAMP_IDS = Array.isArray(customOrder) && customOrder.length === DEFAULT_ORDER.length && DEFAULT_ORDER.every(id => customOrder.indexOf(id) >= 0)
    ? customOrder.slice() : DEFAULT_ORDER;
  // 탐험(도장) → 이동할 화면
  const SCREEN_OF = { loan: 'desk', find: 'shelf' };
  const screenOf = id => SCREEN_OF[id] || id;
  const orderNum = id => STAMP_IDS.indexOf(id) + 1;
  const KEY = 'library-explorer-v1';
  const SPINE_COLORS = ['#c0583f', '#3f7d9c', '#d9a23b', '#5a8f5a', '#8b5e9e', '#d9825b', '#4f6d85', '#b04a66', '#e0c07a', '#6f9f9a'];

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const liveEl = document.getElementById('sr-live');

  /* ================= 도우미 ================= */

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const bookById = id => BOOKS.find(b => b.id === id) || null;
  const norm = s => String(s || '').replace(/\s+/g, '').toLowerCase();

  function classOf(cn) {
    const n = parseFloat(cn);
    return isNaN(n) ? '000' : String(Math.floor(n / 100) * 100).padStart(3, '0');
  }
  const clsInfo = num => CLS.find(c => c.number === num) || { number: num, name: '', icon: '', color: '#555', examples: [], description: '' };

  function parseCall(cn) {
    const parts = String(cn).trim().split(/\s+/);
    const mark = parts.slice(1).join('');
    const m = mark.match(/^(\D*)(\d*)(.*)$/) || ['', '', '', ''];
    return { cls: parts[0], num: parseFloat(parts[0]), mark, surname: m[1], digits: m[2] ? parseInt(m[2], 10) : 0, rest: m[3] };
  }
  function compareCall(a, b) {
    const A = parseCall(a), B = parseCall(b);
    if (A.num !== B.num) return A.num - B.num;
    const s = A.surname.localeCompare(B.surname, 'ko');
    if (s) return s;
    if (A.digits !== B.digits) return A.digits - B.digits;
    return A.rest.localeCompare(B.rest, 'ko');
  }
  const byCall = (a, b) => compareCall(a.callNumber, b.callNumber);
  function callLines(cn) {
    const i = String(cn).indexOf(' ');
    return i < 0 ? [cn, ''] : [cn.slice(0, i), cn.slice(i + 1).trim()];
  }
  function hasKeyword(b, kw) {
    const k = norm(kw);
    return norm(b.title).includes(k) || b.keywords.some(x => norm(x) === k);
  }
  function hashStr(s) {
    let h = 7;
    for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }
  function rng(seed) {
    let s = seed % 233280;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function chunk(arr, n) {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }
  function dueDateText(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getMonth() + 1}월 ${d.getDate()}일(${'일월화수목금토'[d.getDay()]})`;
  }

  /* ================= 상태 ================= */

  function fresh() {
    return {
      screen: 'start', params: {}, name: '',
      stamps: {}, remembered: null, hand: null, borrowed: [], dueDates: {}, loanedOnce: false,
      searchPick: Math.floor(Math.random() * M.search.missions.length), searchBook: null,
      final: { started: false, searched: false, bookId: null, found: false, borrowed: false, done: false }
    };
  }
  function load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const base = fresh();
      return Object.assign(base, s, { final: Object.assign(base.final, s.final || {}) });
    } catch (e) { return null; }
  }
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장이 안 되어도 계속 진행 */ }
  }

  let S = load() || fresh();
  let ui = {};        // 현재 화면에서만 쓰는 임시 상태
  let modal = null;   // 'notebook' | 'restart' | null

  const countStamps = () => STAMP_IDS.filter(id => S.stamps[id]).length;
  const allStamps = () => countStamps() === STAMP_IDS.length;
  const nextMission = () => STAMP_IDS.find(id => !S.stamps[id]) || null;
  const STRICT = window.LIBRARY_STRICT_ORDER !== false;
  // 점검 모드: index.html?teacher 로 열면 잠금 없이 어느 탐험이든 바로 확인할 수 있어요 (점검모드.html)
  const TEACHER = /[?&]teacher\b/.test(location.search);
  let devOpen = true;
  // 앞 탐험을 아직 끝내지 않아서 들어갈 수 없는 탐험인가요?
  function isLocked(id) {
    if (!STRICT || TEACHER || !id || S.stamps[id]) return false;
    const i = STAMP_IDS.indexOf(id);
    return i > 0 && STAMP_IDS.slice(0, i).some(p => !S.stamps[p]);
  }
  const missionOfScreen = screen => STAMP_IDS.find(id => screenOf(id) === screen) || null;

  function award(id) {
    if (S.stamps[id]) return;
    S.stamps[id] = true;
    ui.justDone = id;
    save();
    if (allStamps() && !S.final.started) {
      setTimeout(() => toast('🎉 탐험 도장 8개를 모두 모았어요! 도서관 왼쪽 벽 게시판에 종합 미션이 도착했어요.'), 600);
    }
  }

  function finalActive() { return S.final.started && !S.final.done; }
  function finalStep() {
    const f = S.final;
    if (!f.searched) return 0;
    if (!f.bookId) return 1;
    if (!f.found) return 2;
    if (!f.borrowed) return 3;
    return 4;
  }
  // 이 학생이 받은 검색 미션 (찾을 책은 ‘서가에서 책 찾기’의 목표이기도 해요)
  function searchMission() {
    const list = M.search.missions;
    return list[(S.searchPick || 0) % list.length];
  }
  const isSearchBook = id => searchMission().bookIds.includes(id);
  // 서가에서 찾을 책: 검색 미션에서 기억한 책 (아직 없으면 미션 책 중 대출 가능한 첫 책)
  function findTargetId() {
    if (S.searchBook && isSearchBook(S.searchBook)) return S.searchBook;
    const ok = searchMission().bookIds.map(bookById).find(b => b && b.availability !== 'loaned');
    return ok ? ok.id : null;
  }

  // 지금 서가에서 찾아야 하는 책
  function currentTarget() {
    if (!S.stamps.find) return bookById(findTargetId());
    if (finalActive() && S.final.bookId && !S.final.found) return bookById(S.final.bookId);
    return null;
  }

  function go(screen, params) {
    S.screen = screen;
    S.params = params || {};
    ui = {};
    save();
    render(true);
  }

  let toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4500);
  }
  function announce(text) {
    liveEl.textContent = '';
    setTimeout(() => { liveEl.textContent = text; }, 60);
  }
  function say(text, kind) {
    ui.msg = { text, kind: kind || 'info' };
    announce(text);
  }

  /* ================= 공통 조각 ================= */

  function topBar() {
    const rem = S.remembered ? bookById(S.remembered) : null;
    return `<header class="topbar">
      <div class="tb-brand"><span aria-hidden="true">📚</span> 도서관 탐험대</div>
      <div class="tb-name"><strong>${esc(S.name)}</strong> 탐험대원</div>
      <nav class="tb-actions" aria-label="메뉴">
        ${rem ? `<button type="button" class="tb-btn memo" data-action="memo" title="기억한 청구기호"><span aria-hidden="true">📝</span><span class="sr">기억한 청구기호</span> ${esc(rem.callNumber)}</button>` : ''}
        <button type="button" class="tb-btn" data-action="notebook"><span aria-hidden="true">📒</span> 탐험 기록 <span class="count">${countStamps()}/8</span></button>
        <button type="button" class="tb-btn" data-action="go" data-screen="library"><span aria-hidden="true">🏠</span> 도서관으로</button>
        <button type="button" class="tb-btn" data-action="restart"><span aria-hidden="true">↺</span> 처음부터</button>
      </nav>
    </header>`;
  }

  function page(inner, cls) {
    return `${topBar()}<main class="act ${cls || ''}" id="main">${inner}</main>${msgDock()}`;
  }

  function msgDock() {
    if (!ui.msg) return '';
    const icon = { good: '✔', try: '🔁', info: '💬' }[ui.msg.kind] || '💬';
    const label = { good: '잘했어요', try: '다시 해 볼까요', info: '안내' }[ui.msg.kind] || '안내';
    return `<div class="msg-dock"><div class="msg ${ui.msg.kind}">
      <span class="msg-icon" aria-hidden="true">${icon}</span>
      <p><span class="sr">${label}: </span>${esc(ui.msg.text)}</p>
      <button type="button" class="msg-close" data-action="msg-close" aria-label="안내 닫기">✕</button>
    </div></div>`;
  }

  function getHints(key) {
    if (key.indexOf('final') === 0) return (M.final.stepHints || [])[+key.slice(5)] || [];
    if (key === 'search') return searchMission().hints || [];
    if (key === 'find') {
      const t = bookById(findTargetId());
      if (!t) return M.find.hints;
      const p = parseCall(t.callNumber);
      return M.find.hints.map(h => h.replace('{서가}', classOf(t.callNumber)).replace('{분류번호}', p.cls).replace('{도서기호}', p.mark));
    }
    return (M[key] && M[key].hints) || [];
  }
  function hintBlock(key) {
    const hints = getHints(key);
    if (!hints.length) return '';
    const i = ui.hint && ui.hint.key === key ? ui.hint.i : -1;
    const label = i < 0 ? '힌트 보기' : (i < hints.length - 1 ? `다음 힌트 (${i + 2}/${hints.length})` : '힌트 처음부터');
    return `<div class="hint-area">
      <button type="button" class="btn hint-btn" data-action="hint" data-id="${key}"><span aria-hidden="true">💡</span> ${label}</button>
      ${i >= 0 ? `<div class="hint-box"><strong>힌트 ${i + 1}</strong><span>${esc(hints[i])}</span></div>` : ''}
    </div>`;
  }

  function actHeader(id, lead) {
    const m = M[id];
    return `<div class="act-head">
      <div class="act-title">
        <p class="place"><span aria-hidden="true">${m.icon}</span> ${esc(m.place)}</p>
        <h1>${esc(m.title)} ${S.stamps[id] ? '<span class="done-badge">✓ 도장 받음</span>' : ''}</h1>
        ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
      </div>
      ${hintBlock(id)}
    </div>`;
  }

  function stampHtml(icon, name, done, big) {
    return `<span class="stamp${done ? '' : ' empty'}${big ? ' big' : ''}" aria-hidden="true"><span class="st-icon">${done ? icon : '?'}</span><span class="st-name">${esc(name)}</span></span>`;
  }

  function successPanel(id, extra, buttons) {
    const m = M[id];
    return `<section class="success" aria-label="탐험 성공">
      ${stampHtml(m.icon, m.title, true, true)}
      <div class="success-body">
        <h2>${esc(m.successTitle || '탐험 도장을 받았어요!')}</h2>
        <p>${esc(m.successMessage)}</p>
        ${extra || ''}
        <div class="row">
          ${buttons || ''}
          <button type="button" class="btn ${buttons ? '' : 'primary'}" data-action="go" data-screen="library"><span aria-hidden="true">🏠</span> 도서관으로 돌아가기</button>
        </div>
      </div>
    </section>`;
  }

  function finalTracker() {
    if (!finalActive()) return '';
    const step = finalStep();
    const f = M.final;
    return `<aside class="tracker" aria-label="종합 미션 진행 상황">
      <p class="tr-head"><span aria-hidden="true">📜</span> 종합 미션 <span>${esc(f.goal)}</span></p>
      <ol class="tr-steps">
        ${f.steps.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'now' : ''}"><span class="tr-mark" aria-hidden="true">${i < step ? '✓' : i === step ? '▶' : '○'}</span>${esc(s)}<span class="sr">${i < step ? ' (완료)' : i === step ? ' (지금 할 일)' : ''}</span></li>`).join('')}
      </ol>
      ${step < 4 ? hintBlock('final' + step) : ''}
    </aside>`;
  }

  function miniCover(b, extraCls) {
    return `<span class="cover ${extraCls || ''}" style="--c:${b.cover.color}" aria-hidden="true"><span class="cv-icon">${b.cover.icon}</span><span class="cv-title">${esc(b.title)}</span></span>`;
  }

  /* ================= 시작 · 등록 ================= */

  function vStart() {
    return `<main class="start" id="main">
      <div class="start-card">
        <div class="door-scene" aria-hidden="true">
          <div class="door-sign">학교도서관</div>
          <div class="door-frame">
            <div class="door-inside"><span></span><span></span><span></span></div>
            <div class="door l"><i></i></div><div class="door r"><i></i></div>
          </div>
        </div>
        <h1 class="title">도서관 탐험대</h1>
        <p class="start-text">도서관에는 책을 찾을 수 있는 여러 가지 단서가 숨어 있어요.<br>도서관을 탐험하며 원하는 책을 스스로 찾아보세요!</p>
        <button type="button" class="btn primary big enter" data-action="go" data-screen="${S.name ? 'library' : 'register'}">도서관 들어가기 <span aria-hidden="true">→</span></button>
      </div>
    </main>`;
  }

  function vRegister() {
    return `<main class="start" id="main">
      <form class="start-card register" data-form="register" novalidate>
        <div class="badge-art" aria-hidden="true"><span>📚</span></div>
        <h1>도서관 탐험대에 온 것을 환영합니다.</h1>
        <label for="explorer-name" class="reg-label">탐험대원의 이름을 입력하세요.</label>
        <input id="explorer-name" name="name" class="name-input" maxlength="10" autocomplete="off" placeholder="이름" value="${esc(ui.name || '')}">
        ${ui.nameError ? `<p class="field-error" role="alert">🔁 ${esc(ui.nameError)}</p>` : ''}
        <p class="reg-note">이름은 이 컴퓨터의 브라우저에서만 쓰이고 어디에도 저장되지 않아요.</p>
        <button type="submit" class="btn primary big">탐험 시작 <span aria-hidden="true">→</span></button>
      </form>
    </main>`;
  }

  /* ================= 도서관 메인 ================= */

  function tagSvg(label, x, y, done, num, locked) {
    const text = (done ? '✓ ' : locked ? '🔒 ' : '') + label;
    const w = text.length * 16 + 32 + (num ? 30 : 0);
    const tx = num ? 14 : 0;
    const badge = num ? `<circle class="tag-num" cx="${-w / 2 + 20}" cy="0" r="13"/><text class="tag-num-t" x="${-w / 2 + 20}" y="6" text-anchor="middle">${num}</text>` : '';
    return `<g class="tag" transform="translate(${x},${y})"><rect x="${-w / 2}" y="-18" width="${w}" height="36" rx="18"/>${badge}<text x="${tx}" y="6" text-anchor="middle">${esc(text)}</text></g>`;
  }
  function hotSvg(o) {
    const num = o.id ? orderNum(o.id) : 0;
    const isNext = o.id && o.id === nextMission();
    const locked = isLocked(o.id);
    return `<g class="hot${o.done ? ' is-done' : ''}${isNext ? ' is-next glow' : ''}${locked ? ' is-locked' : ''}${o.extraCls ? ' ' + o.extraCls : ''}" role="button" tabindex="0"
      aria-label="${num ? num + '번 탐험, ' : ''}${esc(o.aria || o.label)}${o.done ? ' (탐험 완료)' : ''}${isNext ? ' (다음 탐험)' : ''}${locked ? ' (잠김)' : ''}"
      data-action="go" data-screen="${o.screen}"${o.param ? ` data-param="${o.param}"` : ''}>
      <rect class="hl" x="${o.hl[0]}" y="${o.hl[1]}" width="${o.hl[2]}" height="${o.hl[3]}" rx="12"/>
      ${o.body}
      ${o.label ? tagSvg(o.label, o.tag[0], o.tag[1], o.done, num, locked) : ''}
    </g>`;
  }

  // 입체감을 주는 공통 그림 요소 (그라데이션 · 그림자 · 빛 반사)
  const SVG_DEFS = `<defs>
      <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf6ea"/><stop offset="1" stop-color="#efdfc2"/></linearGradient>
      <linearGradient id="gWainscot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7d3b0"/><stop offset="1" stop-color="#d9c098"/></linearGradient>
      <linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b684"/><stop offset="1" stop-color="#e9cfa2"/></linearGradient>
      <radialGradient id="gLight" cx="0.5" cy="0.1" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c08a54"/><stop offset="1" stop-color="#8f5e35"/></linearGradient>
      <linearGradient id="gWoodH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f5e35"/><stop offset=".5" stop-color="#b17d4a"/><stop offset="1" stop-color="#7a4e2b"/></linearGradient>
      <linearGradient id="gWoodTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b47c"/><stop offset="1" stop-color="#c79360"/></linearGradient>
      <linearGradient id="gWoodSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e4526"/><stop offset="1" stop-color="#4f311b"/></linearGradient>
      <linearGradient id="gShelfBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23140b"/><stop offset="1" stop-color="#4a2e1b"/></linearGradient>
      <linearGradient id="gShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
      <linearGradient id="gGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="gGlossD" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset=".46" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="gMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5566"/><stop offset="1" stop-color="#1f2630"/></linearGradient>
      <linearGradient id="gScreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1faff"/><stop offset="1" stop-color="#c3e2f3"/></linearGradient>
      <linearGradient id="gCart" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86a6bf"/><stop offset="1" stop-color="#5b7a92"/></linearGradient>
      <linearGradient id="gChalk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a7564"/><stop offset="1" stop-color="#244a3f"/></linearGradient>
      <linearGradient id="gCork" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecca92"/><stop offset="1" stop-color="#d6ad6f"/></linearGradient>
      <linearGradient id="gBox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d82a3"/><stop offset="1" stop-color="#325a74"/></linearGradient>
      <radialGradient id="gFloorShadow"><stop offset="0" stop-color="#4a2c12" stop-opacity=".4"/><stop offset="1" stop-color="#4a2c12" stop-opacity="0"/></radialGradient>
      <radialGradient id="gWheel" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#6b7684"/><stop offset="1" stop-color="#1c222b"/></radialGradient>
      <filter id="fDrop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#3a2410" flood-opacity=".3"/></filter>
      <filter id="fSoft" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#3a2410" flood-opacity=".3"/></filter>
    </defs>`;

  // 빛이 비치는 책 한 권 (앞면 + 왼쪽 빛 반사 + 아래 그늘)
  function bookSvg(x, y, w, h, fill, rot) {
    const t = rot ? ` transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"` : '';
    return `<g${t}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${fill}"/><rect x="${x + 1}" y="${y + 1}" width="${Math.max(1.5, w * 0.22)}" height="${h - 2}" fill="#fff" opacity=".28"/><rect x="${x}" y="${y + h - 4}" width="${w}" height="4" fill="#000" opacity=".18"/></g>`;
  }
  const floorShadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#gFloorShadow)"/>`;

  function librarySvg() {
    const st = S.stamps;
    const n = countStamps();
    let shelves = '';
    CLS.forEach((c, i) => {
      const x = 190 + i * 82;
      const r = rng(i * 97 + 13);
      let spines = '';
      for (let row = 0; row < 3; row++) {
        const base = 96 + row * 76 + 68;
        const top = base - 68;
        spines += `<rect x="${x + 5}" y="${top}" width="68" height="16" fill="url(#gShade)"/>`;
        let sx = x + 8;
        for (;;) {
          const w = 6 + Math.floor(r() * 5), h = 40 + Math.floor(r() * 20);
          if (sx + w > x + 71) break;
          spines += bookSvg(sx, base - h, w, h, SPINE_COLORS[Math.floor(r() * SPINE_COLORS.length)]);
          sx += w + 1;
        }
        spines += `<rect x="${x + 2}" y="${base}" width="74" height="8" fill="url(#gWood)"/><rect x="${x + 2}" y="${base}" width="74" height="2" fill="#fff" opacity=".3"/>`;
      }
      shelves += `<g class="hot shelf${isLocked('find') ? ' is-locked' : ''}" role="button" tabindex="0" aria-label="${c.number} ${esc(c.name)} 서가${isLocked('find') ? ' (잠김)' : ''}" data-action="go" data-screen="shelf" data-param="${c.number}">
        <rect class="hl" x="${x - 5}" y="40" width="88" height="296" rx="8"/>
        <g filter="url(#fSoft)">
          <polygon points="${x - 1},92 ${x + 79},92 ${x + 75},85 ${x + 3},85" fill="url(#gWoodTop)"/>
          <rect x="${x}" y="92" width="78" height="236" rx="2" fill="url(#gWoodH)"/>
        </g>
        <rect x="${x + 5}" y="97" width="68" height="226" fill="url(#gShelfBack)"/>
        ${spines}
        <rect x="${x + 5}" y="97" width="5" height="226" fill="#000" opacity=".3"/>
        <rect x="${x}" y="92" width="2" height="236" fill="#fff" opacity=".2"/>
        <g filter="url(#fSoft)">
          <rect x="${x}" y="49" width="78" height="40" rx="7" fill="#000" opacity=".22"/>
          <rect x="${x}" y="45" width="78" height="40" rx="7" fill="${c.color}"/>
          <rect x="${x + 2}" y="47" width="74" height="18" rx="6" fill="url(#gGloss)"/>
        </g>
        <text x="${x + 39}" y="66" class="s-num" style="fill:${c.text || '#fff'}">${c.number}</text>
        <text x="${x + 39}" y="81" class="s-name" style="fill:${c.text || '#fff'}">${esc(c.name)}</text>
      </g>`;
    });

    // 원근감 있는 바닥 (한 점으로 모이는 마루 줄)
    const vpX = 600, k = (340 - 120) / (700 - 120);
    let floorLines = '';
    for (let bx = -700; bx <= 1900; bx += 100) {
      floorLines += `<line x1="${bx}" y1="700" x2="${(vpX + (bx - vpX) * k).toFixed(1)}" y2="340" stroke="#b98d57" stroke-width="1.5" opacity=".45"/>`;
    }
    [356, 378, 408, 448, 500, 566, 646].forEach(y => { floorLines += `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#c49a63" stroke-width="1.5" opacity=".35"/>`; });

    const unlocked = allStamps();
    const boardInner = S.final.done
      ? `<text x="100" y="178" class="svg-emoji" text-anchor="middle">🏆</text><text x="100" y="226" class="svg-small" text-anchor="middle">미션 완료!</text>`
      : unlocked
        ? `<g class="${S.final.started ? '' : 'pulse'}"><rect x="56" y="136" width="88" height="62" rx="4" fill="#fff" stroke="#a3402c" stroke-width="3" filter="url(#fSoft)"/><path d="M56 136 L100 172 L144 136" fill="none" stroke="#a3402c" stroke-width="3"/></g><text x="100" y="226" class="svg-small" text-anchor="middle">종합 미션</text>`
        : `<text x="100" y="180" class="svg-emoji" text-anchor="middle">🔒</text><text x="100" y="226" class="svg-small" text-anchor="middle">도장 ${n}/8</text>`;

    return `<svg class="library" viewBox="0 0 1200 700" role="group" aria-label="학교도서관 전체 모습. 장소를 눌러 탐험하세요." xmlns="http://www.w3.org/2000/svg">
      ${SVG_DEFS}
      <rect width="1200" height="340" fill="url(#gWall)"/>
      <rect y="250" width="1200" height="78" fill="url(#gWainscot)"/>
      <rect y="250" width="1200" height="3" fill="#fff" opacity=".6"/>
      <rect y="253" width="1200" height="3" fill="#b99a6c" opacity=".35"/>
      <rect y="340" width="1200" height="360" fill="url(#gFloor)"/>
      ${floorLines}
      <rect y="340" width="1200" height="360" fill="url(#gLight)"/>
      <rect y="340" width="1200" height="26" fill="url(#gShade)" opacity=".5"/>
      <rect y="326" width="1200" height="16" fill="url(#gWood)"/>
      <rect y="326" width="1200" height="3" fill="#fff" opacity=".35"/>
      <text x="600" y="30" class="svg-caption" text-anchor="middle">${isLocked('find') ? `🔒 분야별 서가 · ${orderNum('find')}번 탐험에서 열려요` : '분야별 서가 · 서가를 눌러 책을 찾아보세요'}</text>
      ${shelves}

      ${hotSvg({ screen: 'final', label: '게시판', aria: unlocked ? '게시판: 종합 미션' : `게시판: 종합 미션 잠김, 도장 ${n}/8`, done: S.final.done, tag: [100, 282], hl: [20, 52, 160, 250],
        extraCls: unlocked && !S.final.started ? 'glow' : '',
        body: `<g filter="url(#fDrop)"><rect x="28" y="60" width="144" height="190" rx="8" fill="url(#gWoodH)"/></g>
          <rect x="30" y="62" width="140" height="4" rx="2" fill="#fff" opacity=".3"/>
          <rect x="36" y="68" width="128" height="174" rx="4" fill="url(#gCork)"/><rect x="36" y="68" width="128" height="10" fill="url(#gShade)" opacity=".5"/>
          <g filter="url(#fSoft)"><rect x="46" y="80" width="48" height="38" fill="#fff" transform="rotate(-4 70 99)"/><rect x="104" y="82" width="48" height="36" fill="#fdf1b8" transform="rotate(3 128 100)"/></g>
          <circle cx="70" cy="82" r="4.5" fill="#c0392b"/><circle cx="68.8" cy="80.8" r="1.5" fill="#fff" opacity=".7"/><circle cx="128" cy="84" r="4.5" fill="#2f6b57"/><circle cx="126.8" cy="82.8" r="1.5" fill="#fff" opacity=".7"/>${boardInner}` })}

      ${hotSvg({ id: 'callnumber', screen: 'callnumber', label: '청구기호', aria: '청구기호 포스터', done: st.callnumber, tag: [1100, 282], hl: [1020, 52, 160, 250],
        body: `<g filter="url(#fDrop)"><rect x="1028" y="60" width="144" height="190" rx="6" fill="#fffdf6" stroke="#c9b48f" stroke-width="3"/></g>
          <rect x="1031" y="63" width="138" height="60" rx="4" fill="url(#gGloss)" opacity=".6"/>
          <text x="1100" y="94" class="svg-poster-h" text-anchor="middle">청구기호</text>
          <rect x="1060" y="108" width="80" height="62" rx="4" fill="#fff" stroke="#23324a" stroke-width="2.5" filter="url(#fSoft)"/>
          <text x="1100" y="134" class="svg-label" text-anchor="middle">813.8</text><text x="1100" y="160" class="svg-label" text-anchor="middle">황53ㅁ</text>
          <text x="1100" y="200" class="svg-small" text-anchor="middle">= 책의 주소</text>
          <text x="1100" y="228" class="svg-emoji-s" text-anchor="middle">🏠</text>` })}

      ${hotSvg({ id: 'rules', screen: 'rules', label: '이용 안내판', done: st.rules, tag: [110, 596], hl: [30, 360, 160, 216],
        body: `${floorShadow(110, 568, 70, 9)}
          <path d="M64 566 L86 380 M156 566 L134 380" stroke="#5a381d" stroke-width="10" stroke-linecap="round"/>
          <path d="M62 566 L84 380 M154 566 L132 380" stroke="#8f5e35" stroke-width="5" stroke-linecap="round"/>
          <g filter="url(#fDrop)"><rect x="44" y="370" width="132" height="152" rx="8" fill="url(#gWoodH)"/></g>
          <rect x="52" y="378" width="116" height="136" rx="4" fill="url(#gChalk)"/>
          <rect x="52" y="378" width="116" height="136" rx="4" fill="url(#gGlossD)" opacity=".5"/>
          <rect x="44" y="370" width="132" height="3" rx="1.5" fill="#fff" opacity=".35"/>
          <text x="110" y="404" class="svg-board-h" text-anchor="middle">도서관 약속</text>
          <text x="66" y="436" class="svg-board">📖 소중히</text><text x="66" y="464" class="svg-board">🤫 조용히</text><text x="66" y="492" class="svg-board">📚 제자리에</text>` })}

      ${hotSvg({ id: 'search', screen: 'search', label: '도서 검색', aria: '도서검색대', done: st.search, tag: [306, 652], hl: [200, 396, 212, 236],
        body: `${floorShadow(312, 624, 118, 14)}
          <polygon points="390,530 404,518 404,608 390,620" fill="url(#gWoodSide)"/>
          <rect x="222" y="530" width="168" height="90" fill="url(#gWood)"/>
          <rect x="238" y="548" width="62" height="26" rx="3" fill="#a8703f" stroke="#7a4e2b" stroke-width="1.5"/><rect x="312" y="548" width="62" height="26" rx="3" fill="#a8703f" stroke="#7a4e2b" stroke-width="1.5"/>
          <rect x="262" y="559" width="14" height="4" rx="2" fill="#5a381d"/><rect x="336" y="559" width="14" height="4" rx="2" fill="#5a381d"/>
          <polygon points="212,514 400,514 414,502 226,502" fill="url(#gWoodTop)"/>
          <rect x="212" y="514" width="188" height="16" rx="3" fill="url(#gWood)"/><rect x="212" y="514" width="188" height="2" fill="#fff" opacity=".4"/>
          ${floorShadow(306, 510, 34, 4)}
          <rect x="298" y="486" width="16" height="22" fill="url(#gMetal)"/><rect x="282" y="504" width="48" height="8" rx="3" fill="url(#gMetal)"/>
          <g filter="url(#fDrop)"><rect x="248" y="404" width="116" height="84" rx="8" fill="url(#gMetal)"/></g>
          <rect x="256" y="412" width="100" height="66" rx="3" fill="url(#gScreen)"/>
          <rect x="264" y="422" width="84" height="15" rx="7" fill="#fff" stroke="#7aa3bd" stroke-width="2"/><circle cx="338" cy="429" r="4" fill="none" stroke="#3f7d9c" stroke-width="2"/>
          <rect x="264" y="446" width="56" height="6" rx="3" fill="#9cc2d8"/><rect x="264" y="458" width="72" height="6" rx="3" fill="#9cc2d8"/>
          <polygon points="256,412 316,412 280,478 256,478" fill="#fff" opacity=".22"/>` })}

      ${hotSvg({ id: 'bookinfo', screen: 'bookinfo', label: '책 살펴보기', aria: '신간도서 진열대', done: st.bookinfo, tag: [580, 500], hl: [462, 328, 236, 158],
        body: `${floorShadow(580, 476, 108, 9)}
          <g filter="url(#fSoft)"><rect x="518" y="334" width="124" height="26" rx="13" fill="#b5462f"/></g>
          <rect x="522" y="336" width="116" height="10" rx="5" fill="url(#gGloss)"/>
          <text x="580" y="352" class="svg-plate" text-anchor="middle">새로 들어온 책</text>
          <g filter="url(#fDrop)"><polygon points="486,470 674,470 660,368 500,368" fill="url(#gWood)"/></g>
          <polygon points="500,368 660,368 656,376 504,376" fill="#fff" opacity=".25"/>
          <rect x="482" y="464" width="196" height="10" rx="3" fill="url(#gWoodSide)"/>
          <g filter="url(#fSoft)">
            <rect x="508" y="382" width="46" height="64" rx="2" fill="#9a5b2a"/><rect x="558" y="378" width="46" height="68" rx="2" fill="#2e7556"/><rect x="608" y="382" width="46" height="64" rx="2" fill="#a8445f"/>
          </g>
          <rect x="508" y="382" width="5" height="64" fill="#000" opacity=".2"/><rect x="558" y="378" width="5" height="68" fill="#000" opacity=".2"/><rect x="608" y="382" width="5" height="64" fill="#000" opacity=".2"/>
          <rect x="508" y="382" width="46" height="64" rx="2" fill="url(#gGlossD)"/><rect x="558" y="378" width="46" height="68" rx="2" fill="url(#gGlossD)"/><rect x="608" y="382" width="46" height="64" rx="2" fill="url(#gGlossD)"/>
          <text x="533" y="420" class="svg-emoji-s" text-anchor="middle">🐔</text><text x="583" y="418" class="svg-emoji-s" text-anchor="middle">🦕</text><text x="633" y="420" class="svg-emoji-s" text-anchor="middle">🎨</text>` })}

      ${hotSvg({ id: 'classify', screen: 'classify', label: '책 분류하기', aria: '책 수레', done: st.classify, tag: [822, 580], hl: [740, 396, 164, 170],
        body: `${floorShadow(826, 552, 80, 10)}
          <path d="M754 418 L754 474" stroke="#3f5566" stroke-width="7" stroke-linecap="round"/><path d="M752 420 L752 472" stroke="#9fb6c8" stroke-width="2" stroke-linecap="round"/>
          ${bookSvg(766, 410, 12, 32, '#c0583f', -8)}${bookSvg(782, 406, 14, 36, '#3f7d9c')}${bookSvg(800, 412, 10, 30, '#d9a23b', 10)}${bookSvg(816, 408, 14, 34, '#5a8f5a')}${bookSvg(836, 414, 12, 28, '#8b5e9e', -12)}
          <polygon points="890,446 900,438 900,520 890,526" fill="#4a6478"/>
          <g filter="url(#fDrop)"><rect x="760" y="440" width="130" height="86" rx="6" fill="url(#gCart)"/></g>
          <rect x="762" y="442" width="126" height="4" rx="2" fill="#fff" opacity=".4"/>
          <rect x="768" y="448" width="114" height="30" rx="3" fill="#4f6b80"/><rect x="768" y="448" width="114" height="8" fill="url(#gShade)" opacity=".6"/>
          <rect x="768" y="486" width="114" height="30" rx="3" fill="#4f6b80"/><rect x="768" y="486" width="114" height="8" fill="url(#gShade)" opacity=".6"/>
          ${bookSvg(776, 490, 30, 22, '#d9825b')}${bookSvg(810, 494, 36, 18, '#6f8fa8')}
          <circle cx="778" cy="540" r="11" fill="url(#gWheel)"/><circle cx="872" cy="540" r="11" fill="url(#gWheel)"/><circle cx="778" cy="540" r="3" fill="#aab4c0"/><circle cx="872" cy="540" r="3" fill="#aab4c0"/>
          <g filter="url(#fSoft)"><circle cx="874" cy="424" r="15" fill="#ffcf4d" stroke="#8a6a00" stroke-width="2"/></g>
          <ellipse cx="869" cy="418" rx="7" ry="4" fill="#fff" opacity=".5"/><text x="874" y="431" class="svg-q" text-anchor="middle">?</text>` })}

      ${hotSvg({ id: 'order', screen: 'order', label: '책이 꽂힌 순서', aria: '열람 테이블 책꽂이', done: st.order, tag: [580, 668], hl: [412, 516, 336, 176],
        body: `${floorShadow(580, 690, 170, 10)}
          <rect x="440" y="614" width="14" height="74" fill="url(#gWoodH)"/><rect x="706" y="614" width="14" height="74" fill="url(#gWoodH)"/>
          <rect x="690" y="612" width="10" height="60" fill="#6e4526"/><rect x="460" y="612" width="10" height="60" fill="#6e4526"/>
          <polygon points="420,592 740,592 724,578 436,578" fill="url(#gWoodTop)"/>
          ${floorShadow(570, 590, 110, 5)}
          <rect x="468" y="536" width="9" height="54" rx="2" fill="url(#gMetal)"/><rect x="664" y="536" width="9" height="54" rx="2" fill="url(#gMetal)"/>
          ${[['#c0583f', 46], ['#3f7d9c', 52], ['#d9a23b', 42], ['#5a8f5a', 50], ['#8b5e9e', 48], ['#4f6d85', 44]].map((s, k) => `${bookSvg(481 + k * 30, 590 - s[1], 26, s[1], s[0])}<rect x="${484 + k * 30}" y="574" width="20" height="12" rx="2" fill="#fff"/>`).join('')}
          <g filter="url(#fDrop)"><rect x="420" y="590" width="320" height="22" rx="6" fill="url(#gWood)"/></g>
          <rect x="420" y="590" width="320" height="3" rx="1.5" fill="#fff" opacity=".4"/>` })}

      ${hotSvg({ id: 'loan', screen: 'desk', label: '대출·반납', aria: '대출·반납대', done: st.loan, tag: [1040, 642], hl: [900, 392, 292, 232],
        body: `${floorShadow(1040, 606, 150, 14)}
          <polygon points="1114,476 1126,466 1126,594 1114,602" fill="url(#gWoodSide)"/>
          <rect x="920" y="476" width="194" height="126" fill="url(#gWood)"/>
          <rect x="932" y="488" width="170" height="104" rx="4" fill="none" stroke="#6e4526" stroke-width="2" opacity=".6"/>
          <polygon points="910,458 1124,458 1138,446 924,446" fill="url(#gWoodTop)"/>
          <rect x="910" y="456" width="214" height="20" rx="5" fill="url(#gWood)"/><rect x="910" y="456" width="214" height="3" fill="#fff" opacity=".4"/>
          <g filter="url(#fSoft)"><rect x="950" y="510" width="134" height="38" rx="19" fill="#fff6e3"/></g>
          <text x="1017" y="535" class="svg-plate-d" text-anchor="middle">대출 · 반납</text>
          <g filter="url(#fSoft)"><rect x="948" y="436" width="42" height="18" rx="4" fill="url(#gMetal)"/></g><rect x="954" y="448" width="30" height="3" fill="#ff5a4a"/>
          ${bookSvg(1000, 440, 38, 14, '#c0583f')}
          <rect x="1078" y="452" width="10" height="6" fill="#1f2630"/>
          <g filter="url(#fDrop)"><rect x="1050" y="404" width="66" height="50" rx="5" fill="url(#gMetal)"/></g>
          <rect x="1055" y="409" width="56" height="38" fill="url(#gScreen)"/><polygon points="1055,409 1085,409 1068,447 1055,447" fill="#fff" opacity=".25"/>
          ${floorShadow(1162, 604, 36, 7)}
          <polygon points="1186,490 1194,484 1194,598 1186,602" fill="#284a60"/>
          <g filter="url(#fDrop)"><rect x="1132" y="490" width="54" height="112" rx="6" fill="url(#gBox)"/></g>
          <rect x="1134" y="492" width="50" height="4" rx="2" fill="#fff" opacity=".35"/>
          <rect x="1142" y="504" width="34" height="8" rx="3" fill="#152c3b"/><rect x="1142" y="504" width="34" height="3" rx="1.5" fill="#000" opacity=".4"/>
          <text x="1159" y="540" class="svg-box" text-anchor="middle">반</text><text x="1159" y="562" class="svg-box" text-anchor="middle">납</text><text x="1159" y="584" class="svg-box" text-anchor="middle">함</text>` })}
    </svg>`;
  }

  function vLibrary() {
    const n = countStamps();
    let banner = '';
    if (S.final.done) {
      banner = `<div class="banner good"><span aria-hidden="true">🏆</span><p>종합 미션까지 모두 끝냈어요! 도서관을 자유롭게 둘러보세요.</p><button type="button" class="btn" data-action="go" data-screen="complete">탐험 완료 화면 보기</button></div>`;
    } else if (allStamps() && !S.final.started) {
      banner = `<div class="banner glow-banner"><span aria-hidden="true">📜</span><p>탐험 도장을 모두 모았어요! 왼쪽 벽의 <strong>게시판</strong>에 종합 미션이 도착했어요.</p><button type="button" class="btn primary" data-action="go" data-screen="final">게시판 보기</button></div>`;
    } else if (nextMission()) {
      const nx = nextMission();
      const where = nx === 'find' ? '도서관 뒤쪽의 분야별 서가' : M[nx].place;
      banner = `<div class="banner next-banner"><span class="next-num" aria-hidden="true">${orderNum(nx)}</span>
        <p><span class="next-label">다음 탐험</span> <strong>${esc(M[nx].title)}</strong> — 아래 도서관 그림에서 반짝이는 <strong>${esc(where)}</strong>을(를) 찾아 눌러 보세요.</p></div>`;
    }
    const places = [['rules', '🪧 이용 안내판'], ['bookinfo', '📕 신간도서 진열대'], ['classify', '🛒 책 수레'], ['callnumber', '🏷️ 청구기호 포스터'], ['order', '🔢 열람 테이블 책꽂이'], ['search', '🔎 도서검색대'], ['desk', '🤲 대출·반납대'], ['final', '📜 게시판']];
    return `${topBar()}<main class="lib" id="main">
      <div class="lib-intro">
        <h1>${esc(S.name)} 탐험대원, 어디부터 탐험해 볼까요?</h1>
        <p>도서관 곳곳을 눌러 보세요. 이름표가 붙은 곳에서 탐험을 할 수 있어요. <span class="stamp-count">탐험 도장 <strong>${n}</strong> / 8</span></p>
      </div>
      ${banner}
      ${finalTracker()}
      <div class="scene-wrap">${librarySvg()}</div>
      <p class="scene-legend"><span aria-hidden="true">✓</span> 표시가 붙은 이름표는 탐험을 마친 곳이에요. 이름표의 번호는 탐험 순서예요.</p>
      <nav class="place-list" aria-label="장소 바로가기">
        <p>화면이 작다면 여기에서 장소를 골라도 돼요.</p>
        ${places.map(p => { const mid = missionOfScreen(p[0]); return `<button type="button" class="btn${isLocked(mid) ? ' locked' : ''}" data-action="go" data-screen="${p[0]}">${mid ? orderNum(mid) + '. ' : ''}${p[1]}${mid && S.stamps[mid] ? ' ✓' : isLocked(mid) ? ' 🔒' : ''}</button>`; }).join('')}
        <button type="button" class="btn${isLocked('find') ? ' locked' : ''}" data-action="go" data-screen="shelf" data-param="000">${orderNum('find')}. 🗄️ 분야별 서가${S.stamps.find ? ' ✓' : isLocked('find') ? ' 🔒' : ''}</button>
      </nav>
    </main>`;
  }

  /* ================= 1. 도서관 이용 ================= */

  function vRules() {
    const m = M.rules;
    const sel = ui.sel || {};
    const marks = ui.marks || {};
    const cards = m.cards.map((c, i) => {
      const on = !!sel[i];
      const mk = marks[i];
      return `<button type="button" class="rule-card${on ? ' on' : ''}${mk ? ' ' + mk : ''}" data-action="rule-toggle" data-id="${i}" aria-pressed="${on}">
        <span class="rc-check" aria-hidden="true">${on ? '✓' : ''}</span>
        <span class="rc-icon" aria-hidden="true">${c.icon}</span>
        <span class="rc-text">${esc(c.text)}</span>
        ${mk === 'wrong' ? '<span class="rc-note">🔁 다시 생각해 보기</span>' : ''}${mk === 'right' ? '<span class="rc-note">✔ 지켜야 할 행동</span>' : ''}
      </button>`;
    }).join('');
    return page(`${actHeader('rules', m.description)}
      ${ui.justDone === 'rules' ? successPanel('rules') : ''}
      <div class="rule-grid">${cards}</div>
      <div class="act-foot"><button type="button" class="btn primary big" data-action="rule-check">다 골랐어요 <span aria-hidden="true">✓</span></button></div>`);
  }

  /* ================= 2. 책 정보 ================= */

  function vBookinfo() {
    const m = M.bookinfo, b = m.book;
    const qi = Math.min(ui.q || 0, m.questions.length - 1);
    const q = m.questions[qi];
    const face = ui.face || 'front';
    const seen = ui.seen || {};
    const rg = (id, content, cls) => `<button type="button" class="rg ${cls}${seen[id] ? ' seen' : ''}${ui.hit === id ? ' hit' : ''}" data-action="bi-pick" data-id="${id}">${content}${seen[id] ? `<span class="rg-tag">${esc(m.regionNames[id])}</span>` : ''}</button>`;
    const [l1, l2] = callLines(b.callNumber);
    let faceHtml;
    if (face === 'front') {
      faceHtml = `<div class="bk front" style="--c:${b.color}">
        ${rg('front-title', `<span class="bk-title">${esc(b.title)}</span>`, 'r-title')}
        <div class="bk-art" aria-hidden="true"><span class="sun"></span><span class="hill"></span><span class="field"></span><i class="duck">🦆</i><i class="hen">🐔</i><i class="egg">🥚</i></div>
        ${rg('front-author', `${esc(b.author)} 글 · ${esc(b.illustrator)} 그림`, 'r-author')}
        ${rg('front-publisher', `<span class="pub-logo" aria-hidden="true">★</span> ${esc(b.publisher)}`, 'r-pub')}
      </div>`;
    } else if (face === 'back') {
      faceHtml = `<div class="bk back" style="--c:${b.color}">
        ${rg('back-summary', `<span class="sum-h">이런 이야기예요</span><span>${esc(b.summary)}</span>`, 'r-sum')}
        ${rg('back-barcode', `<span class="barcode" aria-hidden="true"></span><span class="isbn">${esc(b.isbn)}<br>${esc(b.price)}</span>`, 'r-bar')}
      </div>`;
    } else {
      faceHtml = `<div class="bk spine-face" style="--c:${b.color}">
        ${rg('spine-title', `<span class="v">${esc(b.title)}</span>`, 'r-stitle')}
        ${rg('spine-author', `<span class="v">${esc(b.author)}</span>`, 'r-sauthor')}
        ${rg('spine-publisher', `<span class="v small">${esc(b.publisher)}</span>`, 'r-spub')}
        ${rg('spine-label', `<span class="lbl">${esc(l1)}<br>${esc(l2)}</span>`, 'r-slabel')}
      </div>`;
    }
    const faces = [['front', '앞표지'], ['back', '뒷표지'], ['spine', '책등']];
    const dots = m.questions.map((_, i) => `<span class="dot${i < qi || (i === qi && ui.answered) ? ' done' : i === qi ? ' now' : ''}" aria-hidden="true"></span>`).join('');
    const allDone = ui.answered && qi === m.questions.length - 1;
    return page(`${actHeader('bookinfo', m.description)}
      ${ui.justDone === 'bookinfo' ? successPanel('bookinfo') : ''}
      <div class="bi-layout">
        <section class="q-card" aria-label="질문">
          <p class="q-num">질문 ${qi + 1} / ${m.questions.length} <span class="dots">${dots}</span></p>
          <h2>${esc(q.prompt)}</h2>
          ${ui.answered ? `<p class="q-explain">✔ ${esc(q.explain)}</p>` : '<p class="q-help">책에서 알맞은 곳을 직접 눌러 보세요.</p>'}
          ${ui.answered && !allDone ? `<button type="button" class="btn primary" data-action="bi-next">다음 질문 <span aria-hidden="true">→</span></button>` : ''}
        </section>
        <section class="book-stage" aria-label="책 살펴보기">
          <div class="face-tabs" role="group" aria-label="책의 어느 쪽을 볼까요?">
            ${faces.map(([f, l]) => `<button type="button" class="tab${face === f ? ' on' : ''}" aria-pressed="${face === f}" data-action="bi-face" data-id="${f}">${l}</button>`).join('')}
          </div>
          <div class="book-holder${ui.anim ? ' flip' : ''}">${faceHtml}</div>
          <p class="face-name">지금 보고 있는 곳: <strong>${faces.find(x => x[0] === face)[1]}</strong></p>
        </section>
      </div>`);
  }

  /* ================= 3. 도서 검색 ================= */

  function searchMatches(b, t, mode) {
    const inTitle = norm(b.title).includes(t);
    const inAuthor = norm(b.author).includes(t);
    const inSubject = [b.category].concat(b.keywords).some(k => {
      const n = norm(k);
      return n.includes(t) || (n.length >= 2 && t.includes(n));
    });
    if (mode === 'title') return inTitle;
    if (mode === 'author') return inAuthor;
    if (mode === 'subject') return inSubject;
    return inTitle || inAuthor || inSubject;
  }

  function runSearch(q, mode) {
    ui.query = q;
    ui.mode = mode;
    const t = norm(q);
    if (!t) {
      ui.results = null;
      say('검색어를 입력해 주세요. 예: 공룡', 'try');
      render();
      return;
    }
    ui.results = BOOKS.filter(b => searchMatches(b, t, mode)).sort(byCall).map(b => b.id);
    if (finalActive() && t.includes(norm(M.final.keyword))) { S.final.searched = true; save(); }
    if (ui.results.length) say(`‘${q.trim()}’ 검색 결과 ${ui.results.length}권을 찾았어요. 청구기호와 대출 상태를 살펴보세요.`, 'info');
    else say(`‘${q.trim()}’(으)로 찾은 책이 없어요. 다른 낱말로 검색하거나 검색 방식을 바꿔 보세요.`, 'try');
    render();
    const r = app.querySelector('.results');
    if (r) r.focus({ preventScroll: true });
  }

  function vSearch() {
    const m = M.search;
    const mode = ui.mode || 'all';
    const modes = [['all', '전체'], ['title', '제목'], ['author', '저자'], ['subject', '주제']];
    let results;
    if (!ui.results) {
      results = `<div class="results-empty"><span aria-hidden="true">🔎</span><p>검색어를 넣고 <b>[검색]</b> 단추를 눌러 보세요.</p></div>`;
    } else if (!ui.results.length) {
      results = `<div class="results-empty"><span aria-hidden="true">🤔</span><p>찾은 책이 없어요. 다른 낱말로 검색해 보세요.</p></div>`;
    } else {
      results = `<p class="res-count">검색 결과 <b>${ui.results.length}</b>권</p>` + ui.results.map(id => {
        const b = bookById(id);
        const avail = b.availability !== 'loaned';
        const mine = S.remembered === id;
        return `<article class="result${mine ? ' mine' : ''}">
          ${miniCover(b)}
          <div class="r-info">
            <h3>${esc(b.title)}</h3>
            <dl class="r-meta">
              <div><dt>저자</dt><dd>${esc(b.author)}</dd></div>
              <div><dt>출판사</dt><dd>${esc(b.publisher)}</dd></div>
              <div class="r-call"><dt>청구기호</dt><dd><span class="callno">${esc(b.callNumber)}</span></dd></div>
              <div><dt>대출 상태</dt><dd><span class="status ${avail ? 'ok' : 'out'}">${avail ? '✔ 대출 가능' : '⏳ 대출 중'}</span></dd></div>
            </dl>
          </div>
          ${avail
            ? `<button type="button" class="btn remember${mine ? ' on' : ''}" data-action="remember" data-id="${b.id}">${mine ? '📝 기억했어요' : '📝 청구기호 기억하기'}</button>`
            : `<button type="button" class="btn remember" disabled aria-disabled="true" title="대출 중인 책은 지금 서가에 없어요">⏳ 지금은 서가에 없어요</button>`}
        </article>`;
      }).join('');
    }

    let side = '';
    if (!S.stamps.search) {
      const st = [!!ui.results, !!ui.results, false];
      side += `<section class="mission-card"><p class="mc-label"><span aria-hidden="true">📋</span> 검색 미션</p><h2>${esc(searchMission().goal)}</h2>
        <ol class="steps">${m.steps.map((s, i) => `<li class="${st[i] ? 'done' : ''}"><span aria-hidden="true">${st[i] ? '✓' : i + 1}</span> ${esc(s)}</li>`).join('')}</ol></section>`;
    } else if (!finalActive()) {
      side += `<section class="mission-card calm"><p class="mc-label"><span aria-hidden="true">🔎</span> 자유 검색</p><p>궁금한 주제나 책 제목을 자유롭게 검색해 보세요.</p></section>`;
    }
    const rem = S.remembered ? bookById(S.remembered) : null;
    if (rem) {
      side += `<section class="memo-card"><p class="mc-label"><span aria-hidden="true">📝</span> 기억한 청구기호</p><p class="memo-call">${esc(rem.callNumber)}</p><p>${esc(rem.title)}</p></section>`;
    }

    return page(`${actHeader('search', S.stamps.search ? '' : m.description)}
      ${ui.justDone === 'search' ? successPanel('search', rem ? `<p class="memo-inline">📝 기억한 청구기호: <b>${esc(rem.callNumber)}</b> (${esc(rem.title)})</p>` : '') : ''}
      <div class="search-layout">
        <section class="monitor" aria-label="도서 검색 컴퓨터">
          <div class="monitor-top"><span><span aria-hidden="true">🔎</span> 우리 학교 도서관 책 찾기</span><span class="mt-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
          <form class="search-form" data-form="search" role="search">
            <fieldset class="modes"><legend>검색 방식</legend>
              ${modes.map(([v, l]) => `<label class="mode"><input type="radio" name="mode" value="${v}"${mode === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}
            </fieldset>
            <div class="search-row">
              <label class="sr" for="q">검색어</label>
              <input id="q" name="q" type="search" value="${esc(ui.query || '')}" placeholder="책 제목이나 주제를 입력하세요" autocomplete="off">
              <button type="submit" class="btn primary">검색</button>
            </div>
          </form>
          <div class="results" tabindex="-1" aria-label="검색 결과">${results}</div>
        </section>
        <aside class="side">${finalTracker()}${side}</aside>
      </div>`);
  }

  function remember(id) {
    const b = bookById(id);
    if (!b) return;
    const loaned = b.availability === 'loaned';
    if (finalActive() && !S.final.bookId && hasKeyword(b, M.final.keyword)) {
      if (loaned) { say('이 책은 지금 다른 친구가 빌려 가서 서가에 없어요. ‘대출 가능’인 책을 골라 볼까요?', 'try'); render(); return; }
      S.final.searched = true;
      S.final.bookId = id;
      S.remembered = id;
      save();
      say(`📝 ${b.callNumber}을(를) 기억했어요! 이제 도서관으로 돌아가 청구기호에 맞는 서가를 찾아보세요.`, 'good');
    } else if (!S.stamps.search && isSearchBook(id)) {
      if (loaned) { say('이 책은 지금 다른 친구가 빌려 가서 서가에 없어요. ‘대출 가능’인 책을 골라 볼까요?', 'try'); render(); return; }
      S.remembered = id;
      S.searchBook = id;
      award('search');
      ui.msg = null;
    } else {
      S.remembered = id;
      save();
      let extra = loaned ? ' 이 책은 지금 대출 중이라 서가에 없어요.' : '';
      if (finalActive() && !S.final.bookId) extra += ` 종합 미션에서는 ‘${M.final.keyword}’에 관한 책을 찾아야 해요.`;
      else if (!S.stamps.search) extra += ` 검색 미션: ${searchMission().goal}`;
      say(`📝 청구기호 ${b.callNumber}을(를) 기억했어요.${extra}`, loaned || extra ? 'try' : 'info');
    }
    render();
  }

  /* ================= 4. 청구기호 ================= */

  function vCall() {
    const m = M.callnumber;
    const seen = ui.seen || {};
    const n = Object.keys(seen).length;
    const all = n === m.parts.length;
    const part = p => `<button type="button" class="cn-part${seen[p.id] ? ' seen' : ''}${ui.part === p.id ? ' on' : ''}" data-action="cn-part" data-id="${p.id}">${esc(p.text)}${seen[p.id] ? '<span class="cn-check" aria-hidden="true">✓</span>' : ''}</button>`;
    const cur = m.parts.find(p => p.id === ui.part);
    const [l1, l2] = callLines(m.example);
    let quiz = '';
    if (all) {
      const qs = ui.qsel || {};
      const qm = ui.qmarks || {};
      quiz = `<section class="cn-quiz" aria-label="청구기호 활동">
        <h2>${esc(m.quiz.prompt)}</h2>
        <div class="label-grid">
          ${m.quiz.options.map((o, i) => {
            const [a, b] = callLines(o);
            return `<button type="button" class="label-opt${qs[i] ? ' on' : ''}${qm[i] ? ' ' + qm[i] : ''}" data-action="cn-opt" data-id="${i}" aria-pressed="${!!qs[i]}">
              <span class="lo-check" aria-hidden="true">${qs[i] ? '✓' : ''}</span><span class="lo-label">${esc(a)}<br>${esc(b)}</span>
              ${qm[i] === 'wrong' ? '<span class="lo-note">🔁 다시 보기</span>' : ''}${qm[i] === 'right' ? '<span class="lo-note">✔ ${m.quiz.shelf} ${esc(clsInfo(m.quiz.shelf).name)}</span>' : ''}
            </button>`;
          }).join('')}
        </div>
        <div class="act-foot"><button type="button" class="btn primary big" data-action="cn-check">다 골랐어요 <span aria-hidden="true">✓</span></button></div>
      </section>`;
    }
    return page(`${actHeader('callnumber', m.description)}
      ${ui.justDone === 'callnumber' ? successPanel('callnumber') : ''}
      <div class="cn-layout">
        <div class="cn-visual">
          <div class="cn-spine" aria-hidden="true" style="--c:${m.exampleColor || '#27427a'}"><span class="v">${esc(m.exampleTitle)}</span><span class="mini-lbl">${esc(l1)}<br>${esc(l2)}</span></div>
          <div class="cn-arrow" aria-hidden="true">→</div>
          <div class="cn-label-wrap">
            <p class="cn-cap">책등 아래 라벨을 크게 보면…</p>
            <div class="cn-label">
              <div class="cn-line">${m.parts.filter(p => p.line === 1).map(part).join('')}</div>
              <div class="cn-line">${m.parts.filter(p => p.line === 2).map(part).join('')}</div>
            </div>
            <p class="cn-count">살펴본 부분 <b>${n}</b> / ${m.parts.length}</p>
          </div>
        </div>
        <div class="cn-explain" aria-live="polite">
          ${cur ? `<h2>${esc(cur.text)} : ${esc(cur.label)}</h2><p>${esc(cur.explain)}</p>` : '<h2>라벨을 눌러 보세요</h2><p>라벨의 숫자와 글자를 하나씩 눌러 무슨 뜻인지 알아보세요.</p>'}
          ${n >= 2 ? '<p class="cn-lines"><b>위쪽 줄</b> = 분류번호 (어떤 분야의 책인지)<br><b>아래쪽 줄</b> = 도서기호 (누가 쓴 어떤 책인지)</p>' : ''}
        </div>
      </div>
      ${all ? `<p class="keyline"><span aria-hidden="true">🏠</span> ${esc(m.keySentence)}</p>` : ''}
      ${quiz}`);
  }

  /* ================= 5. 분류 ================= */

  function vClassify() {
    const m = M.classify;
    const placed = ui.placed || {};
    const sel = ui.sel && ui.sel.kind === 'classify' ? String(ui.sel.id) : null;
    const waiting = m.items.map((it, i) => placed[i] != null ? '' :
      `<button type="button" class="drag-book pastel${sel === String(i) ? ' on' : ''}" data-drag="classify" data-id="${i}" data-action="pick" aria-pressed="${sel === String(i)}" style="--c:${it.color}">
        <span class="db-icon" aria-hidden="true">${it.icon}</span><span class="db-title">${esc(it.title)}</span>
      </button>`).join('');
    const left = m.items.filter((_, i) => placed[i] == null).length;
    const shelves = CLS.map(c => {
      const here = m.items.map((it, i) => placed[i] === c.number ? `<span class="mini-book pastel" style="--c:${it.color}"><span aria-hidden="true">${it.icon}</span> ${esc(it.title)} ✓</span>` : '').join('');
      return `<div class="shelf-cell">
        <button type="button" class="shelf-box${sel != null ? ' ready' : ''}${ui.info === c.number ? ' info-on' : ''}" data-drop="${c.number}" data-action="drop" style="--c:${c.color};--t:${c.text || '#fff'}" aria-label="${c.number} ${esc(c.name)} 서가${sel != null ? '에 놓기' : ' 설명 보기'}">
          <span class="sb-sign"><b>${c.number}</b> ${esc(c.name)}</span>
          <span class="sb-icon" aria-hidden="true">${c.icon}</span>
          <span class="sb-books">${here}</span>
        </button>
        <button type="button" class="shelf-info-btn" data-action="cls-info" data-id="${c.number}" aria-label="${c.number} ${esc(c.name)} 서가 설명 보기" title="설명 보기">?</button>
      </div>`;
    }).join('');
    const ic = ui.info ? clsInfo(ui.info) : null;
    const infoPanel = ic
      ? `<section class="cls-info" style="--c:${ic.color};--t:${ic.text || '#fff'}" aria-live="polite">
          <span class="ci-icon" aria-hidden="true">${ic.icon}</span>
          <div class="ci-body">
            <h2><span class="ci-num">${ic.number}</span> ${esc(ic.name)} 서가</h2>
            <p>${esc(ic.description)}</p>
            <p class="ci-ex"><b>이런 책이 있어요</b> ${ic.examples.map(x => `<span>${esc(x)}</span>`).join('')}</p>
          </div>
          <button type="button" class="msg-close" data-action="cls-info" data-id="" aria-label="설명 닫기">✕</button>
        </section>`
      : `<p class="cls-info-hint"><span aria-hidden="true">💡</span> 서가를 누르거나 서가 오른쪽 위의 <b>?</b> 를 누르면 그 서가에 어떤 책이 모여 있는지 볼 수 있어요.</p>`;
    return page(`${actHeader('classify', m.description)}
      ${ui.justDone === 'classify' ? successPanel('classify') : ''}
      <section class="cart" aria-label="책 수레">
        <p class="cart-h"><span aria-hidden="true">🛒</span> 제자리를 기다리는 책 <b>${left}</b>권 <span class="how">책을 서가로 끌어다 놓거나, 책을 누른 다음 서가를 눌러요.</span></p>
        <div class="cart-books">${waiting || '<p class="empty">책 수레가 비었어요! 모두 제자리를 찾았어요.</p>'}</div>
      </section>
      ${infoPanel}
      <section class="shelf-grid" aria-label="분야별 서가">${shelves}</section>`);
  }

  function classifyDrop(i, num) {
    const m = M.classify;
    const it = m.items[i];
    if (!it) return;
    ui.placed = ui.placed || {};
    ui.wrong = ui.wrong || {};
    if (ui.placed[i] != null) return;
    const c = clsInfo(num);
    if (it.answer === num) {
      ui.placed[i] = num;
      if (m.items.every((_, k) => ui.placed[k] != null)) { award('classify'); ui.msg = null; }
      else say(`${it.title} → ${num} ${c.name} 서가! ${it.why}`, 'good');
    } else {
      ui.wrong[i] = (ui.wrong[i] || 0) + 1;
      ui.info = num;
      // 헷갈리기 쉬운 서가(trap)에는 따로 준비한 설명을 보여 줘요
      let text = it.trap && it.trap[num]
        ? `${it.trap[num]} 다시 골라 볼까요?`
        : `${num} ${c.name} 서가에는 ${c.examples.join(', ')} 같은 책이 있어요. ‘${it.title}’은 무엇에 관한 책일까요? 다른 서가도 살펴보세요.`;
      if (ui.wrong[i] >= 2) text += ` 💡 ${it.hint}`;
      say(text, 'try');
    }
  }

  /* ================= 6. 책 배열 ================= */

  function initialOrder(len, seed, items) {
    const idx = [...Array(len).keys()];
    const r = rng(seed * 131 + 7);
    for (let i = len - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const sorted = [...Array(len).keys()].sort((a, b) => compareCall(items[a].callNumber, items[b].callNumber));
    if (idx.join() === sorted.join()) idx.reverse();
    return idx;
  }

  function vOrder() {
    const m = M.order;
    const L = Math.min(ui.level || 0, m.levels.length - 1);
    const lv = m.levels[L];
    if (!ui.arr) ui.arr = initialOrder(lv.items.length, L + 1, lv.items);
    const sel = ui.sel && ui.sel.kind === 'order' ? +ui.sel.id : -1;
    const spines = ui.arr.map((k, pos) => {
      const it = lv.items[k];
      const [a, b] = callLines(it.callNumber);
      const bad = ui.bad && ui.bad.includes(pos);
      const on = sel === pos;
      return `<button type="button" class="spine big${on ? ' on' : ''}${bad ? ' bad' : ''}${ui.levelDone ? ' ok' : ''}"
        style="--c:${it.color};--h:${250 + (hashStr(it.title) % 4) * 12}px"
        data-drag="order" data-id="${pos}" data-drop="${pos}" data-action="order-pick" aria-pressed="${on}"
        aria-label="${pos + 1}번째 자리: ${esc(it.title)}, 청구기호 ${esc(it.callNumber)}">
        ${bad ? '<span class="sp-flag" aria-hidden="true">?</span>' : ''}
        <span class="sp-title">${esc(it.title)}</span><span class="sp-label">${esc(a)}<br>${esc(b)}</span>
      </button>`;
    }).join('');
    const levels = m.levels.map((l, i) => `<li class="${i < L || (i === L && ui.levelDone) ? 'done' : i === L ? 'now' : ''}"><span aria-hidden="true">${i < L || (i === L && ui.levelDone) ? '✓' : i + 1}</span> ${esc(l.title)}</li>`).join('');
    const last = L === m.levels.length - 1;
    return page(`${actHeader('order', m.description)}
      ${ui.justDone === 'order' ? successPanel('order') : ''}
      <ol class="level-steps" aria-label="단계">${levels}</ol>
      <section class="order-area" aria-label="책꽂이">
        <p class="order-inst"><b>${esc(lv.title)}</b> ${esc(lv.instruction)}</p>
        <p class="how">책을 끌어서 다른 책 위에 놓거나, 두 권을 차례로 누르면 자리가 바뀌어요.</p>
        <div class="order-shelf">
          <span class="dir left" aria-hidden="true">← 작은 번호</span><span class="dir right" aria-hidden="true">큰 번호 →</span>
          <div class="order-row">${spines}</div>
        </div>
        <div class="act-foot">
          ${ui.levelDone
            ? (last ? '' : `<button type="button" class="btn primary big" data-action="order-next">다음 단계 <span aria-hidden="true">→</span></button>`)
            : `<button type="button" class="btn primary big" data-action="order-check">다 꽂았어요 <span aria-hidden="true">✓</span></button>`}
        </div>
      </section>`);
  }

  function orderPick(pos) {
    if (ui.levelDone) return;
    const sel = ui.sel && ui.sel.kind === 'order' ? +ui.sel.id : -1;
    if (sel < 0) {
      ui.sel = { kind: 'order', id: pos };
      say('자리를 바꿀 다른 책을 눌러 보세요.', 'info');
    } else if (sel === pos) {
      ui.sel = null;
      ui.msg = null;
    } else {
      swapOrder(sel, pos);
    }
  }
  function swapOrder(a, b) {
    if (ui.levelDone || a === b || !ui.arr) return;
    [ui.arr[a], ui.arr[b]] = [ui.arr[b], ui.arr[a]];
    ui.sel = null;
    ui.bad = null;
    ui.msg = null;
  }
  function orderCheck() {
    const m = M.order;
    const L = ui.level || 0;
    const lv = m.levels[L];
    const cns = ui.arr.map(k => lv.items[k].callNumber);
    let bad = -1;
    for (let i = 0; i < cns.length - 1; i++) if (compareCall(cns[i], cns[i + 1]) > 0) { bad = i; break; }
    if (bad < 0) {
      ui.levelDone = true;
      ui.bad = null;
      if (L === m.levels.length - 1) { award('order'); ui.msg = null; }
      else say(`${lv.title} 성공! 책이 순서대로 꽂혔어요. 다음 단계로 가 볼까요?`, 'good');
      return;
    }
    ui.bad = [bad, bad + 1];
    const A = parseCall(cns[bad]), B = parseCall(cns[bad + 1]);
    let why;
    if (A.num !== B.num) why = `위쪽 숫자 ${A.cls}, ${B.cls} 중 어느 쪽이 작은지 왼쪽부터 하나씩 비교해 보세요.`;
    else if (A.surname !== B.surname) why = `위쪽 숫자가 같아요. 아래 줄의 첫 글자 ‘${A.surname}’, ‘${B.surname}’의 가나다 순서를 비교해 보세요.`;
    else if (A.digits !== B.digits) why = `글쓴이 성도 같아요! 다음 숫자 ${A.digits}, ${B.digits} 중 어느 쪽이 작은지 비교해 보세요.`;
    else why = `숫자까지 같아요! 마지막 제목 자음 ‘${A.rest}’, ‘${B.rest}’의 가나다 순서를 비교해 보세요.`;
    say(`‘?’ 표시된 두 책의 순서를 다시 확인해 보세요. ${why}`, 'try');
  }

  /* ================= 7. 서가 ================= */

  function spineBtn(b) {
    const [a, l2] = callLines(b.callNumber);
    const on = ui.pick === b.id;
    const pulled = ui.found === b.id;
    return `<button type="button" class="spine${on ? ' on' : ''}${pulled ? ' pulled' : ''}"
      style="--c:${b.cover.color};--h:${236 + (hashStr(b.id) % 4) * 12}px"
      data-action="spine" data-id="${b.id}" aria-pressed="${on}" aria-label="${esc(b.title)}, 청구기호 ${esc(b.callNumber)}">
      <span class="sp-title">${esc(b.title)}</span><span class="sp-label">${esc(a)}<br>${esc(l2)}</span>
    </button>`;
  }

  function vShelf() {
    const num = CLS.some(c => c.number === S.params.shelf) ? S.params.shelf : '800';
    const c = clsInfo(num);
    const target = ui.found ? null : currentTarget();
    const books = BOOKS.filter(b => classOf(b.callNumber) === num && b.availability !== 'loaned' && S.borrowed.indexOf(b.id) < 0 && (S.hand !== b.id || ui.found === b.id)).sort(byCall);
    const tabs = CLS.map(x => `<button type="button" class="shelf-tab${x.number === num ? ' on' : ''}" data-action="go-shelf" data-id="${x.number}" aria-current="${x.number === num ? 'true' : 'false'}" style="--c:${x.color};--t:${x.text || '#fff'}"><b>${x.number}</b><span>${esc(x.name)}</span></button>`).join('');

    let guide = '';
    if (target) {
      guide = classOf(target.callNumber) === num
        ? `<p class="shelf-note good"><span aria-hidden="true">✔</span> 알맞은 서가예요! 이제 책등 아래의 청구기호를 하나씩 비교해 보세요.</p>`
        : `<p class="shelf-note try"><span aria-hidden="true">🔁</span> 여기는 <b>${num} ${esc(c.name)}</b> 서가예요. 찾는 책의 청구기호를 다시 확인하고 다른 서가도 살펴보세요.</p>`;
    }
    // 화면 너비에 맞춰 한 칸에 꽂을 책 수를 정해요 (책등 1권 ≈ 69px)
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const avail = Math.min(vw, 1180) - 32 - (vw > 960 ? 320 : 0) - 48;
    const perRow = Math.max(4, Math.floor(avail / 69));
    const rows = chunk(books, perRow).map(r => `<div class="shelf-row">${r.map(spineBtn).join('')}</div>`).join('')
      || '<div class="shelf-row empty"><p>이 서가의 책은 지금 모두 대출 중이에요.</p></div>';

    let detail = '';
    const pb = ui.pick ? bookById(ui.pick) : null;
    if (pb && !ui.found) {
      detail = `<section class="book-detail" aria-label="고른 책">
        ${miniCover(pb, 'lg')}
        <div>
          <h2>${esc(pb.title)}</h2>
          <p>${esc(pb.author)} · ${esc(pb.publisher)}</p>
          <p>청구기호 <span class="callno">${esc(pb.callNumber)}</span></p>
          ${target ? `<button type="button" class="btn primary" data-action="take" data-id="${pb.id}"><span aria-hidden="true">🙌</span> 이 책을 꺼내요</button>` : '<p class="muted">지금은 찾아야 할 책이 없어요. 자유롭게 둘러보세요.</p>'}
        </div>
      </section>`;
    }

    let success = '';
    if (ui.found) {
      const deskBtn = `<button type="button" class="btn primary" data-action="go" data-screen="desk"><span aria-hidden="true">🤲</span> 대출대로 가기</button>`;
      if (ui.justDone === 'find') success = successPanel('find', '', deskBtn);
      else success = `<section class="success" aria-label="책 찾기 성공">${stampHtml('🎯', '찾았다', true, true)}<div class="success-body"><h2>찾았습니다!</h2><p>청구기호를 이용하면 많은 책 사이에서도 원하는 책을 찾을 수 있어요. 이제 대출대로 가져가 대출해 보세요.</p><div class="row">${deskBtn}</div></div></section>`;
    }

    const hintKey = S.stamps.find ? null : 'find';
    let side = '';
    if (target) {
      // 제목을 숨기면 책등 제목이 아니라 청구기호를 비교해서 찾게 돼요 (missions.js의 find.showTitle)
      side += `<section class="target-card"><p class="mc-label"><span aria-hidden="true">🎯</span> 찾아야 할 책</p>
        ${M.find.showTitle ? `<p class="tc-title">${esc(target.title)}</p>` : '<p class="tc-secret">제목은 비밀! 🤫 청구기호만 보고 찾아보세요.</p>'}
        <p class="tc-call"><span class="k">청구기호</span><span class="callno big">${esc(target.callNumber)}</span></p>
        ${!S.stamps.find ? '<p class="muted">사서 선생님이 부탁한 책이에요.</p>' : ''}</section>`;
    }
    if (S.hand && !ui.found) {
      const hb = bookById(S.hand);
      side += `<section class="memo-card"><p class="mc-label"><span aria-hidden="true">🤲</span> 내 손에 든 책</p><p>${esc(hb.title)}</p><button type="button" class="btn" data-action="go" data-screen="desk">대출대로 가기</button></section>`;
    }
    if (hintKey) side += hintBlock(hintKey);
    side = finalTracker() + side;

    return `${topBar()}<main class="act shelf-screen" id="main">
      <div class="act-head">
        <div class="act-title">
          <p class="place"><span aria-hidden="true">🗄️</span> 분야별 서가 ${S.stamps.find ? '<span class="done-badge">✓ 책 찾기 도장</span>' : ''}</p>
          <h1><span aria-hidden="true">${c.icon}</span> ${num} ${esc(c.name)} 서가</h1>
          <p class="lead">${esc(c.description)}</p>
        </div>
      </div>
      <nav class="shelf-tabs" aria-label="서가 고르기">${tabs}</nav>
      ${success}
      <div class="shelf-layout">
        <aside class="side">${side}</aside>
        <div class="shelf-main">
          ${guide}
          <div class="bookcase" style="--c:${c.color};--t:${c.text || '#fff'}">
            <div class="bc-sign"><b>${num}</b> ${esc(c.name)}</div>
            ${rows}
          </div>
          ${detail}
        </div>
      </div>
    </main>${msgDock()}`;
  }

  function take(id) {
    const target = currentTarget();
    const b = bookById(id);
    if (!target || !b) return;
    if (id === target.id) {
      S.hand = id;
      ui.found = id;
      ui.pick = null;
      if (!S.stamps.find && id === findTargetId()) {
        award('find');
      } else {
        S.final.found = true;
        save();
      }
      ui.msg = null;
      announce('찾았습니다!');
      return;
    }
    const T = parseCall(target.callNumber), P = parseCall(b.callNumber);
    if (T.num !== P.num) say(`이 책의 청구기호는 ${b.callNumber}예요. 찾는 책과 위쪽 숫자가 달라요. 청구기호를 다시 확인해 보세요.`, 'try');
    else say(`위쪽 숫자(${T.cls})는 같아요! 아래 줄의 ${P.mark}와(과) 찾는 책의 ${T.mark}를 앞부분부터 천천히 비교해 볼까요?`, 'try');
  }

  /* ================= 8. 대출 · 반납 ================= */

  /* ---------- 대출·반납 과정 보기 (짧은 애니메이션) ---------- */

  let filmTimer = null;
  const FILM_MS = 2400;

  function filmSteps(f) {
    const b = f.id ? bookById(f.id) : null;
    const name = S.name || '탐험대원';
    if (f.kind === 'card') return [
      { sc: 'card-in', cap: '도서 대출증을 대출대의 스캐너에 대요.' },
      { sc: 'card-scan', cap: '삑! 스캐너가 대출증의 바코드를 읽어요.' },
      { sc: 'card-ok', cap: `컴퓨터에 ${name} 학생의 이름이 떠요. 이제 빌릴 책을 대출대에 올려요!` }
    ];
    if (f.kind === 'loan') return [
      { sc: 'book-in', cap: '빌릴 책을 대출대에 올려요.' },
      { sc: 'book-scan', cap: '삑! 스캐너로 책 뒤의 바코드를 찍어요.' },
      { sc: 'book-record', cap: `컴퓨터에 ‘${name} 학생이 이 책을 빌렸어요’라고 기록돼요.` },
      { sc: 'book-due', cap: `반납일은 ${f.due}이에요. 이날까지 읽고 돌려줘요.` },
      { sc: 'book-out', cap: `대출 끝! ‘${b ? b.title : ''}’을(를) 받아 가요. 소중히 읽어요.` }
    ];
    return [
      { sc: 'ret-in', cap: '다 읽은 책을 반납함에 넣어요.' },
      { sc: 'ret-scan', cap: '삑! 반납된 책의 바코드를 찍어요.' },
      { sc: 'ret-record', cap: `컴퓨터에서 ${name} 학생의 대출 기록이 지워지고 ‘반납 완료’가 돼요.` },
      { sc: 'ret-shelf', cap: '책은 청구기호 순서대로 다시 서가에 꽂혀요. 이제 다른 친구가 빌릴 수 있어요!' }
    ];
  }

  function playFilm(f) {
    f.step = 0;
    ui.film = f;
    filmTick();
  }
  function filmTick() {
    clearTimeout(filmTimer);
    const f = ui.film;
    if (!f || S.screen !== 'desk') return;
    if (f.step < filmSteps(f).length - 1) {
      filmTimer = setTimeout(() => {
        if (ui.film !== f || S.screen !== 'desk') return;
        f.step++;
        render();
        filmTick();
      }, FILM_MS);
    }
  }

  function libCardHtml(extra) {
    return `<span class="lib-card${extra ? ' ' + extra : ''}" aria-hidden="true">
      <span class="lc-top">📚 우리 학교 도서관</span>
      <span class="lc-kind">도서 대출증</span>
      <span class="lc-name">${esc(S.name || '탐험대원')}</span>
      <span class="lc-bar"></span>
    </span>`;
  }

  function filmHtml() {
    const f = ui.film;
    const steps = filmSteps(f);
    const st = steps[f.step];
    const last = f.step === steps.length - 1;
    const b = f.id ? bookById(f.id) : null;
    const name = esc(S.name || '탐험대원');
    const item = f.kind === 'card' ? libCardHtml('fs-item')
      : `<span class="fs-item fs-book" style="--c:${b.cover.color}" aria-hidden="true"><span class="fb-icon">${b.cover.icon}</span><span class="fb-title">${esc(b.title)}</span><span class="fb-bar"></span></span>`;
    const screens = {
      'card-in': '<p class="scr-wait">🪪 대출증을 찍어 주세요</p>',
      'card-scan': '<p class="scr-wait">읽는 중<span class="dots3"></span></p>',
      'card-ok': `<p class="scr-h">👤 ${name}</p><p>빌린 책 <b>${S.borrowed.length}</b>권 / ${M.loan.maxBooks || 2}권</p><p class="scr-ok">✔ 대출할 수 있어요</p>`,
      'book-in': `<p class="scr-h">👤 ${name}</p><p class="scr-wait">📕 책을 찍어 주세요</p>`,
      'book-scan': `<p class="scr-h">👤 ${name}</p><p class="scr-wait">읽는 중<span class="dots3"></span></p>`,
      'book-record': b ? `<p class="scr-h">대출 기록</p><dl class="scr-rec"><dt>이름</dt><dd>${name}</dd><dt>책</dt><dd>${esc(b.title)}</dd><dt>청구기호</dt><dd>${esc(b.callNumber)}</dd><dt>대출일</dt><dd>${dueDateText(0)}</dd></dl>` : '',
      'book-due': `<p class="scr-h">반납일</p><p class="scr-big">${esc(f.due || '')}</p>`,
      'book-out': '<p class="scr-ok big">✔ 대출 완료</p>',
      'ret-in': '<p class="scr-wait">📥 반납할 책을 찍어 주세요</p>',
      'ret-scan': '<p class="scr-wait">읽는 중<span class="dots3"></span></p>',
      'ret-record': b ? `<p class="scr-h">대출 기록</p><dl class="scr-rec gone"><dt>이름</dt><dd>${name}</dd><dt>책</dt><dd>${esc(b.title)}</dd></dl><p class="scr-ok">✔ 반납 완료</p>` : '',
      'ret-shelf': '<p class="scr-ok big">✔ 반납 완료</p>'
    };
    const title = f.kind === 'card' ? '🪪 대출증 찍기' : f.kind === 'loan' ? '📕 책이 대출되는 과정' : '📥 책이 반납되는 과정';
    return `<div class="film-back">
      <section class="film" role="dialog" aria-modal="true" aria-labelledby="film-h">
        <div class="film-head"><h2 id="film-h">${title}</h2><span class="film-count">${f.step + 1} / ${steps.length}</span></div>
        <div class="film-stage sc-${st.sc} k-${f.kind}" aria-hidden="true">
          <span class="fs-monitor"><span class="fs-screen">${screens[st.sc] || ''}</span></span>
          ${f.kind === 'return' ? '<span class="fs-box"><i></i><b>반납함</b></span>' : ''}
          <span class="fs-desk"></span>
          <span class="fs-pad"><i class="fs-laser"></i></span>
          ${item}
          <span class="fs-beep">삑!</span>
          ${f.kind === 'loan' ? `<span class="fs-slip">📅 반납일<b>${esc(f.due || '')}</b></span>` : ''}
          ${f.kind === 'return' ? '<span class="fs-shelf">📚</span>' : ''}
        </div>
        <p class="film-cap" aria-live="polite"><span class="fc-num">${f.step + 1}</span> ${esc(st.cap)}</p>
        <div class="film-dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i <= f.step ? 'on' : ''}"></i>`).join('')}</div>
        <div class="film-foot">
          ${last
            ? `<button type="button" class="btn" data-action="film-replay">↺ 다시 보기</button><button type="button" class="btn primary big" data-action="film-close">확인 ✓</button>`
            : `<button type="button" class="btn primary" data-action="film-next">다음 ▶</button>`}
        </div>
      </section>
    </div>`;
  }

  function vDesk() {
    const m = M.loan;
    const hb = S.hand ? bookById(S.hand) : null;
    const sel = ui.sel && (ui.sel.kind === 'hand' || ui.sel.kind === 'borrowed' || ui.sel.kind === 'libcard') ? ui.sel.id : null;
    const card = (b, kind) => `<button type="button" class="drag-book wide${sel === b.id ? ' on' : ''}" data-drag="${kind}" data-id="${b.id}" data-action="pick" aria-pressed="${sel === b.id}" style="--c:${b.cover.color}">
      <span class="db-icon" aria-hidden="true">${b.cover.icon}</span>
      <span class="db-title">${esc(b.title)}<small>${esc(b.callNumber)}${kind === 'borrowed' && S.dueDates[b.id] ? ` · 반납일 ${esc(S.dueDates[b.id])}` : ''}</small></span>
    </button>`;
    const borrowed = S.borrowed.map(id => bookById(id)).filter(Boolean);

    let finalDone = '';
    if (ui.finalDone) {
      finalDone = `<section class="success" aria-label="종합 미션 성공">${stampHtml(M.final.icon, M.final.title, true, true)}<div class="success-body"><h2>대출 완료! 종합 미션 성공!</h2><p>${esc(M.final.successMessage)}</p>
        <div class="row"><button type="button" class="btn primary big" data-action="go" data-screen="complete"><span aria-hidden="true">🏆</span> 탐험 완료!</button></div></div></section>`;
    }

    const loanSteps = [['🪪 도서 대출증을 대출대에 찍기', ui.cardOn || S.loanedOnce || S.stamps.loan], ['찾은 책을 대출대에 올려 대출하기', S.loanedOnce || S.stamps.loan], ['다 읽은 책을 반납함에 넣기', S.stamps.loan]];
    let side = finalTracker();
    if (!S.stamps.loan) {
      side += `<section class="mission-card"><p class="mc-label"><span aria-hidden="true">📋</span> 대출·반납 미션</p>
        <ol class="steps">${loanSteps.map((s, i) => `<li class="${s[1] ? 'done' : ''}"><span aria-hidden="true">${s[1] ? '✓' : i + 1}</span> ${esc(s[0])}</li>`).join('')}</ol></section>`;
    }
    side += `<section class="rules-card"><p class="mc-label"><span aria-hidden="true">📌</span> 우리 도서관 대출 약속</p><ul>${m.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>${m.schoolNote ? `<p class="muted">${esc(m.schoolNote)}</p>` : ''}</section>`;

    let empty = '';
    if (!hb && !borrowed.length && !ui.justDone && !ui.finalDone) {
      empty = `<div class="banner"><span aria-hidden="true">🤔</span><p>아직 가지고 있는 책이 없어요. 먼저 분야별 서가에서 책을 찾아오세요.</p><button type="button" class="btn" data-action="go" data-screen="library">도서관으로</button></div>`;
    }

    return page(`${actHeader('loan', m.description)}
      ${ui.justDone === 'loan' ? successPanel('loan') : ''}
      ${finalDone}
      ${empty}
      <div class="desk-layout">
        <div class="desk-main">
          <section class="hand-area" aria-label="내 손에 든 것">
            <p class="area-h"><span aria-hidden="true">🤲</span> 내 손에 든 것</p>
            <div class="hand-row">
              <button type="button" class="card-btn${sel === 'card' ? ' on' : ''}${ui.cardOn ? ' used' : hb ? ' todo' : ''}" data-drag="libcard" data-id="card" data-action="pick" aria-pressed="${sel === 'card'}" aria-label="${esc(S.name || '탐험대원')}의 도서 대출증${ui.cardOn ? ' (찍었어요)' : ''}">
                ${libCardHtml()}${ui.cardOn ? '<span class="card-ok">✔ 찍었어요</span>' : hb ? '<span class="card-go">① 나를 대출대로!</span>' : ''}
              </button>
              ${hb ? card(hb, 'hand') : '<p class="empty">손에 든 책이 없어요.</p>'}
            </div>
          </section>
          <p class="how">${ui.cardOn || !hb ? '' : '<b>① 🪪 대출증을 대출대로 옮겨 찍고,</b> ② 빌릴 책을 대출대로 옮겨요. '}끌어다 놓거나, 누른 다음 놓을 곳을 눌러도 돼요.</p>
          <div class="zones">
            <button type="button" class="zone desk-zone${sel ? ' ready' : ''}" data-drop="desk" data-action="drop">
              <span class="z-art counter" aria-hidden="true"><i class="scanner"></i><i class="beam"></i></span>
              <b>대출대</b><small>빌릴 책을 여기에 올려요</small>
            </button>
            <button type="button" class="zone return-zone${sel ? ' ready' : ''}" data-drop="return" data-action="drop">
              <span class="z-art box" aria-hidden="true"><i></i></span>
              <b>반납함</b><small>다 읽은 책을 여기에 넣어요</small>
            </button>
          </div>
          <section class="borrowed-area" aria-label="내가 빌린 책">
            <p class="area-h"><span aria-hidden="true">🎒</span> 내가 빌린 책 <b>${borrowed.length}</b>권</p>
            <div class="borrowed-list">${borrowed.map(b => card(b, 'borrowed')).join('') || '<p class="empty">빌린 책이 없어요.</p>'}</div>
          </section>
        </div>
        <aside class="side">${side}</aside>
      </div>
      ${ui.film ? filmHtml() : ''}`);
  }

  function deskDrop(kind, id, zone) {
    if (kind === 'libcard') {
      if (zone !== 'desk') { say('도서 대출증은 반납함이 아니라 대출대에 찍어요.', 'try'); return; }
      if (ui.cardOn) { say('대출증은 이미 찍었어요. 이제 빌릴 책을 대출대에 올려요.', 'info'); return; }
      ui.cardOn = true;
      ui.msg = null;
      playFilm({ kind: 'card' });
      return;
    }
    const b = bookById(id);
    if (!b) return;
    if (kind === 'hand' && zone === 'desk' && !ui.cardOn) {
      say('책을 빌리려면 먼저 🪪 도서 대출증을 대출대에 찍어야 해요. 대출증으로 누가 빌리는지 확인해요.', 'try');
      return;
    }
    if (kind === 'hand' && zone === 'desk') {
      S.hand = null;
      if (S.borrowed.indexOf(id) < 0) S.borrowed.push(id);
      S.dueDates[id] = dueDateText(M.loan.loanDays || 7);
      S.loanedOnce = true;
      playFilm({ kind: 'loan', id, due: S.dueDates[id] });
      if (finalActive() && S.final.found && id === S.final.bookId) {
        S.final.borrowed = true;
        S.final.done = true;
        ui.finalDone = true;
        save();
        ui.msg = null;
        announce('대출 완료! 종합 미션 성공!');
        return;
      }
      save();
      say(`대출 완료! ‘${b.title}’의 반납일은 ${S.dueDates[id]}이에요.${S.stamps.loan ? '' : ' 다 읽었다고 생각하고 이번에는 반납함에 넣어 볼까요?'}`, 'good');
    } else if (kind === 'hand' && zone === 'return') {
      say('아직 빌리지 않은 책이에요. 먼저 대출대에 올려 대출해 보세요.', 'try');
    } else if (kind === 'borrowed' && zone === 'desk') {
      say('이미 빌린 책이에요. 다 읽은 책은 반납함에 넣어요.', 'try');
    } else if (kind === 'borrowed' && zone === 'return') {
      S.borrowed = S.borrowed.filter(x => x !== id);
      delete S.dueDates[id];
      playFilm({ kind: 'return', id });
      if (S.loanedOnce && !S.stamps.loan) { award('loan'); ui.msg = null; }
      else { save(); say(`반납 완료! ‘${b.title}’은 다시 서가로 돌아가요.`, 'good'); }
    }
  }

  /* ================= 종합 미션 · 완료 ================= */

  function vFinal() {
    const m = M.final;
    if (!allStamps()) {
      const list = STAMP_IDS.map(id => `<li class="${S.stamps[id] ? 'done' : ''}"><span aria-hidden="true">${S.stamps[id] ? '✓' : '○'}</span> ${esc(M[id].title)} <small>${S.stamps[id] ? '완료' : esc(M[id].place) + '에서'}</small></li>`).join('');
      return page(`<div class="act-head"><div class="act-title"><p class="place"><span aria-hidden="true">📌</span> 게시판</p><h1><span aria-hidden="true">🔒</span> 종합 미션은 아직 잠겨 있어요</h1>
        <p class="lead">탐험 도장 8개를 모두 모으면 사서 선생님의 미션 쪽지가 도착해요. 지금 ${countStamps()}개를 모았어요.</p></div></div>
        <ul class="lock-list">${list}</ul>
        <div class="act-foot"><button type="button" class="btn primary" data-action="go" data-screen="library"><span aria-hidden="true">🏠</span> 계속 탐험하기</button></div>`);
    }
    return page(`<div class="act-head"><div class="act-title"><p class="place"><span aria-hidden="true">📌</span> 게시판</p><h1><span aria-hidden="true">📜</span> 종합 미션</h1></div></div>
      <section class="letter">
        ${m.letter.map(l => `<p>${esc(l)}</p>`).join('')}
        <p class="from">— ${esc(m.from)}</p>
      </section>
      <section class="final-steps"><h2>이렇게 해결해 보세요</h2>
        <ol>${m.steps.map((s, i) => `<li class="${S.final.started && i < finalStep() ? 'done' : ''}">${S.final.started && i < finalStep() ? '✓ ' : ''}${esc(s)}</li>`).join('')}</ol>
      </section>
      <div class="act-foot">
        ${S.final.done ? '<button type="button" class="btn primary big" data-action="go" data-screen="complete">🏆 탐험 완료 화면 보기</button>'
          : S.final.started ? '<button type="button" class="btn primary big" data-action="go" data-screen="library">🏠 미션 계속하기</button>'
          : '<button type="button" class="btn primary big" data-action="final-start">미션 시작하기 <span aria-hidden="true">→</span></button>'}
      </div>`);
  }

  function vComplete() {
    const path = ['🔎 책 검색', '📋 검색 결과 확인', '🏷️ 청구기호 확인', '🗄️ 서가 찾기', '🔢 책이 꽂힌 순서 확인', '📕 원하는 책 찾기', '🤲 대출'];
    const stamps = STAMP_IDS.concat(S.final.done ? ['final'] : []).map(id => `<li>${stampHtml(M[id].icon, M[id].title, !!(id === 'final' ? S.final.done : S.stamps[id]))}</li>`).join('');
    return `${topBar()}<main class="complete" id="main">
      <div class="complete-card">
        <p class="confetti" aria-hidden="true">✦ ★ ✦</p>
        <h1>도서관 탐험 성공!</h1>
        <p class="c-name"><strong>${esc(S.name)}</strong> 탐험대원!<br>도서관 탐험을 완료했습니다.</p>
        <p>이제 스스로 책을 검색하고<br>청구기호를 확인하여<br>책장에서 원하는 책을 찾을 수 있습니다.</p>
        <ol class="path" aria-label="책을 찾는 순서">${path.map(p => `<li>${p}</li>`).join('')}</ol>
        <h2 class="c-sub">내가 모은 탐험 도장</h2>
        <ul class="stamp-grid">${stamps}</ul>
        <div class="row center">
          <button type="button" class="btn primary big" data-action="go" data-screen="library"><span aria-hidden="true">🏠</span> 도서관 다시 둘러보기</button>
          <button type="button" class="btn big" data-action="restart"><span aria-hidden="true">↺</span> 처음부터 시작하기</button>
        </div>
      </div>
    </main>`;
  }

  /* ================= 모달 ================= */

  function notebookModal() {
    const nx = nextMission();
    const items = STAMP_IDS.map((id, i) => {
      const m = M[id], d = !!S.stamps[id], isNext = id === nx, locked = isLocked(id);
      const note = d ? '' : isNext ? `▶ 지금 할 탐험이에요! 도서관에서 ‘${m.place}’을(를) 찾아 눌러 보세요.` : locked ? '🔒 앞 탐험을 끝내면 열려요' : '';
      return `<li><div class="nb-item${d ? ' done' : ''}${isNext ? ' next' : ''}${locked ? ' locked' : ''}">
        <span class="nb-num" aria-hidden="true">${i + 1}</span>
        ${stampHtml(m.icon, m.title, d)}
        <span class="nb-text"><b>${d ? '✓' : locked ? '🔒' : '□'} ${esc(m.title)}</b><small>${d ? '탐험 완료' : esc(m.place) + '에서 탐험해요'}</small>${note ? `<span class="nb-go">${esc(note)}</span>` : ''}</span>
      </div></li>`;
    }).join('');
    const f = S.final;
    const finalInner = `<span class="nb-num" aria-hidden="true">★</span>${stampHtml(M.final.icon, M.final.title, f.done)}
      <span class="nb-text"><b>${f.done ? '✓' : allStamps() ? '□' : '🔒'} 종합 미션</b><small>${f.done ? '탐험 완료' : allStamps() ? (f.started ? '진행 중이에요' : '게시판에서 시작해요') : '도장 8개를 모으면 열려요'}</small>${allStamps() && !f.done ? `<span class="nb-go">▶ 도서관 왼쪽 벽의 ‘게시판’을 찾아 눌러 보세요.</span>` : ''}</span>`;
    const finalRow = `<li class="final"><div class="nb-item final${f.done ? ' done' : allStamps() ? ' next' : ' locked'}">${finalInner}</div></li>`;
    return `<div class="modal-back" data-action="close-modal">
      <div class="modal notebook" role="dialog" aria-modal="true" aria-labelledby="nb-h" data-action="noop">
        <div class="modal-head"><h2 id="nb-h"><span aria-hidden="true">📒</span> ${esc(S.name)} 탐험대원의 탐험 기록</h2>
          <button type="button" class="btn" data-action="close-modal">닫기 ✕</button></div>
        <p class="nb-sum">모은 도장 <b>${countStamps()}</b> / 8 · 번호 순서대로 탐험해요. 도서관으로 돌아가 반짝이는 곳을 눌러 탐험을 시작하세요.</p>
        <ol class="nb-list">${items}${finalRow}</ol>
        <div class="act-foot"><button type="button" class="btn primary big" data-action="go" data-screen="library"><span aria-hidden="true">🏠</span> 도서관으로 돌아가기</button></div>
      </div>
    </div>`;
  }

  function restartModal() {
    return `<div class="modal-back" data-action="close-modal">
      <div class="modal small" role="alertdialog" aria-modal="true" aria-labelledby="rs-h" data-action="noop">
        <h2 id="rs-h">처음부터 다시 시작할까요?</h2>
        <p>지금까지 모은 탐험 기록과 이름이 모두 지워져요.</p>
        <div class="row">
          <button type="button" class="btn" data-action="close-modal">아니요, 계속할래요</button>
          <button type="button" class="btn danger" data-action="restart-yes">네, 처음부터 할래요</button>
        </div>
      </div>
    </div>`;
  }

  /* ================= 그리기 ================= */

  const VIEWS = {
    start: vStart, register: vRegister, library: vLibrary, rules: vRules, bookinfo: vBookinfo,
    search: vSearch, callnumber: vCall, classify: vClassify, order: vOrder, shelf: vShelf,
    desk: vDesk, final: vFinal, complete: vComplete
  };

  function focusKey(el) {
    if (!el || !el.dataset || !el.dataset.action) return null;
    const d = el.dataset;
    return [d.action, d.id || '', d.screen || '', d.param || '', d.drop || ''].join('|');
  }

  function render(changed) {
    if (TEACHER && !S.name) { S.name = '선생님'; if (S.screen === 'start' || S.screen === 'register') S.screen = 'library'; save(); }
    if (!S.name && S.screen !== 'start' && S.screen !== 'register') S.screen = 'register';
    if (S.screen === 'complete' && !S.final.done) S.screen = 'library';
    if (isLocked(missionOfScreen(S.screen))) S.screen = 'library';
    const key = changed ? null : focusKey(document.activeElement);
    const y = window.scrollY;
    app.innerHTML = (VIEWS[S.screen] || vLibrary)() + (modal === 'notebook' ? notebookModal() : modal === 'restart' ? restartModal() : '') + devPanel();
    ui.anim = false;
    document.body.classList.toggle('modal-open', !!modal || !!ui.film);
    if (ui.film) {
      const fb = app.querySelector('.film .btn.primary');
      if (fb) fb.focus({ preventScroll: true });
      return;
    }

    if (modal) {
      const b = app.querySelector('.modal button');
      if (b) b.focus();
      return;
    }
    if (changed) {
      window.scrollTo(0, 0);
      const input = app.querySelector('#explorer-name');
      const h = app.querySelector('h1');
      if (input) input.focus();
      else if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      return;
    }
    window.scrollTo(0, y);
    if (ui.justDone && !ui.scrolledTo) {
      ui.scrolledTo = true;
      const s = app.querySelector('.success');
      if (s) s.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    } else if (ui.finalDone && !ui.scrolledTo) {
      ui.scrolledTo = true;
      const s = app.querySelector('.success');
      if (s) s.scrollIntoView({ block: 'center' });
    }
    if (key) {
      const el = Array.prototype.find.call(app.querySelectorAll('[data-action]'), e => focusKey(e) === key);
      if (el) el.focus({ preventScroll: true });
    }
  }
  const prefersReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= 동작 ================= */

  function handleDrop(kind, id, target) {
    if (kind === 'classify') classifyDrop(+id, target);
    else if (kind === 'order') swapOrder(+id, +target);
    else if (kind === 'hand' || kind === 'borrowed' || kind === 'libcard') deskDrop(kind, id, target);
    ui.sel = null;
    render();
  }

  /* ---------- 점검 모드 (교사·개발용) ---------- */

  function devPanel() {
    if (!TEACHER) return '';
    const rows = STAMP_IDS.map((id, i) => `<li>
        <button type="button" class="dev-go" data-action="dev-go" data-id="${id}">${i + 1}. ${esc(M[id].title)}</button>
        <button type="button" class="dev-stamp${S.stamps[id] ? ' on' : ''}" data-action="dev-stamp" data-id="${id}" aria-pressed="${!!S.stamps[id]}" title="도장 주기/지우기">${S.stamps[id] ? '✓ 도장' : '도장 없음'}</button>
      </li>`).join('');
    return `<aside class="dev-panel${devOpen ? ' open' : ''}" aria-label="점검 도구">
      <button type="button" class="dev-head" data-action="dev-toggle" aria-expanded="${devOpen}">🛠 점검 도구 ${devOpen ? '▾' : '▸'}</button>
      ${devOpen ? `<div class="dev-body">
        <p class="dev-note">순서 잠금 꺼짐 · 누르면 그 탐험으로 바로 가요</p>
        <ol class="dev-list">${rows}</ol>
        <div class="dev-row">
          <button type="button" data-action="dev-go" data-id="library">🏠 도서관</button>
          <button type="button" data-action="dev-go" data-id="final">📜 종합 미션</button>
          <button type="button" data-action="dev-go" data-id="complete">🏆 완료 화면</button>
        </div>
        <div class="dev-row">
          <button type="button" data-action="dev-search" title="${esc(searchMission().goal)}">🔎 검색 미션 바꾸기 (${(S.searchPick || 0) % M.search.missions.length + 1}/${M.search.missions.length})</button>
        </div>
        <div class="dev-row">
          <button type="button" data-action="dev-all">도장 모두 받기</button>
          <button type="button" data-action="dev-clear">기록 지우기</button>
        </div>
      </div>` : ''}
    </aside>`;
  }

  function devReset() {
    const name = S.name;
    S = fresh();
    S.name = name;
  }

  const actions = {
    'dev-toggle'() { devOpen = !devOpen; render(); },
    'dev-go'(d) {
      modal = null;
      if (d.id === 'complete') {
        STAMP_IDS.forEach(id => { S.stamps[id] = true; });
        Object.assign(S.final, { started: true, searched: true, found: true, borrowed: true, done: true });
        go('complete');
      } else if (d.id === 'final') {
        STAMP_IDS.forEach(id => { S.stamps[id] = true; });
        go('final');
      } else if (d.id === 'find') {
        const t = bookById(findTargetId());
        go('shelf', { shelf: t ? classOf(t.callNumber) : '800' });
      } else if (d.id === 'loan') {
        // 대출 연습용으로 찾아야 할 책을 손에 쥐여 줘요
        if (!S.hand && !S.borrowed.length) S.hand = findTargetId();
        go('desk');
      } else {
        go(screenOf(d.id));
      }
    },
    'film-next'() {
      const f = ui.film;
      if (!f) return;
      f.step = Math.min(f.step + 1, filmSteps(f).length - 1);
      render();
      filmTick();
    },
    'film-replay'() { if (ui.film) { playFilm(ui.film); render(); } },
    'film-close'() { clearTimeout(filmTimer); ui.film = null; render(); },
    'dev-search'() {
      S.searchPick = ((S.searchPick || 0) + 1) % M.search.missions.length;
      S.searchBook = null;
      save();
      const t = bookById(findTargetId());
      toast(`🛠 검색 미션: ${searchMission().goal} (${t ? t.callNumber : ''})`);
      render();
    },
    'dev-stamp'(d) { S.stamps[d.id] = !S.stamps[d.id]; save(); render(); },
    'dev-all'() { STAMP_IDS.forEach(id => { S.stamps[id] = true; }); save(); toast('🛠 도장 8개를 모두 받았어요.'); render(); },
    'dev-clear'() { devReset(); save(); toast('🛠 탐험 기록을 지웠어요.'); go('library'); },
    go(d) {
      const mid = missionOfScreen(d.screen);
      if (isLocked(mid)) {
        const nx = nextMission();
        toast(`🔒 아직 열리지 않았어요. 먼저 ${orderNum(nx)}번 ‘${M[nx].title}’ 탐험을 끝내 주세요.`);
        announce(`아직 열리지 않았어요. 먼저 ${M[nx].title} 탐험을 끝내 주세요.`);
        return;
      }
      modal = null;
      go(d.screen, d.param ? { shelf: d.param } : {});
    },
    noop() {},
    memo() {
      const b = bookById(S.remembered);
      if (b) toast(`📝 기억한 책: ${b.title} · 청구기호 ${b.callNumber}`);
    },
    notebook() { modal = 'notebook'; render(); },
    restart() { modal = 'restart'; render(); },
    'close-modal'() { modal = null; render(); },
    'restart-yes'() {
      modal = null;
      S = fresh();
      try { sessionStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
      go('start');
    },
    'msg-close'() { ui.msg = null; render(); },
    hint(d) {
      const hints = getHints(d.id);
      let i = ui.hint && ui.hint.key === d.id ? ui.hint.i + 1 : 0;
      if (i >= hints.length) i = 0;
      ui.hint = { key: d.id, i };
      announce(`힌트 ${i + 1}: ${hints[i]}`);
      render();
    },
    pick(d, el) {
      const kind = el.dataset.drag;
      if (ui.sel && ui.sel.kind === kind && String(ui.sel.id) === String(d.id)) {
        ui.sel = null;
        ui.msg = null;
      } else {
        ui.sel = { kind, id: d.id };
        say(kind === 'classify' ? '이제 이 책을 놓을 서가를 눌러 보세요.' : kind === 'libcard' ? '이제 대출대를 눌러 대출증을 찍어 보세요.' : '이제 책을 놓을 곳(대출대 또는 반납함)을 눌러 보세요.', 'info');
      }
      render();
    },
    drop(d) {
      if (!ui.sel) {
        // 분류 활동: 책을 고르지 않고 서가를 누르면 그 서가의 설명을 보여 줘요
        if (S.screen === 'classify') { actions['cls-info']({ id: d.drop }); return; }
        // 대출대: 대출증을 아직 안 찍었으면 대출증부터 안내해요
        if (S.screen === 'desk' && d.drop === 'desk' && !ui.cardOn && S.hand) {
          say('먼저 노란 🪪 도서 대출증을 누른 다음, 대출대를 눌러 찍어 보세요. (끌어다 놓아도 돼요)', 'info'); render(); return;
        }
        say('먼저 옮길 책을 눌러 골라 주세요.', 'info'); render(); return;
      }
      handleDrop(ui.sel.kind, ui.sel.id, d.drop);
    },

    'rule-toggle'(d) {
      ui.sel = ui.sel || {};
      ui.sel[d.id] = !ui.sel[d.id];
      if (ui.marks) delete ui.marks[d.id];
      render();
    },
    'rule-check'() {
      const m = M.rules, sel = ui.sel || {};
      const marks = {};
      let wrong = null, missing = 0;
      m.cards.forEach((c, i) => {
        if (sel[i] && !c.correct) { marks[i] = 'wrong'; if (!wrong) wrong = c; }
        else if (sel[i] && c.correct) marks[i] = 'right';
        else if (!sel[i] && c.correct) missing++;
      });
      ui.marks = marks;
      if (wrong) say(`${wrong.feedback} ‘다시 생각해 보기’ 카드를 다시 눌러 선택을 빼 볼까요?`, 'try');
      else if (missing) say(`잘 골랐어요! 그런데 지켜야 할 행동이 ${missing}개 더 있어요. 다시 살펴보세요.`, 'try');
      else { award('rules'); ui.msg = null; }
      render();
    },

    'bi-face'(d) { ui.face = d.id; ui.anim = true; render(); },
    'bi-pick'(d) {
      const m = M.bookinfo;
      const qi = ui.q || 0;
      const q = m.questions[qi];
      ui.seen = ui.seen || {};
      ui.seen[d.id] = true;
      ui.hit = d.id;
      if (ui.answered) { render(); return; }
      const ok = q.targets.some(t => t === d.id || (t.slice(-1) === '*' && d.id.indexOf(t.slice(0, -1)) === 0));
      if (ok) {
        ui.answered = true;
        if (qi === m.questions.length - 1) { award('bookinfo'); ui.msg = null; }
        else say(q.explain, 'good');
      } else {
        say(`그곳은 ‘${m.regionNames[d.id]}’이에요. ${q.retry || '다른 곳을 살펴볼까요?'}`, 'try');
      }
      render();
    },
    'bi-next'() { ui.q = (ui.q || 0) + 1; ui.answered = false; ui.hit = null; ui.msg = null; render(); },

    remember(d) { remember(d.id); },

    'cn-part'(d) {
      ui.seen = ui.seen || {};
      ui.seen[d.id] = true;
      ui.part = d.id;
      const p = M.callnumber.parts.find(x => x.id === d.id);
      if (p) announce(`${p.label}: ${p.explain}`);
      render();
    },
    'cn-opt'(d) {
      ui.qsel = ui.qsel || {};
      ui.qsel[d.id] = !ui.qsel[d.id];
      if (ui.qmarks) delete ui.qmarks[d.id];
      render();
    },
    'cn-check'() {
      const q = M.callnumber.quiz, sel = ui.qsel || {};
      const marks = {};
      let wrong = null, missing = 0;
      q.options.forEach((o, i) => {
        const ok = classOf(o) === q.shelf;
        if (sel[i] && !ok) { marks[i] = 'wrong'; if (wrong == null) wrong = o; }
        else if (sel[i] && ok) marks[i] = 'right';
        else if (!sel[i] && ok) missing++;
      });
      ui.qmarks = marks;
      if (wrong) {
        const c = clsInfo(classOf(wrong));
        say(`${wrong}은(는) 첫 숫자가 ${wrong.charAt(0)}(으)로 시작해서 ${c.number} ${c.name} 서가에 있어요. 다시 골라 볼까요?`, 'try');
      } else if (missing) {
        say(`잘 골랐어요! ${q.shelf} ${clsInfo(q.shelf).name} 서가의 책이 ${missing}개 더 있어요. 첫 숫자를 살펴보세요.`, 'try');
      } else { award('callnumber'); ui.msg = null; }
      render();
    },

    'cls-info'(d) {
      ui.info = d.id && ui.info !== d.id ? d.id : null;
      if (ui.info) {
        const c = clsInfo(ui.info);
        announce(`${c.number} ${c.name} 서가: ${c.description} 예: ${c.examples.join(', ')}`);
      }
      render();
    },
    'order-pick'(d) { orderPick(+d.id); render(); },
    'order-check'() { orderCheck(); render(); },
    'order-next'() {
      ui.level = (ui.level || 0) + 1;
      ui.arr = null; ui.levelDone = false; ui.bad = null; ui.sel = null; ui.msg = null;
      render();
    },

    'go-shelf'(d) {
      S.params = { shelf: d.id };
      save();
      const keepHint = ui.hint;
      ui = { hint: keepHint };
      render(true);
    },
    spine(d) {
      if (ui.found) return;
      ui.pick = ui.pick === d.id ? null : d.id;
      ui.msg = null;
      render();
      const det = app.querySelector('.book-detail');
      if (det) det.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },
    take(d) { take(d.id); render(); },

    'final-start'() {
      S.final.started = true;
      save();
      toast('📜 종합 미션 시작! 먼저 도서검색대로 가 보세요.');
      go('library');
    }
  };

  /* ---------- 클릭 · 키보드 ---------- */

  let suppressClick = false;

  document.addEventListener('click', e => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el.dataset, el);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal) { modal = null; render(); return; }
    const el = e.target.closest && e.target.closest('[data-action][role="button"]');
    if (el && el.tagName.toLowerCase() === 'g' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      actions[el.dataset.action](el.dataset, el);
    }
  });

  document.addEventListener('submit', e => {
    const f = e.target;
    e.preventDefault();
    if (f.dataset.form === 'register') {
      const name = String(new FormData(f).get('name') || '').trim().slice(0, 10);
      if (!name) { ui.nameError = '이름을 입력해 주세요.'; render(); app.querySelector('#explorer-name').focus(); return; }
      S.name = name;
      go('library');
      toast(`${name} 탐험대원, 도서관에 온 것을 환영해요!`);
    } else if (f.dataset.form === 'search') {
      const fd = new FormData(f);
      runSearch(String(fd.get('q') || ''), String(fd.get('mode') || 'all'));
    }
  });

  document.addEventListener('input', e => {
    if (e.target.name === 'q') ui.query = e.target.value;
    if (e.target.name === 'name') ui.name = e.target.value;
  });
  document.addEventListener('change', e => {
    if (e.target.name === 'mode') ui.mode = e.target.value;
  });

  /* ---------- 끌어다 놓기 (마우스 · 터치 공통) ---------- */

  let drag = null;

  function dropAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('[data-drop]') : null;
  }

  document.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const el = e.target.closest('[data-drag]');
    if (!el) return;
    drag = { el, x: e.clientX, y: e.clientY, started: false, ghost: null, over: null, dx: 0, dy: 0 };
  });

  document.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
      drag.started = true;
      const r = drag.el.getBoundingClientRect();
      drag.dx = drag.x - r.left;
      drag.dy = drag.y - r.top;
      const g = drag.el.cloneNode(true);
      g.classList.add('ghost');
      g.removeAttribute('data-action');
      g.style.width = r.width + 'px';
      g.style.height = r.height + 'px';
      document.body.appendChild(g);
      drag.ghost = g;
      drag.el.classList.add('dragging');
    }
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
    const t = dropAt(e.clientX, e.clientY);
    const valid = t && t !== drag.el ? t : null;
    if (valid !== drag.over) {
      if (drag.over) drag.over.classList.remove('drop-over');
      if (valid) valid.classList.add('drop-over');
      drag.over = valid;
    }
    e.preventDefault();
  }, { passive: false });

  function endDrag(e, cancel) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.started) return;
    if (d.ghost) d.ghost.remove();
    d.el.classList.remove('dragging');
    if (d.over) d.over.classList.remove('drop-over');
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 80);
    if (cancel) return;
    const t = dropAt(e.clientX, e.clientY);
    if (t && t !== d.el) handleDrop(d.el.dataset.drag, d.el.dataset.id, t.dataset.drop);
  }
  document.addEventListener('pointerup', e => endDrag(e, false));
  document.addEventListener('pointercancel', e => endDrag(e, true));

  // 서가 화면은 창 크기가 바뀌면 책꽂이 칸을 다시 나눠요
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (S.screen === 'shelf' && !drag) render(); }, 200);
  });

  /* ---------- 시작 ---------- */
  render(true);

  // 자동 점검용 (화면에는 영향 없음)
  window.__libraryExplorer = {
    get state() { return S; }, get ui() { return ui; },
    actions, go, runSearch, handleDrop, compareCall, classOf, render
  };
})();
