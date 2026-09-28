// dist/를 정적 서빙한 뒤 /cv/ 를 puppeteer로 인쇄해 이력서 PDF를 만든다.
// 로컬(맥미니)과 GitHub Actions 러너 양쪽에서 이 스크립트 하나를 그대로 쓴다.
// 실행 후 pdffonts로 한글 글꼴이 실제로 임베드됐는지 확인하고, 없으면 실패시킨다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(process.cwd(), 'dist');
const OUT = process.env.PDF_OUT || path.resolve(process.cwd(), 'dist/JihoShin_CV_2026.pdf');
const PORT = 4173;
const EXEC_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || findLocalChrome();

function findLocalChrome() {
  // 로컬(맥미니)에서는 ~/.cache/puppeteer에 받아둔 Chrome을 그대로 쓴다.
  const cacheDir = path.join(process.env.HOME || '', '.cache/puppeteer/chrome');
  if (!fs.existsSync(cacheDir)) return undefined;
  const versions = fs.readdirSync(cacheDir).sort().reverse();
  for (const v of versions) {
    const candidate = path.join(cacheDir, v, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      let full = path.join(ROOT, p);
      if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) full = path.join(ROOT, p, 'index.html');
      if (!fs.existsSync(full)) {
        res.writeHead(404);
        res.end('not found: ' + p);
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  if (!fs.existsSync(ROOT)) throw new Error('dist/ 가 없습니다. 먼저 npm run build 를 실행하세요.');
  if (!EXEC_PATH) throw new Error('사용할 Chrome 실행 파일을 찾지 못했습니다. PUPPETEER_EXECUTABLE_PATH를 지정하세요.');

  const server = await serve();
  const browser = await puppeteer.launch({ executablePath: EXEC_PATH, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/cv/`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    await page.pdf({
      path: OUT,
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%;display:flex;justify-content:space-between;font-family:'Noto Sans KR','Roboto',sans-serif;font-size:8px;color:rgb(73,69,79);padding:0 16mm;">
          <span>신지호 이력서 · j1h0.github.io</span><span>2026.09.28 기준</span>
        </div>`,
    });
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`[make-pdf] 생성: ${OUT}`);
  checkFonts(OUT);
}

function checkFonts(pdfPath) {
  let out;
  try {
    out = execFileSync('pdffonts', [pdfPath], { encoding: 'utf-8' });
  } catch (err) {
    throw new Error(`pdffonts 실행 실패(poppler-utils 필요): ${err.message}`);
  }
  console.log(out);
  const lines = out.trim().split('\n').slice(2);
  // 컬럼: name type encoding emb sub uni object ID (emb/sub/uni 값 뒤에 숫자 두 개)
  const rowPattern = /^(\S+)\s+.*?\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/;
  const cjkEmbedded = lines.some((line) => {
    const m = line.match(rowPattern);
    if (!m) return false;
    const [, name, emb] = m;
    return emb === 'yes' && /Noto|CJK|KR/i.test(name);
  });
  if (!cjkEmbedded) {
    throw new Error('한글이 포함된 임베드 글꼴을 pdffonts 출력에서 찾지 못했습니다. 빌드 실패 처리합니다.');
  }
  console.log('[make-pdf] pdffonts 확인: 한글 임베드 글꼴 존재');
}

main().catch((err) => {
  console.error('[make-pdf] 오류:', err.message);
  process.exit(1);
});
