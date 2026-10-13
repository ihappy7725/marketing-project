/* ============================================================
   소담 — 대시보드 (초안)
   ※ 모든 수치는 가상 데이터입니다.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var CATS = [
    { key: '집밥',   color: 'var(--veg-1)', box: '#DCEFD2', n: 3 },
    { key: '배달',   color: 'var(--veg-3)', box: '#FBE1CE', n: 9 },
    { key: '외식',   color: 'var(--veg-4)', box: '#E6DFF7', n: 4 },
    { key: '편의점', color: 'var(--veg-5)', box: '#FADCE8', n: 6 },
    { key: '건너뜀', color: 'var(--veg-2)', box: '#D6EAF4', n: 4 }
  ];
  var saved = 12;
  var have = ['대파', '애호박', '계란', '두부', '김치', '양파'];

  var TITLES = {
    home: '오늘도 한 끼, 소담하게',
    fridge: '냉장고에 뭐가 남았나요?',
    recipes: '오늘은 뭘 만들어볼까요?',
    calendar: '이번 달, 어떻게 먹었을까요?',
    report: '리포트'
  };

  /* ---------- 화면 전환 ---------- */
  (function router() {
    function go(view) {
      $$('.view').forEach(function (v) {
        var on = v.dataset.view === view;
        v.classList.toggle('is-on', on);
        v.hidden = !on;
      });
      $$('.rail__item[data-view]').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.view === view);
      });
      $('#dashTitle').textContent = TITLES[view] || '소담';
      window.scrollTo(0, 0);
      if (view === 'calendar') { renderCalendar(); }
    }
    $$('.rail__item[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.view); });
    });
    $$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.goto); });
    });
  }());

  /* ---------- 날짜 ---------- */
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  (function today() {
    var el = $('#dashDate');
    if (!el) return;
    var d = new Date();
    el.textContent = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + DOW[d.getDay()] + '요일';
  }());

  /* ---------- 공통 렌더 ---------- */
  function renderReport() {
    var bar = $('#dBar'), legend = $('#dLegend'), totalEl = $('#dTotal'), desc = $('#dBarDesc');
    if (!bar) return;
    var total = CATS.reduce(function (s, c) { return s + c.n; }, 0);

    bar.innerHTML = '';
    if (total === 0) {
      bar.innerHTML = '<div class="chart__empty">아직 담은 끼니가 없어요</div>';
    } else {
      CATS.forEach(function (c) {
        if (c.n === 0) return;
        var seg = document.createElement('div');
        seg.className = 'chart__seg';
        seg.style.flex = c.n + ' 0 0';
        seg.style.background = c.color;
        seg.title = c.key + ' ' + c.n + '끼 (' + Math.round(c.n / total * 100) + '%)';
        bar.appendChild(seg);
      });
    }
    // 색만으로 구분하지 않도록 범례에 이름 + 수치를 함께 표기
    legend.innerHTML = CATS.map(function (c) {
      return '<li><span class="legend__sw" style="background:' + c.color + '"></span>'
        + c.key + ' <span class="legend__n">' + c.n + '</span></li>';
    }).join('');
    totalEl.textContent = String(total);
    desc.textContent = '이번 달 끼니 구성: '
      + CATS.map(function (c) { return c.key + ' ' + c.n + '끼'; }).join(', ') + '. 전체 ' + total + '끼.';
    $('#dSaved').textContent = String(saved);
  }

  function recipeCard(m) {
    var need = m.missing.length
      ? '<div class="drecipe__need"><span class="drecipe__label">부족</span>'
        + m.missing.map(function (n) { return '<span class="tag">' + n + '</span>'; }).join('') + '</div>'
      : '<div class="drecipe__need"><span class="tag tag--ok">바로 만들 수 있어요</span></div>';
    return '<div class="drecipe"><div class="drecipe__top">'
      + '<span class="drecipe__name">' + m.r.name + '</span>'
      + '<span class="drecipe__meta">' + m.r.cat + ' · 약 ' + m.r.min + '분 · 가진 재료 ' + m.hit.length + '/' + m.r.needs.length + '</span>'
      + '</div>' + need + '</div>';
  }

  function renderSuggest() {
    [['#homeSuggest', 3], ['#rescueOut', 6]].forEach(function (pair) {
      var host = $(pair[0]);
      if (!host) return;
      if (!have.length) {
        host.innerHTML = '<p class="dempty">냉장고가 비었어요. 재료를 추가해보세요.</p>';
        return;
      }
      var m = sodamMatch(have, pair[1]);
      host.innerHTML = m.length
        ? m.map(recipeCard).join('')
        : '<p class="dempty">이 조합으로 만들 수 있는 메뉴가 없어요.</p>';
    });
  }

  /* ---------- 오늘의 끼니 담기 ---------- */
  (function slots() {
    var host = $('#slots'), foot = $('#todayFoot');
    if (!host) return;
    var picked = {};

    $$('.slot', host).forEach(function (slot) {
      var name = slot.dataset.slot, opts = $('.slot__opts', slot);
      CATS.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'opt'; b.textContent = c.key;
        b.style.setProperty('--optcolor', c.box);
        b.setAttribute('aria-pressed', 'false');

        b.addEventListener('click', function () {
          var was = picked[name];
          $$('.opt', opts).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });

          if (was === c.key) {
            delete picked[name];
            c.n -= 1;
            if (c.key === '집밥') { saved -= 2; }
            $('.slot__val', slot).textContent = '아직 안 담았어요';
            slot.classList.remove('is-set');
          } else {
            if (was) {
              var prev = CATS.filter(function (x) { return x.key === was; })[0];
              prev.n -= 1;
              if (was === '집밥') { saved -= 2; }
            }
            picked[name] = c.key;
            c.n += 1;
            if (c.key === '집밥') { saved += 2; }
            b.setAttribute('aria-pressed', 'true');
            $('.slot__val', slot).textContent = c.key;
            slot.classList.add('is-set');
          }

          var done = Object.keys(picked).length;
          foot.textContent = done === 3
            ? '오늘 세 끼 다 담았어요. 15초면 충분했죠?'
            : done + '끼 담았어요. 남은 ' + (3 - done) + '끼도 한 번만 눌러주세요.';
          renderReport();
        });
        opts.appendChild(b);
      });
    });
  }());

  /* ---------- 냉장고: 추가 / 삭제 ---------- */
  (function fridge() {
    var form = $('#addForm'), input = $('#addInput'), msg = $('#addMsg');
    var listEl = $('#haveList'), countEl = $('#haveCount');
    var quick = $('#quickAdd'), datalist = $('#pantryList');
    if (!form) return;

    var ALL = [];
    SODAM_PANTRY.forEach(function (g) { ALL = ALL.concat(g.items); });
    datalist.innerHTML = ALL.map(function (n) { return '<option value="' + n + '"></option>'; }).join('');

    function renderHaves() {
      countEl.textContent = have.length;
      listEl.innerHTML = have.length
        ? have.map(function (n) {
            return '<li><button class="have" type="button" data-name="' + n + '">'
              + n + '<span class="have__x" aria-hidden="true">×</span>'
              + '<span class="sr">빼기</span></button></li>';
          }).join('')
        : '<li class="dempty">아직 담은 재료가 없어요.</li>';
      renderSuggest();
      renderQuick();
    }

    function renderQuick() {
      quick.innerHTML = SODAM_PANTRY.map(function (g) {
        var chips = g.items.map(function (n) {
          var on = have.indexOf(n) !== -1;
          return '<button class="chip chip--sm" type="button" data-add="' + n + '" aria-pressed="'
            + on + '"' + (on ? ' disabled' : '') + '>' + n + '</button>';
        }).join('');
        return '<div class="quickadd__g"><p class="quickadd__t">' + g.group + '</p><div class="chips">' + chips + '</div></div>';
      }).join('');
    }

    function add(name) {
      name = (name || '').trim();
      if (!name) { return; }
      if (have.indexOf(name) !== -1) { msg.textContent = '"' + name + '"는 이미 냉장고에 있어요.'; return; }
      have.push(name);
      msg.textContent = '"' + name + '" 담았어요.';
      renderHaves();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      add(input.value);
      input.value = '';
      input.focus();
    });

    quick.addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]');
      if (b) { add(b.dataset.add); }
    });

    listEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-name]');
      if (!b) return;
      have = have.filter(function (n) { return n !== b.dataset.name; });
      msg.textContent = '"' + b.dataset.name + '" 뺐어요.';
      renderHaves();
    });

    renderHaves();
  }());

  /* ---------- 레시피 ---------- */
  (function recipes() {
    var catsEl = $('#recipeCats'), grid = $('#recipeGrid');
    var search = $('#recipeSearch'), countEl = $('#recipeCount');
    if (!grid) return;

    var cat = '전체', q = '';

    catsEl.innerHTML = SODAM_CATS.map(function (c) {
      return '<button class="rcat' + (c === '전체' ? ' is-on' : '') + '" type="button" role="tab" data-cat="' + c + '">' + c + '</button>';
    }).join('');

    function render() {
      var list = SODAM_RECIPES.filter(function (r) {
        if (cat !== '전체' && r.cat !== cat) { return false; }
        if (!q) { return true; }
        return r.name.indexOf(q) !== -1 || r.needs.some(function (n) { return n.indexOf(q) !== -1; });
      });

      countEl.textContent = list.length + '개의 레시피';
      grid.innerHTML = list.length ? list.map(function (r) {
        var mine = r.needs.filter(function (n) { return have.indexOf(n) !== -1; });
        var ready = mine.length === r.needs.length;
        return '<li class="rcard' + (ready ? ' is-ready' : '') + '">'
          + '<div class="rcard__top"><span class="rcard__cat">' + r.cat + '</span>'
          + (ready ? '<span class="rcard__ready">지금 가능</span>' : '') + '</div>'
          + '<h3>' + r.name + '</h3>'
          + '<p class="rcard__meta">약 ' + r.min + '분 · ' + r.lv + ' · 재료 ' + r.needs.length + '개</p>'
          + '<ul class="rcard__needs">'
          + r.needs.map(function (n) {
              return '<li class="' + (have.indexOf(n) !== -1 ? 'is-have' : '') + '">' + n + '</li>';
            }).join('')
          + '</ul>'
          + '<p class="rcard__have">가진 재료 ' + mine.length + '/' + r.needs.length + '</p>'
          + '</li>';
      }).join('') : '<li class="dempty">찾는 레시피가 없어요. 다른 재료로 검색해보세요.</li>';
    }

    catsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      cat = b.dataset.cat;
      $$('.rcat', catsEl).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      render();
    });
    search.addEventListener('input', function () { q = search.value.trim(); render(); });

    render();
  }());

  /* ---------- 캘린더 ---------- */
  var calCursor = new Date();
  calCursor.setDate(1);

  // 날짜별 가상 기록 — 같은 날은 늘 같은 값이 나오도록 고정 해시 사용
  function dayData(y, m, d) {
    var seed = (y * 10000 + (m + 1) * 100 + d);
    var h = (seed * 2654435761) % 4294967296;
    var r = (h >>> 8) % 100;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var that = new Date(y, m, d);
    if (that > today) { return null; }          // 미래는 기록 없음
    if (r < 18) { return { lv: 0, meals: [] }; } // 기록 안 한 날
    var pool = ['집밥', '배달', '외식', '편의점'];
    var meals = ['아침', '점심', '저녁'].map(function (slot, i) {
      return { slot: slot, kind: pool[(r + i * 7) % 4] };
    });
    var home = meals.filter(function (x) { return x.kind === '집밥'; }).length;
    return { lv: home >= 2 ? 3 : (home === 1 ? 2 : 1), meals: meals };
  }

  function renderCalendar() {
    var grid = $('#calGrid'), title = $('#calTitle'), streak = $('#calStreak');
    if (!grid) return;

    var y = calCursor.getFullYear(), m = calCursor.getMonth();
    title.textContent = y + '년 ' + (m + 1) + '월';

    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var html = '', logged = 0;

    for (var i = 0; i < first; i++) { html += '<li class="cal__cell cal__cell--pad" aria-hidden="true"></li>'; }
    for (var d = 1; d <= days; d++) {
      var data = dayData(y, m, d);
      var lv = data ? data.lv : -1;
      if (data && data.lv > 0) { logged++; }
      var label = y + '년 ' + (m + 1) + '월 ' + d + '일';
      html += '<li class="cal__cell"><button class="cal__day" type="button" data-d="' + d + '"'
        + ' data-lv="' + lv + '" aria-label="' + label + '">'
        + '<span class="cal__n">' + d + '</span></button></li>';
    }
    grid.innerHTML = html;
    streak.textContent = logged;
  }

  (function calendarEvents() {
    var grid = $('#calGrid'), detail = $('#calDetail');
    if (!grid) return;

    $('#calPrev').addEventListener('click', function () {
      calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar();
    });
    $('#calNext').addEventListener('click', function () {
      calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar();
    });

    grid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]');
      if (!b) return;
      $$('.cal__day', grid).forEach(function (x) { x.classList.toggle('is-sel', x === b); });

      var y = calCursor.getFullYear(), m = calCursor.getMonth(), d = +b.dataset.d;
      var data = dayData(y, m, d);
      var head = '<header class="dcard__head"><h2>' + (m + 1) + '월 ' + d + '일</h2><p>'
        + (data && data.lv > 0 ? '이날 담은 끼니예요' : '기록이 없는 날이에요') + '</p></header>';

      if (!data || data.lv === 0) {
        detail.innerHTML = head + '<p class="dempty">이날은 담긴 기록이 없어요. 괜찮아요, 이어서 담으면 돼요.</p>';
        return;
      }
      var rows = data.meals.map(function (x) {
        var c = CATS.filter(function (k) { return k.key === x.kind; })[0];
        return '<li class="calrow"><span class="calrow__slot">' + x.slot + '</span>'
          + '<span class="calrow__kind" style="background:' + (c ? c.box : '#eee') + '">' + x.kind + '</span></li>';
      }).join('');
      var note = data.lv === 3 ? '집밥을 두 번 이상 챙긴 날이에요.'
        : (data.lv === 2 ? '집밥 한 번. 나쁘지 않아요.' : '쉬어간 날이에요. 그런 날도 있죠.');
      detail.innerHTML = head + '<ul class="calrows">' + rows + '</ul>'
        + '<p class="dcard__foot">' + note + '</p>';
    });
  }());

  /* ---------- 놓친 재료 ---------- */
  (function missed() {
    var host = $('#dMiss');
    if (!host) return;
    var DATA = [{ name: '애호박', n: 3 }, { name: '대파', n: 2 }, { name: '두부', n: 1 }];
    var max = Math.max.apply(null, DATA.map(function (d) { return d.n; }));
    host.innerHTML = DATA.map(function (d) {
      return '<li class="hbar"><span class="hbar__name">' + d.name + '</span>'
        + '<span class="hbar__track"><span class="hbar__fill" style="width:'
        + Math.round(d.n / max * 100) + '%"></span></span>'
        + '<span class="hbar__val">' + d.n + '회</span></li>';
    }).join('');
  }());

  /* ---------- 쉬어가는 날 ---------- */
  (function rest() {
    var btn = $('#dRestBtn'), out = $('#dRestOut');
    if (!btn) return;
    var LINES = [
      '쉬어가는 날도 있어요.\n다음 끼니만 가볍게 가볼까요?',
      '괜찮아요.\n내일 아침엔 계란 하나 삶아둘게요.',
      '오늘은 그냥 넘어가요.\n냉장고에 두부가 남아 있어요.',
      '편의점도 끼니예요.\n다음 끼니에 국물 하나 더해봐요.',
      '하루 쉬어도 기록은 이어져요.\n살린 재료는 그대로예요.'
    ];
    var i = -1;
    btn.addEventListener('click', function () { i = (i + 1) % LINES.length; out.textContent = LINES[i]; });
  }());

  renderReport();
  renderSuggest();
  renderCalendar();
}());
