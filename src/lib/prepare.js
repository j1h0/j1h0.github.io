// 페이지(ko/en index, PDF)가 공통으로 쓰는 뷰모델 조립.
// 논문·과제 숫자는 전부 여기서 실제 데이터를 세어 계산한다(하드코딩 금지).
import {
  getPublications,
  getProjects,
  getCv,
  getPubStats,
  groupPubsByYear,
  getSelectedPubs,
  localizePub,
  citePub,
  localizeProject,
} from './data.js';

export function prepare(lang) {
  const cv = getCv();
  const t = cv[lang];
  const pubsRaw = getPublications();
  const projectsRaw = getProjects();

  const stats = getPubStats(pubsRaw);
  const selectedPubsRaw = getSelectedPubs(pubsRaw, t.selectedPubs);
  const selectedPubs = selectedPubsRaw.map((p) => {
    const lp = localizePub(p, lang);
    return { ...lp, cite: citePub(lp) };
  });

  const pubYearsRaw = groupPubsByYear(pubsRaw);
  const pubYears = pubYearsRaw.map(({ year, items }) => ({
    year,
    items: items.map((p) => {
      const lp = localizePub(p, lang);
      return { ...lp, typeLabel: t.typeLabel[lp.type] || lp.type };
    }),
  }));

  const projectsLocalized = projectsRaw.map((p) => localizeProject(p, lang, cv.ko.projectsEn));
  const ongoingProjects = projectsLocalized.filter((p) => p.status === 'ongoing');
  const closedProjects = projectsLocalized.filter((p) => p.status === 'closed');

  const intlMeta = `${t.intl.length}${lang === 'ko' ? '건' : ' projects'} · ${t.intlPeriod} · ${t.intlFunders}`;

  return {
    lang,
    t,
    updated: cv.updated,
    stats,
    selectedPubs,
    pubYears,
    ongoingProjects,
    closedProjects,
    intlMeta,
  };
}
