import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = '/Users/suchme/j1h0-site/site/dist';
const OUT = '/Users/suchme/j1h0-site/review';
const PORT = 4174;
const CHROME = '/Users/suchme/.cache/puppeteer/chrome/mac_arm-151.0.7922.77/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      let full = path.join(ROOT, p);
      if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) full = path.join(ROOT, p, 'index.html');
      if (!fs.existsSync(full)) { res.writeHead(404); res.end('nf:' + p); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function shot(page, url, file, width, height, dark) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  if (dark) {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('theme', 'dark'); } catch (e) {}
    });
  }
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  console.log('shot:', file);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();

  await shot(page, `http://localhost:${PORT}/`, 'desktop-1280-ko-light.png', 1280, 1400, false);
  await shot(page, `http://localhost:${PORT}/en/`, 'desktop-1280-en-light.png', 1280, 1400, false);
  await shot(page, `http://localhost:${PORT}/`, 'mobile-390-ko-light.png', 390, 844, false);
  await shot(page, `http://localhost:${PORT}/en/`, 'mobile-390-en-light.png', 390, 844, false);
  await shot(page, `http://localhost:${PORT}/`, 'desktop-1280-ko-dark.png', 1280, 1400, true);
  await shot(page, `http://localhost:${PORT}/`, 'mobile-390-ko-dark.png', 390, 844, true);

  await browser.close();
  server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
