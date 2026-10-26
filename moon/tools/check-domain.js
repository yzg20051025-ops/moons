const https = require('https');

function doh(name) {
  return new Promise((resolve, reject) => {
    https.get({
      host: 'cloudflare-dns.com',
      path: '/dns-query?name=' + encodeURIComponent(name) + '&type=A',
      headers: { accept: 'application/dns-json' },
      timeout: 8000
    }, res => {
      let buf = '';
      res.on('data', d => (buf += d));
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          resolve((j.Answer || []).filter(a => a.type === 1).map(a => a.data));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function getViaIp(ip, hostname, path) {
  return new Promise((resolve, reject) => {
    https.get({
      host: ip, path, servername: hostname, rejectUnauthorized: false, timeout: 10000,
      headers: { host: hostname, 'user-agent': 'moonborn-check' }
    }, res => {
      let buf = '';
      res.on('data', d => (buf += d));
      res.on('end', () => resolve({ status: res.statusCode, len: buf.length, head: buf.slice(0, 120) }));
    }).on('error', reject);
  });
}

(async () => {
  for (const name of ['moonborn-two.vercel.app']) {
    try {
      const ips = await doh(name);
      console.log(name, '->', ips.join(', '));
      for (const ip of ips.slice(0, 2)) {
        try {
          const r = await getViaIp(ip, name, '/');
          console.log('  via', ip, 'status', r.status, 'bytes', r.len, '|', r.head.replace(/\s+/g, ' ').slice(0, 80));
        } catch (e) {
          console.log('  via', ip, 'FAIL', e.message);
        }
      }
    } catch (e) {
      console.log(name, 'DoH FAIL', e.message);
    }
  }
})();
