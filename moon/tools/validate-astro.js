const A = require('../js/astro.js');

const anchors = [
  ['2024-04-08T18:17:00Z', 0,   '北美日全食（新月）'],
  ['2025-03-14T06:58:00Z', 180, '月全食（满月）'],
  ['2025-09-07T18:11:00Z', 180, '月全食（满月）'],
  ['2026-02-17T12:01:00Z', 0,   '日环食（新月）'],
  ['2026-03-03T11:33:00Z', 180, '月全食（满月）'],
  ['2026-08-12T17:46:00Z', 0,   '日全食（新月）'],
  ['2027-08-02T10:07:00Z', 0,   '日全食（新月）'],
  ['2028-01-26T15:08:00Z', 0,   '日环食（新月）']
];

let worst = 0;
for (const [iso, target, label] of anchors) {
  const d = new Date(iso);
  const st = A.moonState(d);
  const diff = A.angularDiff(st.cycle, target);
  worst = Math.max(worst, diff);
  console.log(
    iso, label.padEnd(12, ' '),
    '相位角', st.cycle.toFixed(3).padStart(8),
    '误差', diff.toFixed(3).padStart(6) + '°',
    '照亮', (st.illum * 100).toFixed(2) + '%',
    '月龄', st.age.toFixed(2)
  );
}
console.log('\n最大误差', worst.toFixed(3), '°');

console.log('\n--- 2026-10-25 12:00 +08:00 ---');
const d = new Date(Date.UTC(2026, 9, 25, 4));
const s = A.moonState(d);
console.log(s);
console.log('农历', A.lunarDate(d));

console.log('\n--- 1998-05-14 ---');
const d2 = new Date(Date.UTC(1998, 4, 14, 4));
console.log(A.moonState(d2));
console.log('农历', A.lunarDate(d2));

// 新月时刻反解校验：随机日期的月龄应 < 29.54
let bad = 0;
for (let i = 0; i < 500; i++) {
  const t = Date.UTC(1950, 0, 1) + Math.random() * 150 * 365.25 * 86400000;
  const st = A.moonState(new Date(t));
  if (!isFinite(st.age) || st.age < 0 || st.age > 29.54) bad++;
}
console.log('\n月龄异常次数', bad, '/ 500');
