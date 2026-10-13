/* ============================================================
   소담 (Sodam) — 상세 페이지 인터랙션
   ※ 페이지에 표시되는 모든 수치·후기는 가상 데이터입니다.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 스크롤 위치 변화를 한 곳에서 알린다 (rAF/IO가 멈춰도 동작하도록) */
  var tickers = [];
  var lastTick = 0;
  function onTick() {
    var now = Date.now();
    if (now - lastTick < 16) { return; }
    lastTick = now;
    for (var i = 0; i < tickers.length; i++) { tickers[i](); }
  }
  window.addEventListener('scroll', onTick, { passive: true });
  window.addEventListener('resize', onTick);

  /* 요소가 화면에 들어왔는지 직접 계산 — IntersectionObserver가 못 도는 환경 대비 */
  function inView(el, ratio) {
    var r = el.getBoundingClientRect();
    if (r.height === 0 && r.width === 0) { return false; }
    var margin = (window.innerHeight || 0) * (ratio || 0.12);
    // 위로 지나간 요소(top < 0)도 참 — 한 번 넘어간 건 보여준 것으로 친다
    return r.top < (window.innerHeight - margin);
  }

  /* ---------- 스크롤 리빌 ---------- */
  (function reveal() {
    var items = $$('.reveal');
    items.forEach(function (el) { if (el.dataset.d) { el.style.setProperty('--d', el.dataset.d); } });

    if (REDUCE) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var pending = items.slice();
    function sweep() {
      for (var i = pending.length - 1; i >= 0; i--) {
        if (inView(pending[i])) {
          pending[i].classList.add('is-in');
          pending.splice(i, 1);
        }
      }
      if (!pending.length) { tickers.splice(tickers.indexOf(sweep), 1); }
    }

    tickers.push(sweep);
    sweep();
  }());

  /* ---------- 선언문: 어절 → 이모지 순차 등장 ---------- */
  (function manifesto() {
    var host = $('#manifestoText');
    if (!host) return;
    var words = $$('.w', host);
    var emos = $$('.emo', host);
    var played = false;

    function play() {
      if (played) { return; }
      played = true;

      if (REDUCE) {
        words.concat(emos).forEach(function (el) { el.classList.add('is-in'); });
        return;
      }
      words.forEach(function (el, i) {
        setTimeout(function () { el.classList.add('is-in'); }, i * 110);
      });
      var after = words.length * 110 + 320;
      emos.forEach(function (el, i) {
        setTimeout(function () { el.classList.add('is-in'); }, after + i * 220);
      });
    }

    function check() {
      if (played) { tickers.splice(tickers.indexOf(check), 1); return; }
      if (inView(host, 0.25)) { play(); }
    }

    tickers.push(check);
    check();
  }());

  /* ---------- 서비스: 세로 스크롤 → 가로 이동 (데스크톱) ---------- */
  (function services() {
    var section = $('#services');
    var track = $('#svcTrack');
    if (!section || !track) return;

    var desktop = window.matchMedia('(min-width: 1024px)');

    function update() {
      if (!desktop.matches || REDUCE) { track.style.transform = ''; return; }

      var sticky = section.firstElementChild;
      var travel = section.offsetHeight - sticky.offsetHeight;
      if (travel <= 0) { track.style.transform = ''; return; }

      var passed = -section.getBoundingClientRect().top;
      var progress = Math.min(Math.max(passed / travel, 0), 1);

      var overflow = track.scrollWidth - track.parentElement.clientWidth;
      if (overflow <= 0) { track.style.transform = ''; return; }

      track.style.transform = 'translate3d(' + (-overflow * progress).toFixed(1) + 'px,0,0)';
    }

    tickers.push(update);
    desktop.addEventListener('change', update);
    update();
  }());

  /* ---------- 내비: 모바일 메뉴 ---------- */
  (function nav() {
    var burger = $('.nav__burger');
    var menu = $('#navmenu');
    if (!burger || !menu) return;

    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-open', !open);
      $('.sr', burger).textContent = open ? '메뉴 열기' : '메뉴 닫기';
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
      }
    });
  }());

  /* ---------- 공통: 칩 ---------- */
  function buildChips(host, names, onChange) {
    host.innerHTML = '';
    names.forEach(function (name) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = name;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        onChange();
      });
      host.appendChild(b);
    });
  }
  function selectedOf(host) {
    return $$('.chip[aria-pressed="true"]', host).map(function (b) { return b.textContent; });
  }

  /* ============================================================
     냉장고 구조대
     ============================================================ */
  (function fridge() {
    var host = $('#fridgeChips');
    var out = $('#fridgeOut');
    if (!host || !out) return;

    var PANTRY = ['대파', '애호박', '두부', '계란', '양파', '감자', '당근', '김치', '참치캔',
                  '콩나물', '시금치', '표고버섯', '가지', '소면', '밥', '라면'];

    function render() {
      var have = selectedOf(host);
      out.innerHTML = '';
      if (!have.length) {
        out.innerHTML = '<p class="recipes__empty">냉장고에 남은 재료를 눌러주세요. 그걸로 만들 수 있는 메뉴를 찾아드려요.</p>';
        return;
      }

      var matched = sodamMatch(have, 3);

      if (!matched.length) {
        out.innerHTML = '<p class="recipes__empty">이 조합으로 만들 수 있는 메뉴가 데모 목록에 없어요. 다른 재료를 눌러보세요.</p>';
        return;
      }

      matched.forEach(function (m) {
        var card = document.createElement('div');
        card.className = 'recipe';
        var need = m.missing.length
          ? '<div class="recipe__need"><span class="recipe__need-label">부족한 재료</span>'
            + m.missing.map(function (n) { return '<span class="tag">' + n + '</span>'; }).join('') + '</div>'
          : '<div class="recipe__need"><span class="tag tag--ok">지금 있는 재료로 바로 가능</span></div>';
        card.innerHTML = '<div class="recipe__top">'
          + '<span class="recipe__name">' + m.r.name + '</span>'
          + '<span class="recipe__meta">약 ' + m.r.min + '분 · 인덕션 1구</span>'
          + '<span class="recipe__have">가진 재료 ' + m.hit.length + '/' + m.r.needs.length + '</span>'
          + '</div>' + need;
        out.appendChild(card);
      });

      var note = document.createElement('p');
      note.className = 'recipes__empty';
      note.innerHTML = '부족한 재료만 <strong>1인분 분량</strong>으로 담아요. 자주 남는 재료는 다음엔 더 적게 추천해요.';
      out.appendChild(note);
    }

    buildChips(host, PANTRY, render);
    ['대파', '애호박', '계란'].forEach(function (n) {
      var b = $$('.chip', host).filter(function (x) { return x.textContent === n; })[0];
      if (b) { b.setAttribute('aria-pressed', 'true'); }
    });
    render();
  }());

  /* ============================================================
     끼니 담기 — 색 박스 + 가로 누적 바
     ============================================================ */
  (function meals() {
    var taps = $('#mealTaps');
    var bar = $('#mealBar');
    var legend = $('#mealLegend');
    var totalEl = $('#mealTotal');
    var desc = $('#mealBarDesc');
    var savedEl = $('#savedNum');
    if (!taps || !bar) return;

    // 순서 고정, 순환 금지 — 브랜드 키트의 채소 5색
    var CATS = [
      { key: '집밥',   color: 'var(--veg-1)', box: '#DCEFD2', n: 3 },
      { key: '배달',   color: 'var(--veg-3)', box: '#FBE1CE', n: 9 },
      { key: '외식',   color: 'var(--veg-4)', box: '#E6DFF7', n: 4 },
      { key: '편의점', color: 'var(--veg-5)', box: '#FADCE8', n: 6 },
      { key: '건너뜀', color: 'var(--veg-2)', box: '#D6EAF4', n: 4 }
    ];
    var saved = 12;

    function render() {
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
        + CATS.map(function (c) { return c.key + ' ' + c.n + '끼'; }).join(', ')
        + '. 전체 ' + total + '끼.';

      $$('.tap', taps).forEach(function (b) {
        var c = CATS.filter(function (x) { return x.key === b.dataset.key; })[0];
        $('.tap__n', b).textContent = c.n + '끼';
      });
      savedEl.textContent = String(saved);
    }

    taps.innerHTML = '';
    CATS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tap';
      b.dataset.key = c.key;
      b.style.setProperty('--tapcolor', c.box);
      b.style.setProperty('--tapink', '#16231A');
      b.innerHTML = '<span>' + c.key + '</span><span class="tap__n">0끼</span>';
      b.addEventListener('click', function () {
        c.n += 1;
        // 집밥을 담으면 재료를 살린 것 — 북극성 지표가 올라간다
        if (c.key === '집밥') { saved += 2; }
        render();
      });
      taps.appendChild(b);
    });
    render();
  }());

  /* ============================================================
     쉬어가는 날
     ============================================================ */
  (function restday() {
    var btn = $('#sodayBtn');
    var out = $('#sodayOut');
    if (!btn || !out) return;

    var LINES = [
      '쉬어가는 날도 있어요.\n다음 끼니만 가볍게 가볼까요?',
      '괜찮아요.\n내일 아침엔 계란 하나 삶아둘게요.',
      '오늘은 그냥 넘어가요.\n냉장고에 두부가 남아 있어요.',
      '편의점도 끼니예요.\n다음 끼니에 국물 하나 더해봐요.',
      '하루 쉬어도 기록은 이어져요.\n살린 재료는 그대로예요.'
    ];
    var i = -1;
    btn.addEventListener('click', function () {
      i = (i + 1) % LINES.length;
      out.textContent = LINES[i];
      out.style.whiteSpace = 'pre-line';
    });
  }());

  /* ============================================================
     끼니 돌아보기 — 놓친 재료 TOP 3 (가상 데이터)
     ============================================================ */
  (function missed() {
    var host = $('#missBars');
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

  /* ============================================================
     후기 마키 (가상 후기)
     ============================================================ */
  (function voices() {
    var track = $('#voicesTrack');
    if (!track) return;

    var DATA = [
      { img: 'img/hero.jpg',      alt: '원목 트레이에 차려진 1인분 한 끼',
        quote: '장 보면 늘 반은 버렸는데, 남은 재료로 뭘 해먹을지 알려주니까 버리는 게 확 줄었어요.', who: '20대 · 김O영' },
      { img: 'img/feature-2.webp', alt: '네 개의 트레이에 차려진 서로 다른 한 끼',
        quote: '한 달 치를 한 장으로 보니까 제가 배달을 얼마나 시켰는지 처음 알았어요. 혼내지 않는 게 좋아요.', who: '30대 · 이O준' },
      { img: 'img/restday.webp',   alt: '냄비째 올린 라면과 밥 한 공기',
        quote: '라면 먹은 날에도 "쉬어가는 날"이라고 해주는 게 의외로 큰 위로가 됐어요.', who: '20대 · 박O하' },
      { img: 'img/portion.webp',   alt: '1인분씩 손질해 담은 재료들',
        quote: '1인분 소분으로 받으니까 대파가 썩을 일이 없어요. 자취 3년 만에 처음이에요.', who: '30대 · 정O민' },
      { img: 'img/feature-3.webp', alt: '남은 재료와 그 재료로 끓인 찌개 한 상',
        quote: '퇴근하고 냉장고 열어서 재료 누르면 메뉴가 떠요. 고민하는 시간이 없어진 게 제일 좋아요.', who: '20대 · 최O서' },
      { img: 'img/room.webp',      alt: '좁은 원룸에서 요리하는 모습',
        quote: '인덕션 하나로 할 수 있는 메뉴만 보여줘서 좋아요. 다른 앱은 다 못 만드는 것만 나왔거든요.', who: '30대 · 한O규' },
      { img: 'img/person.webp',    alt: '혼자 식탁에서 한 끼를 먹는 모습',
        quote: '혼자 먹는 밥도 기록해두니까 챙겨 먹게 되더라고요. 누가 봐주는 느낌이 들어요.', who: '20대 · 윤O진' },
      { img: 'img/kit.webp',       alt: '소담 웰컴 키트 구성품',
        quote: '계량 스푼 받고 나서 1인분 감이 잡혔어요. 이제 장 볼 때 양 조절이 돼요.', who: '30대 · 오O빈' }
    ];

    function card(d) {
      return '<li class="voice" tabindex="0">'
        + '<img src="' + d.img + '" alt="' + d.alt + '" loading="lazy" decoding="async">'
        + '<div class="voice__overlay">'
        + '<p class="voice__quote">' + d.quote + '</p>'
        + '<p class="voice__who">' + d.who + '</p>'
        + '</div></li>';
    }
    // 끊김 없이 흐르도록 두 벌을 이어 붙인다
    track.innerHTML = DATA.map(card).join('') + DATA.map(card).join('');
  }());

}());
