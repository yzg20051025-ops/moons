const base = process.argv[2] || 'https://speedy-orion-axl1c9r.tmp.now';

(async () => {
  const paths = ['/', '/js/astro.js', '/js/moon-texture.js', '/css/style.css', '/assets/moon-900.jpg', '/nonexistent'];
  for (const p of paths) {
    try {
      const r = await fetch(base + p);
      const t = await r.text();
      console.log(String(r.status).padEnd(4), (r.headers.get('content-type') || '').split(';')[0].padEnd(24), String(t.length).padStart(8), p);
    } catch (e) {
      console.log('FAIL', p, e.message);
    }
  }
  const html = await (await fetch(base + '/')).text();
  console.log('标题在页面里:', html.includes('月见'));
  console.log('缓存头:', (await fetch(base + '/js/moon-texture.js')).headers.get('cache-control'));
})();
