/* 用 Chrome DevTools Protocol 截图 / 执行脚本，方便验收页面
 * 用法: node tools/shot.js <out.png> [width] [height] [mobile] [fullPage] [jsExpression]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333 + Math.floor(Math.random() * 200);

const out = process.argv[2] || 'shot.png';
const width = parseInt(process.argv[3] || '1440', 10);
const height = parseInt(process.argv[4] || '1000', 10);
const mobile = process.argv[5] === 'mobile';
const fullPage = process.argv[6] === 'full';
const jsExpr = (() => {
  const raw = process.argv[7] || '';
  if (raw.startsWith('@')) return fs.readFileSync(raw.slice(1), 'utf8');
  return raw;
})();

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moon-cdp-'));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + userDataDir,
  '--force-device-scale-factor=1',
  '--window-size=' + width + ',' + height,
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) { /* not ready */ }
    await sleep(200);
  }
  throw new Error('no devtools target');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let id = 0;
    ws.onopen = () => resolve({
      send(method, params) {
        return new Promise((res, rej) => {
          const mid = ++id;
          pending.set(mid, { res, rej });
          ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
        });
      },
      close() { ws.close(); }
    });
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.rej(new Error(JSON.stringify(msg.error)));
        else p.res(msg.result);
      }
    };
    ws.onerror = e => reject(new Error('ws error'));
  });
}

(async () => {
  const wsUrl = await getWsUrl();
  const c = await connect(wsUrl);
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: mobile ? 2 : 1, mobile
  });
  await c.send('Page.navigate', { url: process.env.SHOT_URL || 'file:///E:/zy/moon/index.html' });
  await sleep(2200);

  if (jsExpr) {
    const r = await c.send('Runtime.evaluate', { expression: jsExpr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) console.error('EVAL ERROR', JSON.stringify(r.exceptionDetails));
    else if (r.result && r.result.value !== undefined) console.log('EVAL', JSON.stringify(r.result.value).slice(0, 2000));
    await sleep(1200);
  }

  let clip;
  if (fullPage) {
    const m = await c.send('Page.getLayoutMetrics');
    const h = Math.ceil(m.cssContentSize.height);
    await c.send('Emulation.setDeviceMetricsOverride', {
      width, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile
    });
    await sleep(900);
    clip = { x: 0, y: 0, width, height: h, scale: 1 };
  }

  const shot = await c.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: !!clip, ...(clip ? { clip } : {})
  });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('wrote', out, fs.statSync(out).size);

  c.close();
  chrome.kill();
  setTimeout(() => process.exit(0), 200);
})().catch(async e => {
  console.error('FAIL', e.message);
  chrome.kill();
  process.exit(1);
});
