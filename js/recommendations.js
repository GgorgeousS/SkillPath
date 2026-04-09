(function () {
  'use strict';

  // MVP-логика рекомендаций: из интересов -> топ направлений
  // Направления: расширенный список (показываем топ-3)
  const DIRECTIONS = [
    'Frontend',
    'Backend',
    'QA Manual',
    'UI/UX',
    'Data Analyst',
    'DevOps',
    'Mobile',
    'Cybersecurity',
  ];

  // Входные теги — то, что пользователь выбирает на 2-й странице.
  const WEIGHTS = {
    'Верстка (HTML/CSS)': { Frontend: 3, 'UI/UX': 1 },
    JavaScript: { Frontend: 3, Backend: 1 },
    'API (HTTP/Postman)': { Backend: 2, 'QA Manual': 2, Frontend: 1 },
    'SQL / Базы данных': { Backend: 3, 'Data Analyst': 3, 'QA Manual': 1 },
    Python: { Backend: 2, 'Data Analyst': 2, DevOps: 1 },
    'Аналитика (Excel/BI)': { 'Data Analyst': 3 },
    'Тестирование (QA)': { 'QA Manual': 3 },
    'Дизайн (Figma)': { 'UI/UX': 3 },
    'UX-исследования': { 'UI/UX': 3 },
    Linux: { DevOps: 3, Cybersecurity: 2, Backend: 1 },
    Docker: { DevOps: 3, Backend: 1 },
    'CI/CD': { DevOps: 3 },
    'Мобильная разработка': { Mobile: 3 },
    'Сети и безопасность': { Cybersecurity: 3, DevOps: 1 },
  };

  function computeDirections(interests) {
    const scores = {};
    DIRECTIONS.forEach((d) => {
      scores[d] = 0;
    });

    (interests || []).forEach((interest) => {
      const map = WEIGHTS[interest];
      if (!map) return;
      Object.keys(map).forEach((direction) => {
        scores[direction] = (scores[direction] || 0) + map[direction];
      });
    });

    const sorted = DIRECTIONS
      .map((name) => ({ name, score: scores[name] || 0 }))
      .sort((a, b) => b.score - a.score);

    const maxScore = Math.max.apply(null, sorted.map((x) => x.score));
    const hasSignal = Number.isFinite(maxScore) && maxScore > 0;

    // Если пользователь ничего не выбрал/веса не совпали — дефолт.
    if (!hasSignal) return ['Frontend', 'Backend', 'QA Manual'];

    const picked = sorted.filter((x) => x.score > 0).map((x) => x.name);
    const result = picked.slice(0, 5);

    // Минимум 3 карточки, чтобы UX был стабильным.
    const fallbackOrder = [
      'Frontend',
      'Backend',
      'QA Manual',
      'UI/UX',
      'Data Analyst',
      'DevOps',
      'Mobile',
      'Cybersecurity',
    ];
    for (let i = 0; i < fallbackOrder.length && result.length < 3; i += 1) {
      const d = fallbackOrder[i];
      if (!result.includes(d)) result.push(d);
    }

    return result;
  }

  window.SkillPathRecommend = {
    computeDirections,
  };
})();
