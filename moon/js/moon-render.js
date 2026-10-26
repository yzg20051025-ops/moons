/* ============================================================
 * moon-render.js — 月面渲染
 *  · 以真实全月照片作反照率贴图（base64 内嵌，file:// 可用）
 *  · 用相位角对球面法线做点乘，逐像素计算亮部与明暗界线
 *  · 叠影视图：按“只有 A / 只有 B / 两者都有”三色叠加
 * ============================================================ */
(function (root) {
  'use strict';

  var D2R = Math.PI / 180;
  var sourceCache = new Map();
  var loaded = false;
  var waiters = [];
  var texImg = null;

  /* ---------- 贴图加载 ---------- */

  function startLoad() {
    texImg = new Image();
    texImg.onload = function () {
      loaded = true;
      for (var i = 0; i < waiters.length; i++) waiters[i]();
      waiters = [];
    };
    texImg.onerror = function () {
      loaded = false;
    };
    texImg.src = root.MOON_TEXTURE || '';
  }

  function ready(cb) {
    if (loaded) { cb(); return; }
    waiters.push(cb);
  }

  /* ---------- 贴图预处理 ---------- */

  function buildSource(px) {
    var c = document.createElement('canvas');
    c.width = c.height = px;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(texImg, 0, 0, px, px);

    var img = g.getImageData(0, 0, px, px);
    var d = img.data;
    var R = px / 2;
    var feather = Math.max(1.2, px * 0.004);

    /* 圆形遮罩：把方形贴图裁成月面，并留 1px 柔边 */
    for (var y = 0; y < px; y++) {
      var ny = (y + 0.5 - R);
      for (var x = 0; x < px; x++) {
        var nx = (x + 0.5 - R);
        var r = Math.sqrt(nx * nx + ny * ny);
        var i4 = (y * px + x) << 2;
        var a;
        if (r <= R - feather) a = 1;
        else if (r >= R) a = 0;
        else a = (R - r) / feather;
        if (a === 0) { d[i4] = 0; d[i4 + 1] = 0; d[i4 + 2] = 0; d[i4 + 3] = 0; continue; }
        d[i4 + 3] = a * 255;
      }
    }
    g.putImageData(img, 0, 0);
    return d;
  }

  function getSource(px) {
    var hit = sourceCache.get(px);
    if (hit) return hit;
    var data = buildSource(px);
    sourceCache.set(px, data);
    if (sourceCache.size > 6) sourceCache.delete(sourceCache.keys().next().value);
    return data;
  }

  /* ---------- 明暗界线噪声：让晨昏线起伏，像真实地形 ---------- */

  var termNoise = null, termNoiseN = 192;

  function hash2(xi, yi) {
    var h = Math.imul(xi, 374761393) + Math.imul(yi, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi), b = hash2(xi + 1, yi);
    var c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    var top = a + (b - a) * u;
    var bot = c + (d - c) * u;
    return top + (bot - top) * v;
  }

  function ensureTermNoise() {
    if (termNoise) return;
    var N = termNoiseN;
    termNoise = new Float32Array(N * N);
    for (var y = 0; y < N; y++) {
      var fy = y / N * 7.5 + 3.1;
      for (var x = 0; x < N; x++) {
        var fx = x / N * 7.5 + 1.7;
        termNoise[y * N + x] = vnoise(fx, fy) * 0.62 + vnoise(fx * 2.7, fy * 2.7) * 0.38;
      }
    }
  }

  function termAt(u, v) {
    var N = termNoiseN;
    var x = u * (N - 1), y = v * (N - 1);
    var xi = x | 0, yi = y | 0;
    if (xi < 0) xi = 0; else if (xi > N - 2) xi = N - 2;
    if (yi < 0) yi = 0; else if (yi > N - 2) yi = N - 2;
    var xf = x - xi, yf = y - yi;
    var i0 = yi * N + xi, i1 = i0 + N;
    var top = termNoise[i0] + (termNoise[i0 + 1] - termNoise[i0]) * xf;
    var bot = termNoise[i1] + (termNoise[i1 + 1] - termNoise[i1]) * xf;
    return top + (bot - top) * yf;
  }

  /* ---------- 单个月亮 ---------- */

  function paint(canvas, state, px) {
    px = Math.round(px);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    var ctx = canvas.getContext('2d');
    if (!loaded) {
      ctx.clearRect(0, 0, px, px);
      return;
    }
    ensureTermNoise();
    var src = getSource(px);
    var img = ctx.createImageData(px, px);
    var out = img.data;
    var R = px / 2;
    var sinI = Math.sin(state.angle * D2R);
    var cosI = Math.cos(state.angle * D2R);
    var sign = state.waxing ? 1 : -1;
    var TERM = 0.016;
    var gain = 1.06;

    for (var y = 0; y < px; y++) {
      var ny = (y + 0.5 - R) / R;
      var ny2 = ny * ny;
      var row = y * px;
      var vv = (ny + 1) * 0.5;
      for (var x = 0; x < px; x++) {
        var i4 = (row + x) << 2;
        if (src[i4 + 3] === 0) continue;
        var nx = (x + 0.5 - R) / R;
        var z2 = 1 - nx * nx - ny2;
        if (z2 <= 0) continue;
        var nz = Math.sqrt(z2);
        var lam = nx * sign * sinI + nz * cosI;

        /* 晨昏线加一点地形噪声 */
        if (lam > -0.12 && lam < 0.12) {
          lam += (termAt((nx + 1) * 0.5, vv) - 0.5) * 0.055;
        }

        var lit = lam <= 0 ? 0 : (lam >= TERM ? 1 : lam / TERM);
        var shade = 0;
        if (lam > 0) {
          /* Lommel–Seeliger：满月时整盘近乎均匀，弦月时晨昏线迅速变暗 */
          var ls = 2 * lam / (lam + nz + 1e-5);
          shade = (0.82 * ls + 0.18 * lam) * lit;
          shade += 0.05 * Math.pow(1 - nz, 5) * lit;
          if (shade > 1) shade = 1;
        }

        var earth = (0.020 + 0.014 * nz) * (1 - lit) * (0.6 + 0.4 * nz);
        var f = (shade + earth) * gain;

        out[i4]     = src[i4]     * f;
        out[i4 + 1] = src[i4 + 1] * f;
        out[i4 + 2] = src[i4 + 2] * f * 1.03;
        out[i4 + 3] = src[i4 + 3] * (0.05 + 0.95 * lit);
      }
    }
    ctx.putImageData(img, 0, 0);

    /* 新月几乎不可见时，给一圈极淡的轮廓，免得画面空掉 */
    var illumK = (1 + cosI) / 2;
    if (illumK < 0.06) {
      ctx.beginPath();
      ctx.arc(R, R, R - 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(214,228,255,0.13)';
      ctx.lineWidth = Math.max(1, px / 600);
      ctx.stroke();
    }
  }

  /* ---------- 叠影 ---------- */

  function paintOverlay(canvas, a, b, px) {
    px = Math.round(px);
    canvas.width = px;
    canvas.height = px;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(px, px);
    var out = img.data;
    var R = px / 2;
    var sa = Math.sin(a.angle * D2R), ca = Math.cos(a.angle * D2R), ga = a.waxing ? 1 : -1;
    var sb = Math.sin(b.angle * D2R), cb = Math.cos(b.angle * D2R), gb = b.waxing ? 1 : -1;
    var TERM = 0.014;

    for (var y = 0; y < px; y++) {
      var ny = (y + 0.5 - R) / R;
      var ny2 = ny * ny;
      for (var x = 0; x < px; x++) {
        var i4 = (y * px + x) << 2;
        var nx = (x + 0.5 - R) / R;
        var z2 = 1 - nx * nx - ny2;
        if (z2 <= 0) continue;
        var nz = Math.sqrt(z2);
        var la = nx * ga * sa + nz * ca;
        var lb = nx * gb * sb + nz * cb;
        var ka = la <= 0 ? 0 : la >= TERM ? 1 : la / TERM;
        var kb = lb <= 0 ? 0 : lb >= TERM ? 1 : lb / TERM;

        var onlyA = ka * (1 - kb);
        var onlyB = kb * (1 - ka);
        var both = ka * kb;
        var depth = 0.78 + 0.22 * nz;

        out[i4]     = (onlyA * 108 + onlyB * 255 + both * 255) * depth;
        out[i4 + 1] = (onlyA * 162 + onlyB * 156 + both * 255) * depth;
        out[i4 + 2] = (onlyA * 255 + onlyB * 96 + both * 250) * depth;
        out[i4 + 3] = Math.min(255, ((onlyA + onlyB + both) * 0.96 + 0.035) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);

    ctx.beginPath();
    ctx.arc(R, R, R - 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = Math.max(0.8, px / 640);
    ctx.stroke();
  }

  /* ---------- 相位过渡 ---------- */

  function animate(canvas, fromCycle, toCycle, waxing, px, done) {
    var start = null;
    var DUR = 640;
    var id = (canvas.__moonAnim || 0) + 1;
    canvas.__moonAnim = id;
    var delta = ((toCycle - fromCycle + 540) % 360) - 180;
    if (Math.abs(delta) < 0.6) { done(); return; }

    function frame(ts) {
      if (canvas.__moonAnim !== id) return;
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / DUR);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var p = (fromCycle + delta * e + 360) % 360;
      var ang = p <= 180 ? p : 360 - p;
      paint(canvas, { angle: ang, waxing: p < 180 }, px);
      if (t < 1) requestAnimationFrame(frame);
      else done();
    }
    requestAnimationFrame(frame);
  }

  startLoad();

  root.MoonRender = {
    paint: paint,
    paintOverlay: paintOverlay,
    animate: animate,
    ready: ready,
    isReady: function () { return loaded; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
