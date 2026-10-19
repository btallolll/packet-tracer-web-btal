const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.pkt': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8'
};

const BLOCKED_UA_PATTERNS = [
  /lovable/i,
  /firecrawl/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /phantomjs/i,
  /bytespider/i,
  /gptbot/i,
  /chatgpt-user/i,
  /claudebot/i,
  /claude-web/i,
  /anthropic-ai/i,
  /cohere-ai/i,
  /diffbot/i,
  /ccbot/i,
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /axios/i,
  /node-fetch/i,
  /httpclient/i,
  /go-http-client/i
];

const server = http.createServer((req, res) => {
  try {
    const ua = req.headers['user-agent'] || '';

    // Check if the request is from a known AI crawler / headless scraper
    const isBlockedBot = BLOCKED_UA_PATTERNS.some(pat => pat.test(ua));
    if (isBlockedBot) {
      res.writeHead(403, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        'X-Frame-Options': 'DENY'
      });
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>403 Forbidden</title></head>
<body style="background:#091e3a;color:#ffffff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div style="text-align:center;padding:24px;">
  <h1 style="color:#ef4444;font-size:28px;">🚫 403 Forbidden: AI Crawlers & Scrapers Blocked</h1>
  <p style="font-size:16px;color:#cbd5e1;max-width:550px;line-height:1.6;margin:12px auto;">
    الوصول محظور: يُمنع منعاً باتاً استنساخ أو سحب محتوى هذا الموقع بواسطة أدوات الذكاء الاصطناعي (Lovable, etc.) أو برامج السحب الآلي.
  </p>
</div></body></html>`);
      return;
    }

    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') {
      urlPath = '/index.html';
    }
    const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(ROOT, safePath);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + urlPath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const lanIps = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIps.push(net.address);
      }
    }
  }
  console.log('====================================================');
  console.log(' Cisco Packet Tracer 8.2.2 Web & Mobile Edition');
  console.log('====================================================');
  console.log(` -> Local (PC):     http://localhost:${PORT}`);
  lanIps.forEach(ip => {
    console.log(` -> Mobile (Wi-Fi): http://${ip}:${PORT}`);
  });
  console.log('====================================================');
});
