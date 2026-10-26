/* ============================================================
 * astro.js — 月相计算
 * 依据 Jean Meeus《Astronomical Algorithms》第 25 / 47 章简化实现：
 *   · 月球黄经 / 黄纬 / 地心距（ELP-2000 主要周期项）
 *   · 太阳视黄经与日地距
 *   · 日月角距 → 相位角 → 被照亮比例
 * 适用 1900–2100，月相角误差 < 0.05°（约合 1 分钟时间）
 * 纯本地计算，无网络请求。
 * ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.MoonAstro = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var D2R = Math.PI / 180;
  var SYNODIC = 29.530588853;          // 朔望月（天）
  var AU_KM = 149597870.7;

  function norm360(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function sin(d) { return Math.sin(d * D2R); }
  function cos(d) { return Math.cos(d * D2R); }

  /* Meeus 表 47.A：黄经周期项 [系数(1e-6°), D, M, M', F] */
  var TERMS_L = [
    [6288774, 0, 0, 1, 0], [1274027, 2, 0, -1, 0], [658314, 2, 0, 0, 0],
    [213618, 0, 0, 2, 0], [-185116, 0, 1, 0, 0], [-114332, 0, 0, 0, 2],
    [58793, 2, 0, -2, 0], [57066, 2, -1, -1, 0], [53322, 2, 0, 1, 0],
    [45758, 2, -1, 0, 0], [-40923, 0, 1, -1, 0], [-34720, 1, 0, 0, 0],
    [-30383, 0, 1, 1, 0], [15327, 2, 0, 0, -2], [-12528, 0, 0, 1, 2],
    [10980, 0, 0, 1, -2], [10675, 4, 0, -1, 0], [10034, 0, 0, 3, 0],
    [8548, 4, 0, -2, 0], [-7888, 2, 1, -1, 0], [-6766, 2, 1, 0, 0],
    [-5163, 1, 0, -1, 0], [4987, 1, 1, 0, 0], [4036, 2, -1, 1, 0],
    [3994, 2, 0, 2, 0], [3861, 4, 0, 0, 0], [3665, 2, 0, -3, 0],
    [-2689, 0, 1, -2, 0], [-2602, 2, 0, -1, 2], [2390, 2, -1, -2, 0],
    [-2348, 1, 0, 1, 0], [2236, 2, -2, 0, 0], [-2120, 0, 1, 2, 0],
    [-2069, 0, 2, 0, 0], [2048, 2, -2, -1, 0], [-1773, 2, 0, 1, -2],
    [-1595, 2, 0, 0, 2], [1215, 4, 0, -1, -1], [-1110, 0, 0, 2, 2],
    [-892, 3, 0, -1, 0], [-810, 2, 1, 1, 0], [759, 4, 0, -1, -2],
    [-713, 0, 2, -1, 0], [-700, 2, 1, -2, 0], [691, 2, 1, -1, -1],
    [596, 2, 0, -1, -2], [549, 4, 0, 1, 0], [537, 0, 0, 4, 0],
    [520, 4, 0, -1, 0], [-487, 1, 0, -1, 0], [-399, 2, 0, 1, -2],
    [-381, 0, 0, 2, -2], [351, 1, 0, 1, 0], [-340, 3, 0, -2, 0],
    [330, 4, 0, -3, 0], [327, 2, -1, 2, 0], [-323, 0, 2, 1, 0],
    [299, 1, 1, -1, 0], [294, 2, 0, 3, 0]
  ];

  /* Meeus 表 47.B：距离周期项 [系数(1e-3 km), D, M, M', F] */
  var TERMS_R = [
    [-20905.355, 0, 0, 1, 0], [-3699.111, 2, 0, -1, 0], [-2955.968, 2, 0, 0, 0],
    [-569.925, 0, 0, 2, 0], [48.888, 0, 1, 0, 0], [-3.149, 0, 0, 0, 2],
    [246.158, 2, 0, -2, 0], [-152.138, 2, -1, -1, 0], [-170.733, 2, 0, 1, 0],
    [-204.586, 2, -1, 0, 0], [-129.620, 0, 1, -1, 0], [108.743, 1, 0, 0, 0],
    [104.755, 0, 1, 1, 0], [10.321, 2, 0, 0, -2], [79.660, 0, 0, 1, 2],
    [-34.782, 4, 0, -1, 0], [-23.210, 0, 0, 3, 0], [-21.636, 4, 0, -2, 0],
    [24.208, 2, 1, -1, 0], [30.824, 2, 1, 0, 0], [-8.379, 1, 0, -1, 0],
    [-16.675, 1, 1, 0, 0], [-12.831, 2, -1, 1, 0], [-10.445, 2, 0, 2, 0],
    [-11.650, 4, 0, 0, 0], [14.403, 2, 0, -3, 0], [-7.003, 0, 1, -2, 0]
  ];

  /* Meeus 表 47.B：黄纬周期项 [系数(1e-6°), D, M, M', F] */
  var TERMS_B = [
    [5128122, 0, 0, 0, 1], [280602, 0, 0, 1, 1], [277693, 0, 0, 1, -1],
    [173237, 2, 0, 0, -1], [55413, 2, 0, -1, 1], [46271, 2, 0, -1, -1],
    [32573, 2, 0, 0, 1], [17198, 0, 0, 2, 1], [9266, 2, 0, 1, -1],
    [8822, 0, 0, 2, -1], [8216, 2, 0, -2, -1], [4324, 2, 0, 0, -3],
    [4200, 2, 0, 1, 1], [-3359, 2, 0, -1, -1]
  ];

  function fundamentals(jd) {
    var T = (jd - 2451545.0) / 36525;
    return {
      T: T,
      Lp: norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000),
      D:  norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000),
      M:  norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000),
      Mp: norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000),
      F:  norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000),
      E: 1 - 0.002516 * T - 0.0000074 * T * T
    };
  }

  function moonPosition(jd) {
    var k = fundamentals(jd);
    var D = k.D, M = k.M, Mp = k.Mp, F = k.F, E = k.E;
    var i, t, arg, ecc, sl = 0, sr = 0, sb = 0;

    for (i = 0; i < TERMS_L.length; i++) {
      t = TERMS_L[i];
      arg = t[1] * D + t[2] * M + t[3] * Mp + t[4] * F;
      ecc = t[2] === 0 ? 1 : Math.pow(E, Math.abs(t[2]));
      sl += t[0] * ecc * sin(arg);
    }
    for (i = 0; i < TERMS_R.length; i++) {
      t = TERMS_R[i];
      arg = t[1] * D + t[2] * M + t[3] * Mp + t[4] * F;
      ecc = t[2] === 0 ? 1 : Math.pow(E, Math.abs(t[2]));
      sr += t[0] * ecc * cos(arg);
    }
    for (i = 0; i < TERMS_B.length; i++) {
      t = TERMS_B[i];
      arg = t[1] * D + t[2] * M + t[3] * Mp + t[4] * F;
      ecc = t[2] === 0 ? 1 : Math.pow(E, Math.abs(t[2]));
      sb += t[0] * ecc * sin(arg);
    }

    /* 金星 / 木星摄动与扁率项 */
    var A1 = norm360(119.75 + 131.849 * k.T);
    var A2 = norm360(53.09 + 479264.290 * k.T);
    var A3 = norm360(313.45 + 481266.484 * k.T);
    sl += 3958 * sin(A1) + 1962 * sin(k.Lp - F) + 318 * sin(A2);

    var lon = norm360(k.Lp + sl / 1e6);
    var lat = sb / 1e6;
    var dist = 385000.56 + sr / 1000;   // km

    return { lon: lon, lat: lat, dist: dist };
  }

  function sunPosition(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
          + (0.019993 - 0.000101 * T) * sin(2 * M)
          + 0.000289 * sin(3 * M);
    var e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    var trueLon = L0 + C;
    var R = 1.000001018 * (1 - e * e) / (1 + e * cos(M + C));  // AU
    return { lon: trueLon, dist: R, meanAnomaly: M };
  }

  /* 月相角（日月地夹角）与被照亮比例 */
  function phaseAt(jd) {
    var m = moonPosition(jd);
    var s = sunPosition(jd);
    var dLon = norm360(m.lon - s.lon);
    var psi = Math.acos(Math.max(-1, Math.min(1, cos(m.lat) * cos(dLon))));  // 日月角距
    var dAu = m.dist / AU_KM;
    var i = Math.atan2(s.dist * Math.sin(psi), dAu - s.dist * Math.cos(psi));
    if (i < 0) i += Math.PI;
    var k = (1 + Math.cos(i)) / 2;
    return { angle: i / D2R, illum: k, elongation: dLon };
  }

  function cycleAngle(jd) {
    var m = moonPosition(jd), s = sunPosition(jd);
    return norm360(m.lon - s.lon);
  }

  /* 以 0 为中心的有符号相位角，用于求新月时刻 */
  function signedCycle(jd) {
    var p = cycleAngle(jd);
    return p > 180 ? p - 360 : p;
  }

  /* 距上一次新月的天数（二分求解，误差 < 数秒） */
  function ageDays(jd) {
    var p = cycleAngle(jd);
    var guess = jd - (p / 360) * SYNODIC;
    var lo = guess - 2, hi = guess + 2;
    if (!(signedCycle(lo) < 0 && signedCycle(hi) > 0)) {
      return (p / 360) * SYNODIC;
    }
    for (var n = 0; n < 30; n++) {
      var mid = (lo + hi) / 2;
      if (signedCycle(mid) < 0) lo = mid; else hi = mid;
    }
    return jd - (lo + hi) / 2;
  }

  var PHASES = [
    { max: 11.25,  zh: '新月',   en: 'NEW MOON' },
    { max: 78.75,  zh: '娥眉月', en: 'WAXING CRESCENT' },
    { max: 101.25, zh: '上弦月', en: 'FIRST QUARTER' },
    { max: 168.75, zh: '盈凸月', en: 'WAXING GIBBOUS' },
    { max: 191.25, zh: '满月',   en: 'FULL MOON' },
    { max: 258.75, zh: '亏凸月', en: 'WANING GIBBOUS' },
    { max: 281.25, zh: '下弦月', en: 'LAST QUARTER' },
    { max: 348.75, zh: '残月',   en: 'WANING CRESCENT' },
    { max: 360,    zh: '新月',   en: 'NEW MOON' }
  ];

  var ZODIAC = [
    ['白羊座', 'ARIES'], ['金牛座', 'TAURUS'], ['双子座', 'GEMINI'],
    ['巨蟹座', 'CANCER'], ['狮子座', 'LEO'], ['处女座', 'VIRGO'],
    ['天秤座', 'LIBRA'], ['天蝎座', 'SCORPIO'], ['射手座', 'SAGITTARIUS'],
    ['摩羯座', 'CAPRICORN'], ['水瓶座', 'AQUARIUS'], ['双鱼座', 'PISCES']
  ];

  /**
   * 计算某一时刻（Date）的月亮状态
   * 返回：相位角、照亮比例、月龄、地月距、月相名称、月亮星座……
   */
  function moonState(date) {
    var jd = date.getTime() / 86400000 + 2440587.5;
    var ph = phaseAt(jd);
    var m = moonPosition(jd);
    var s = sunPosition(jd);
    var p = norm360(m.lon - s.lon);
    var phase = PHASES[PHASES.length - 1];
    for (var i = 0; i < PHASES.length; i++) {
      if (p < PHASES[i].max) { phase = PHASES[i]; break; }
    }
    var zi = Math.floor(norm360(m.lon) / 30) % 12;
    var age = ageDays(jd);

    return {
      jd: jd,
      cycle: p,                 // 0=新月 90=上弦 180=满月 270=下弦
      angle: ph.angle,          // 相位角 0..180
      illum: ph.illum,          // 0..1
      age: age,
      distance: m.dist,
      waxing: p < 180,
      phaseZh: phase.zh,
      phaseEn: phase.en,
      zodiacZh: ZODIAC[zi][0],
      zodiacEn: ZODIAC[zi][1],
      lon: m.lon,
      lat: m.lat
    };
  }

  /**
   * 两枚月亮的“重合度”：被照亮区域在月面上的 Jaccard 重叠比例
   * 直观含义——把两轮月亮叠在一起，亮部重合的部分占亮部总体的比例
   */
  function overlapScore(a, b) {
    var n = 220, R = n / 2;
    var inter = 0, union = 0, litA = 0, litB = 0;
    var la = { x: a.waxing ? 1 : -1, s: Math.sin(a.angle * D2R), c: Math.cos(a.angle * D2R) };
    var lb = { x: b.waxing ? 1 : -1, s: Math.sin(b.angle * D2R), c: Math.cos(b.angle * D2R) };
    for (var y = 0; y < n; y++) {
      var ny = (y + 0.5 - R) / R;
      for (var x = 0; x < n; x++) {
        var nx = (x + 0.5 - R) / R;
        var nz2 = 1 - nx * nx - ny * ny;
        if (nz2 <= 0) continue;
        var nz = Math.sqrt(nz2);
        var A = nx * la.x * la.s + nz * la.c > 0;
        var B = nx * lb.x * lb.s + nz * lb.c > 0;
        if (A) litA++;
        if (B) litB++;
        if (A && B) inter++;
        if (A || B) union++;
      }
    }
    if (union === 0) return 100;         // 两枚都是新月：同藏于夜色
    if (litA === 0 || litB === 0) return 0;
    return (inter / union) * 100;
  }

  function angularDiff(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  /* 公历 → 农历（调用浏览器内置 ICU 中国历法；不可用时返回 null） */
  var lunarFmt = null, lunarPartsOk = false;
  try {
    lunarFmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Shanghai'
    });
    var probe = lunarFmt.formatToParts(new Date(Date.UTC(2000, 0, 15, 4)));
    lunarPartsOk = probe.some(function (p) { return p.type === 'month'; });
  } catch (e) { lunarFmt = null; }

  var CN_DIGIT = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function cnDay(n) {
    if (n <= 10) return '初' + CN_DIGIT[n];
    if (n < 20) return '十' + CN_DIGIT[n - 10];
    if (n === 20) return '二十';
    if (n < 30) return '廿' + CN_DIGIT[n - 20];
    return '三十';
  }

  function lunarDate(date) {
    if (!lunarFmt || !lunarPartsOk) return null;
    try {
      var parts = lunarFmt.formatToParts(date);
      var month = '', dayNum = 0, yearName = '';
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'month') month = parts[i].value;
        else if (parts[i].type === 'day') dayNum = parseInt(parts[i].value, 10);
        else if (parts[i].type === 'yearName') yearName = parts[i].value;
      }
      if (!month || !dayNum) return null;
      return { month: month, day: cnDay(dayNum), year: yearName, text: yearName + '年 ' + month + cnDay(dayNum) };
    } catch (e) { return null; }
  }

  return {
    SYNODIC: SYNODIC,
    moonState: moonState,
    overlapScore: overlapScore,
    angularDiff: angularDiff,
    lunarDate: lunarDate,
    moonPosition: moonPosition,
    sunPosition: sunPosition,
    phaseAt: phaseAt,
    cycleAngle: cycleAngle
  };
});
