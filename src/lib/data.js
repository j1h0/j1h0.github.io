// 데이터 로딩과 집계. 실적 숫자는 전부 여기서 publications.yml을 세어 계산하고,
// 페이지 템플릿이나 cv.yml에는 56/28/24/4 같은 숫자를 직접 적지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';

const dataDir = path.resolve(process.cwd(), 'src/data');

function loadYaml(file) {
  return parseYaml(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
}

export function getPublications() {
  return loadYaml('publications.yml');
}

export function getProjects() {
  return loadYaml('projects.yml');
}

export function getCv() {
  return loadYaml('cv.yml');
}

/** type별 건수 + 전체 건수. journal/conference/misc 순서를 보장한다. */
export function getPubStats(pubs) {
  const byType = { journal: 0, conference: 0, misc: 0 };
  for (const p of pubs) {
    if (byType[p.type] === undefined) byType[p.type] = 0;
    byType[p.type] += 1;
  }
  return { total: pubs.length, ...byType };
}

/** 연도 내림차순, 같은 연도 안에서는 원문(publications.yml) 등재 순서를 유지. */
export function groupPubsByYear(pubs) {
  const sorted = [...pubs].sort((a, b) => b.year - a.year);
  const years = [...new Set(sorted.map((p) => p.year))];
  return years.map((year) => ({ year, items: sorted.filter((p) => p.year === year) }));
}

export function getSelectedPubs(pubs, ids) {
  const byId = new Map(pubs.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export function localizePub(p, lang) {
  if (lang === 'ko') return p;
  return {
    ...p,
    authors: p.authors_en || p.authors,
    title: p.title_en || p.title,
    venue: p.venue_en || p.venue,
    award: p.award_en || p.award,
  };
}

/** 학술지: 권/호/쪽 포함 인용, 학술대회·기타: venue, year만. dfslab PublicationList.astro와 동일 규칙. */
export function citePub(p) {
  if (p.type === 'journal' && p.volume) {
    const parts = [`vol. ${p.volume}`];
    if (p.issue) parts.push(`no. ${p.issue}`);
    if (p.pages) parts.push(p.pages);
    return `${p.venue}, ${parts.join(', ')}, ${p.year}`;
  }
  return `${p.venue}, ${p.year}`;
}

export function localizeProject(p, lang, projectsEn) {
  if (lang === 'ko') return p;
  const en = projectsEn?.[p.id];
  return {
    ...p,
    title: en?.title || p.title,
    agency: en?.agency || p.agency,
    role: en?.role || p.role,
  };
}
