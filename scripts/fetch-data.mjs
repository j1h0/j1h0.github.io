// 빌드 전 연구실 홈페이지(dfslab.github.io) 데이터를 받아온다.
// 논문·과제 원장은 여기에만 있고, 이 사이트는 그 사본을 쓴다.
// 네트워크 실패 시 커밋된 사본을 그대로 두고 경고만 낸다(빌드는 계속 진행).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../src/data');

const SOURCES = [
  {
    name: 'publications.yml',
    url: 'https://raw.githubusercontent.com/dfslab/dfslab.github.io/main/src/data/publications.yml',
  },
  {
    name: 'projects.yml',
    url: 'https://raw.githubusercontent.com/dfslab/dfslab.github.io/main/src/data/projects.yml',
  },
];

async function fetchOne({ name, url }) {
  const dest = path.join(dataDir, name);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseYaml(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('parsed result is not a non-empty array');
    }
    fs.writeFileSync(dest, text, 'utf-8');
    console.log(`[fetch-data] ${name}: ${parsed.length}건 갱신`);
  } catch (err) {
    console.warn(`[fetch-data] 경고: ${name} 갱신 실패 (${err.message}). 커밋된 사본으로 빌드합니다.`);
    if (!fs.existsSync(dest)) {
      throw new Error(`${name} 원격 수신 실패 + 로컬 사본도 없음. 빌드 중단.`);
    }
  }
}

for (const src of SOURCES) {
  await fetchOne(src);
}
