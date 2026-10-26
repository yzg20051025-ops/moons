/* ============================================================
 * app.js — 页面逻辑
 * ============================================================ */
(function () {
  'use strict';

  var A = window.MoonAstro;
  var MR = window.MoonRender;
  var D2R = Math.PI / 180;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ============================================================
   * 星空背景
   * ============================================================ */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawSky() {
    var c = $('#sky');
    if (!c) return;
    var w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    var g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    var bg = g.createRadialGradient(w * 0.5, h * 0.12, 0, w * 0.5, h * 0.1, Math.max(w, h) * 0.95);
    bg.addColorStop(0, '#0c1424');
    bg.addColorStop(0.42, '#070c17');
    bg.addColorStop(1, '#03050a');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    var blobs = [
      [0.20, 0.16, 0.50, 'rgba(54,82,148,0.16)'],
      [0.84, 0.26, 0.44, 'rgba(96,70,140,0.10)'],
      [0.58, 0.98, 0.60, 'rgba(38,68,116,0.12)'],
      [0.08, 0.78, 0.38, 'rgba(66,56,116,0.08)'],
      [0.72, 0.62, 0.34, 'rgba(40,70,120,0.06)']
    ];
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var gr = g.createRadialGradient(w * b[0], h * b[1], 0, w * b[0], h * b[1], Math.max(w, h) * b[2]);
      gr.addColorStop(0, b[3]);
      gr.addColorStop(0.55, b[3].replace(/[\d.]+\)$/, '0.03)'));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }

    /* 银河带 */
    g.save();
    g.translate(w * 0.48, h * 0.52);
    g.rotate(-0.46);
    var mw = g.createLinearGradient(0, -h * 0.26, 0, h * 0.26);
    mw.addColorStop(0, 'rgba(186,204,255,0)');
    mw.addColorStop(0.45, 'rgba(186,204,255,0.045)');
    mw.addColorStop(0.5, 'rgba(206,220,255,0.075)');
    mw.addColorStop(0.55, 'rgba(186,204,255,0.045)');
    mw.addColorStop(1, 'rgba(186,204,255,0)');
    g.fillStyle = mw;
    g.fillRect(-w * 1.2, -h * 0.26, w * 2.4, h * 0.52);
    g.restore();

    /* 星星 */
    var rnd = mulberry32(20260214);
    var count = Math.min(900, Math.round((w * h) / 2600));
    var tints = ['255,255,255', '205,222,255', '255,236,214', '224,214,255'];
    for (var s = 0; s < count; s++) {
      var x = rnd() * w;
      var y = rnd() * h;
      var big = Math.pow(rnd(), 8);
      var r = 0.35 + big * 1.5;
      var alpha = 0.14 + rnd() * 0.55 + big * 0.3;
      var tint = tints[Math.floor(rnd() * tints.length)];
      g.fillStyle = 'rgba(' + tint + ',' + alpha.toFixed(3) + ')';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();

      if (big > 0.55) {
        var flare = g.createRadialGradient(x, y, 0, x, y, r * 12);
        flare.addColorStop(0, 'rgba(' + tint + ',0.35)');
        flare.addColorStop(0.3, 'rgba(' + tint + ',0.08)');
        flare.addColorStop(1, 'rgba(' + tint + ',0)');
        g.fillStyle = flare;
        g.beginPath();
        g.arc(x, y, r * 12, 0, Math.PI * 2);
        g.fill();

        g.strokeStyle = 'rgba(' + tint + ',0.16)';
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(x - r * 7, y); g.lineTo(x + r * 7, y);
        g.moveTo(x, y - r * 7); g.lineTo(x, y + r * 7);
        g.stroke();
      }
    }
  }

  /* ============================================================
   * 日期工具
   * ============================================================ */

  function beijingToday() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function shiftISO(iso, days) {
    var p = iso.split('-');
    var t = Date.UTC(+p[0], +p[1] - 1, +p[2]) + days * 86400000;
    var d = new Date(t);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function toNoon(iso) {
    var p = iso.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 4, 0, 0));   // 北京时间 12:00
  }

  function isoValid(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return false;
    var y = +v.slice(0, 4);
    return y >= 1900 && y <= 2100;
  }

  function fmtGreg(iso) { return iso.replace(/-/g, '.'); }

  function fmtPretty(iso) {
    var p = iso.split('-');
    return p[0] + ' / ' + p[1] + ' / ' + p[2];
  }

  function weekday(iso) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return '日一二三四五六'[d.getUTCDay()];
  }

  function fmtDist(km) { return (km / 10000).toFixed(1) + ' 万公里'; }

  /* ============================================================
   * 状态
   * ============================================================ */

  var store = {
    a: { date: beijingToday(), name: '' },
    b: { date: shiftISO(beijingToday(), -25), name: '' }
  };

  var view = { a: null, b: null };
  var token = { a: 0, b: 0 };

  var els = {
    cardA: $('.card[data-slot="a"]'),
    cardB: $('.card[data-slot="b"]'),
    canvasA: $('.card[data-slot="a"] .moon-canvas'),
    canvasB: $('.card[data-slot="b"] .moon-canvas'),
    overlay: $('#overlayCanvas'),
    score: $('[data-out="score"]'),
    scoreBar: $('[data-out="scoreBar"]'),
    overlayNote: $('[data-out="overlapNote"]')
  };

  function computeAll() {
    var da = toNoon(store.a.date);
    var db = toNoon(store.b.date);
    return {
      a: A.moonState(da),
      b: A.moonState(db),
      lunarA: A.lunarDate(da),
      lunarB: A.lunarDate(db),
      days: Math.round(Math.abs(da - db) / 86400000)
    };
  }

  var READINGS = {
    '新月': '你出生时月亮藏在暗处。你习惯先看、再开口，很多决定在别人看不见的地方就已经做完。',
    '娥眉月': '薄薄一弯，刚刚开始。你对世界还留着试探的余地，也容易被一点点光打动。',
    '上弦月': '一半亮，一半暗。你身上有一股“就现在”的劲，决定了的事很少回头。',
    '盈凸月': '离圆满只差一点。你看起来笃定，其实一直在等一句确认。',
    '满月': '月亮最亮的那晚。你的喜欢和不喜欢都写在脸上，也因此常常照亮别人。',
    '亏凸月': '圆满之后，开始把光收回来。你懂得退场，也懂得在热闹里给自己留一块安静。',
    '下弦月': '又只剩一半。你想清楚了才说，别人觉得你冷静，其实你只是慢一点。',
    '残月': '天亮前最后一点月光。你不太喜欢告别，但总能把结束处理得体面。'
  };

  /* ============================================================
   * 文案
   * ============================================================ */

  function verdictOf(score, st, days) {
    var a = st.a, b = st.b;
    if (days === 0) {
      return {
        line: '同一天出生的人，抬头就是同一轮月亮。',
        sub: '你们共享同一个夜晚，也共享同一片月光。'
      };
    }
    if (a.illum < 0.02 && b.illum < 0.02) {
      return {
        line: '两枚新月，藏在同一片夜色里。',
        sub: '你们出生时都看不见月亮——它把光留到了别处。'
      };
    }
    if (a.illum > 0.985 && b.illum > 0.985) {
      return {
        line: '两轮满月，几乎分毫不差。',
        sub: '你们抬头时，月光都是圆的。'
      };
    }
    if (score >= 97) return { line: '几乎是同一轮月亮。', sub: '月亮走了一整圈，又回到了你们出生的位置。' };
    if (score >= 90) return { line: '月光几乎原样重叠。', sub: '只差一点点，像同一轮月亮被记错了细节。' };
    if (score >= 78) return { line: '大半轮月亮，是重合的。', sub: '你们看见的月色，大部分是同一片。' };
    if (score >= 60) return { line: '同一片月光，多出来一点，少一点。', sub: '轮廓很像，只是明暗的界线挪了挪位置。' };
    if (score >= 40) return { line: '一半相合，一半各自的阴晴。', sub: '有重合的部分，也有只属于一个人的夜色。' };
    if (score >= 20) return { line: '两轮月亮，只在一处相遇。', sub: '一个正在长圆，一个正在消瘦，擦肩而过。' };
    if (a.illum < 0.06 || b.illum < 0.06) {
      return {
        line: '一轮几乎看不见，一轮还亮着。',
        sub: '一个把月亮藏了起来，一个还留在光里。'
      };
    }
    if (a.illum > 0.4 && b.illum > 0.4) {
      return { line: '一个盈，一个亏，你们的月亮正好互补。', sub: '把两半月光拼起来，才是一整轮月亮。' };
    }
    return { line: '两轮月亮，几乎照不到同一处。', sub: '各自的夜色，各自的明暗。' };
  }

  /* ============================================================
   * 渲染
   * ============================================================ */

  function pixelSize(canvas, cap) {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var css = rect.width > 0 ? rect.width : 320;
    return Math.round(Math.min(cap || 760, Math.max(220, css * dpr)));
  }

  function setText(el, value) { if (el && el.textContent !== value) el.textContent = value; }

  function paintMoon(slot, st, animate) {
    var canvas = slot === 'a' ? els.canvasA : els.canvasB;
    var px = pixelSize(canvas, 760);
    var t = ++token[slot];

    if (animate && view[slot] !== null) {
      MR.animate(canvas, view[slot], st.cycle, st.waxing, px, function () {
        if (token[slot] === t) MR.paint(canvas, st, px);
      });
      canvas.setAttribute('aria-label', st.phaseZh + '，照亮 ' + (st.illum * 100).toFixed(0) + '%');
    } else {
      MR.paint(canvas, st, px);
      canvas.setAttribute('aria-label', st.phaseZh + '，照亮 ' + (st.illum * 100).toFixed(0) + '%');
    }
    view[slot] = st.cycle;
  }

  function animateScore(from, to) {
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / 700);
      var e = 1 - Math.pow(1 - t, 3);
      var v = from + (to - from) * e;
      els.score.textContent = String(Math.round(v));
      if (t < 1) requestAnimationFrame(frame);
      else els.score.textContent = String(Math.round(to));
    }
    requestAnimationFrame(frame);
  }

  var lastScore = 0;

  function refresh(animate, skipPaint) {
    var st = computeAll();
    var da = st.a, db = st.b;

    /* 月亮 */
    if (!skipPaint) {
      paintMoon('a', da, animate);
      paintMoon('b', db, animate);
    }

    /* 名字 */
    var nameA = store.a.name.trim();
    var nameB = store.b.name.trim();
    var nA = nameA || '我';
    var nB = nameB || 'TA';
    var youA = nameA || '你';

    /* 月晕随亮度变化 */
    var haloA = $('.halo', els.cardA);
    var haloB = $('.halo', els.cardB);
    if (haloA) haloA.style.opacity = (0.42 + 0.58 * Math.min(1, da.illum * 1.2)).toFixed(2);
    if (haloB) haloB.style.opacity = (0.42 + 0.58 * Math.min(1, db.illum * 1.2)).toFixed(2);

    /* 卡片 A */
    fillCard(els.cardA, store.a.date, da, st.lunarA, nameA);
    fillCard(els.cardB, store.b.date, db, st.lunarB, nameB);

    /* 重合度 */
    var score = A.overlapScore(da, db);
    if (st.days === 0) score = 100;
    var diff = A.angularDiff(da.cycle, db.cycle);
    if (animate && Math.abs(score - lastScore) > 0.4) animateScore(lastScore, score);
    else els.score.textContent = String(Math.round(score));
    lastScore = score;
    els.scoreBar.style.width = Math.max(2, Math.round(score)) + '%';
    setText(els.overlayNote, '相位差 ' + diff.toFixed(1) + '°');

    /* 结论 */
    var v = verdictOf(score, st, st.days);
    setText($('[data-out="verdictLine"]'), v.line);
    setText($('[data-out="verdictSub"]'), v.sub + ' · ' + youA + '是' + da.phaseZh + '，' + nB + '是' + db.phaseZh + '，相隔 ' + st.days + ' 天。');

    /* 叠影 */
    if (!skipPaint) {
      var ov = els.overlay;
      MR.paintOverlay(ov, da, db, pixelSize(ov, 720));
    }
    setText($('[data-out="legendA"]'), nA);
    setText($('[data-out="legendB"]'), nB);

    /* 月相解读 */
    setText($('[data-out="rA"]'), nA);
    setText($('[data-out="rB"]'), nB);
    setText($('[data-out="rAPhase"]'), da.phaseZh + ' · ' + (da.illum * 100).toFixed(0) + '%');
    setText($('[data-out="rBPhase"]'), db.phaseZh + ' · ' + (db.illum * 100).toFixed(0) + '%');
    setText($('[data-out="rAText"]'), READINGS[da.phaseZh] || '');
    setText($('[data-out="rBText"]'), READINGS[db.phaseZh] || '');

    /* 细节表 */
    setText($('[data-out="thA"]'), nA);
    setText($('[data-out="thB"]'), nB);
    var facts = {
      'a.greg': fmtGreg(store.a.date) + ' 周' + weekday(store.a.date),
      'b.greg': fmtGreg(store.b.date) + ' 周' + weekday(store.b.date),
      'a.lunar': st.lunarA ? st.lunarA.text : '—',
      'b.lunar': st.lunarB ? st.lunarB.text : '—',
      'a.phase': da.phaseZh + ' · ' + da.phaseEn.toLowerCase(),
      'b.phase': db.phaseZh + ' · ' + db.phaseEn.toLowerCase(),
      'a.illum': (da.illum * 100).toFixed(1) + '%',
      'b.illum': (db.illum * 100).toFixed(1) + '%',
      'a.age': da.age.toFixed(1) + ' 天',
      'b.age': db.age.toFixed(1) + ' 天',
      'a.dist': fmtDist(da.distance),
      'b.dist': fmtDist(db.distance),
      'a.sign': da.zodiacZh,
      'b.sign': db.zodiacZh
    };
    $$('[data-fact]').forEach(function (el) {
      var key = el.getAttribute('data-fact');
      if (facts[key] !== undefined) setText(el, facts[key]);
    });

    lastState = st;
    lastNames = { a: nameA, b: nameB };
  }

  function fillCard(card, iso, st, lunar, name) {
    if (!card) return;
    setText($('[data-out="phaseZh"]', card), st.phaseZh);
    setText($('[data-out="phaseEn"]', card), st.phaseEn);
    setText($('[data-out="greg"]', card), fmtGreg(iso));
    setText($('[data-out="lunar"]', card), lunar ? lunar.month + lunar.day : '—');
    setText($('[data-out="illum"]', card), (st.illum * 100).toFixed(1) + '%');
    setText($('[data-out="age"]', card), st.age.toFixed(1) + ' 天');
    setText($('[data-out="dist"]', card), fmtDist(st.distance));
    setText($('[data-out="pretty"]', card), fmtPretty(iso));
  }

  var lastState = null;
  var lastNames = { a: '', b: '' };

  /* ============================================================
   * 分享卡
   * ============================================================ */

  var FONT_SANS = '"PingFang SC","Microsoft YaHei UI","Microsoft YaHei","Noto Sans SC",sans-serif';
  var FONT_SERIF = '"Songti SC","Noto Serif SC","STSong","SimSun",Georgia,serif';
  var FONT_LATIN = 'Georgia,"Times New Roman","Songti SC",serif';

  function measureSpaced(g, text, spacing) {
    var w = 0;
    for (var i = 0; i < text.length; i++) {
      w += g.measureText(text[i]).width + (i < text.length - 1 ? spacing : 0);
    }
    return w;
  }

  function drawSpaced(g, text, x, y, spacing, align) {
    var total = measureSpaced(g, text, spacing);
    var cur = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    g.textAlign = 'left';
    for (var i = 0; i < text.length; i++) {
      g.fillText(text[i], cur, y);
      cur += g.measureText(text[i]).width + spacing;
    }
    return total;
  }

  function fitFont(g, text, maxWidth, startSize, family, weight) {
    var size = startSize;
    do {
      g.font = weight + ' ' + size + 'px ' + family;
      if (g.measureText(text).width <= maxWidth) break;
      size -= 2;
    } while (size > 18);
    return size;
  }

  function drawCard() {
    var c = $('#cardCanvas');
    if (!c) return;
    var g = c.getContext('2d');
    var W = c.width, H = c.height;
    var st = lastState || computeAll();
    var da = st.a, db = st.b;

    var nameA = (lastNames.a || '').trim() || '我';
    var nameB = (lastNames.b || '').trim() || 'TA';

    /* 背景 */
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#080c16');
    bg.addColorStop(0.42, '#0a1120');
    bg.addColorStop(1, '#05070d');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    function glow(x, y, r, color) {
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    glow(296, 620, 280, 'rgba(160,190,245,0.30)');
    glow(784, 620, 280, 'rgba(240,190,150,0.18)');

    /* 星点 */
    var rnd = mulberry32(77);
    for (var i = 0; i < 190; i++) {
      var sx = rnd() * W, sy = rnd() * H;
      var a = 0.06 + rnd() * 0.4;
      g.fillStyle = 'rgba(230,238,255,' + a.toFixed(3) + ')';
      g.beginPath();
      g.arc(sx, sy, 0.5 + Math.pow(rnd(), 4) * 1.4, 0, Math.PI * 2);
      g.fill();
    }

    /* 页眉 */
    g.fillStyle = 'rgba(238,241,248,0.42)';
    g.font = '400 14px ' + FONT_LATIN;
    drawSpaced(g, '月见 · MOONBORN', 72, 104, 7);

    g.fillStyle = 'rgba(238,241,248,0.20)';
    g.font = '400 13px ' + FONT_LATIN;
    g.textAlign = 'right';
    g.fillText(fmtGreg(store.a.date) + ' — ' + fmtGreg(store.b.date), W - 72, 104);
    g.textAlign = 'left';

    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(72, 142);
    g.lineTo(W - 72, 142);
    g.stroke();

    /* 标题 */
    g.fillStyle = '#f2f5fb';
    g.font = '300 62px ' + FONT_SANS;
    drawSpaced(g, '那天的月亮', 72, 240, 8);

    g.fillStyle = 'rgba(238,241,248,0.45)';
    g.font = '300 21px ' + FONT_SANS;
    drawSpaced(g, '两个人的生日，两轮月亮', 72, 288, 3);

    /* 月亮 */
    var r = 166, cy = 620;
    var cxA = 296, cxB = 784;
    var cA = els.canvasA, cB = els.canvasB;
    if (cA && cA.width) g.drawImage(cA, cxA - r, cy - r, r * 2, r * 2);
    if (cB && cB.width) g.drawImage(cB, cxB - r, cy - r, r * 2, r * 2);

    /* 名字与日期 */
    g.textAlign = 'center';
    g.fillStyle = 'rgba(242,245,251,0.92)';
    g.font = '300 27px ' + FONT_SANS;
    drawSpaced(g, nameA, cxA, 400, 5, 'center');
    drawSpaced(g, nameB, cxB, 400, 5, 'center');

    g.fillStyle = 'rgba(238,241,248,0.38)';
    g.font = '400 17px ' + FONT_LATIN;
    drawSpaced(g, fmtGreg(store.a.date), cxA, 432, 3, 'center');
    drawSpaced(g, fmtGreg(store.b.date), cxB, 432, 3, 'center');

    /* 月亮下方 */
    g.fillStyle = '#eef1f8';
    g.font = '300 33px ' + FONT_SANS;
    drawSpaced(g, da.phaseZh, cxA, 840, 7, 'center');
    drawSpaced(g, db.phaseZh, cxB, 840, 7, 'center');

    g.fillStyle = 'rgba(238,241,248,0.40)';
    g.font = '300 18px ' + FONT_SANS;
    drawSpaced(g, (st.lunarA ? st.lunarA.month + st.lunarA.day : ''), cxA, 878, 3, 'center');
    drawSpaced(g, (st.lunarB ? st.lunarB.month + st.lunarB.day : ''), cxB, 878, 3, 'center');

    g.textAlign = 'left';

    /* 重合度 */
    g.fillStyle = 'rgba(238,241,248,0.42)';
    g.font = '300 14px ' + FONT_SANS;
    drawSpaced(g, '月相重合度', W / 2, 946, 10, 'center');

    var score = Math.round(A.overlapScore(da, db));
    if (st.days === 0) score = 100;
    g.fillStyle = '#ffffff';
    g.font = '400 108px ' + FONT_LATIN;
    var sw = g.measureText(String(score)).width;
    g.textAlign = 'left';
    g.fillText(String(score), W / 2 - sw / 2 - 14, 1050);
    g.fillStyle = 'rgba(238,241,248,0.4)';
    g.font = '400 34px ' + FONT_LATIN;
    g.fillText('%', W / 2 - sw / 2 - 14 + sw + 6, 1050);

    /* 进度线 */
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(W / 2 - 120, 1086);
    g.lineTo(W / 2 + 120, 1086);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.moveTo(W / 2 - 120, 1086);
    g.lineTo(W / 2 - 120 + 240 * (score / 100), 1086);
    g.stroke();

    /* 结论 */
    var v = verdictOf(score, st, st.days);
    var size = fitFont(g, v.line, 900, 30, FONT_SERIF, '300');
    g.fillStyle = '#ffffff';
    g.font = '300 ' + size + 'px ' + FONT_SERIF;
    drawSpaced(g, v.line, W / 2, 1164, 3, 'center');

    /* 页脚 */
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(72, 1246);
    g.lineTo(W - 72, 1246);
    g.stroke();

    g.fillStyle = 'rgba(238,241,248,0.42)';
    g.font = '300 15px ' + FONT_SANS;
    drawSpaced(g, '相隔 ' + st.days + ' 天 · 月相相差 ' + A.angularDiff(da.cycle, db.cycle).toFixed(1) + '°', 72, 1292, 2);

    g.textAlign = 'right';
    g.font = '400 13px ' + FONT_LATIN;
    drawSpaced(g, 'MOONBORN', W - 72, 1292, 5, 'right');
    g.textAlign = 'left';
  }

  function saveCard() {
    drawCard();
    var c = $('#cardCanvas');
    try {
      c.toBlob(function (blob) {
        if (!blob) { toast('生成失败，请换个浏览器试试'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '月见-' + store.a.date + '-' + store.b.date + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        toast('月相卡已保存');
      }, 'image/png');
    } catch (e) {
      toast('当前浏览器不支持导出图片');
    }
  }

  function cardText() {
    var st = lastState || computeAll();
    var score = Math.round(A.overlapScore(st.a, st.b));
    var v = verdictOf(score, st, st.days);
    var nameA = (lastNames.a || '').trim() || '我';
    var nameB = (lastNames.b || '').trim() || 'TA';
    return [
      '【月见】你们出生那天的月亮',
      nameA + ' ' + fmtGreg(store.a.date) + ' · ' + (st.lunarA ? st.lunarA.text : '') + ' · ' + st.a.phaseZh,
      nameB + ' ' + fmtGreg(store.b.date) + ' · ' + (st.lunarB ? st.lunarB.text : '') + ' · ' + st.b.phaseZh,
      '月相重合度 ' + score + '% —— ' + v.line
    ].join('\n');
  }

  function copyText() {
    var text = cardText();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('文案已复制'); } catch (e) { toast('复制失败，请手动选择'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('文案已复制'); }, fallback);
    } else {
      fallback();
    }
  }

  /* ============================================================
   * 交互
   * ============================================================ */

  var toastTimer = null;
  function toast(msg) {
    var el = $('.toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  var hintDismissed = false;
  function dismissHint() {
    if (hintDismissed) return;
    hintDismissed = true;
    var hint = $('[data-out="pairHint"]');
    if (hint) hint.classList.add('is-hidden');
  }

  /* 显式打开日期面板：label 被 preventDefault 后仍能调起原生选择器 */
  var pickerBusy = false;
  function openPicker(input) {
    if (!input || pickerBusy) return;
    pickerBusy = true;
    try {
      if (typeof input.showPicker === 'function') {
        try { input.showPicker(); return; } catch (err) { /* 被拒绝则退回聚焦 */ }
      }
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
      try { input.click(); } catch (e) { /* ignore */ }
    } finally {
      setTimeout(function () { pickerBusy = false; }, 0);
    }
  }

  function bindPickerTriggers() {
    $$('[data-open-picker]').forEach(function (el) {
      var slot = el.getAttribute('data-open-picker');
      var input = $('[data-picker="' + slot + '"]');
      if (!input) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openPicker(input);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openPicker(input);
        }
      });
    });
  }

  function bind() {
    $$('[data-input="date-a"], [data-input="date-b"]').forEach(function (input) {
      var slot = input.getAttribute('data-input') === 'date-a' ? 'a' : 'b';
      input.value = store[slot].date;
      input.addEventListener('input', function () {
        if (!isoValid(input.value)) return;
        store[slot].date = input.value;
        dismissHint();
        refresh(true);
      });
      input.addEventListener('change', function () {
        if (!isoValid(input.value)) {
          input.value = store[slot].date;
          return;
        }
        store[slot].date = input.value;
        dismissHint();
        refresh(true);
      });
    });

    bindPickerTriggers();

    $$('[data-input="name-a"], [data-input="name-b"]').forEach(function (input) {
      var slot = input.getAttribute('data-input') === 'name-a' ? 'a' : 'b';
      input.value = store[slot].name;
      input.addEventListener('input', function () {
        store[slot].name = input.value;
        refresh(false, true);
      });
    });

    $$('[data-action="save"]').forEach(function (btn) {
      btn.addEventListener('click', saveCard);
    });
    $$('[data-action="copy"]').forEach(function (btn) {
      btn.addEventListener('click', copyText);
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        drawSky();
        view.a = null; view.b = null;
        refresh(false);
      }, 220);
    });
  }

  /* ============================================================
   * 启动
   * ============================================================ */

  function boot() {
    drawSky();
    bind();
    if (MR && MR.ready) MR.ready(function () { refresh(false); });
    else refresh(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
