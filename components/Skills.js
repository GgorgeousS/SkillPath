(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  const SKILLS_BY_DIRECTION = {
    Frontend: [
      { key: 'html', label: 'HTML' },
      { key: 'css', label: 'CSS' },
      { key: 'javascript', label: 'JavaScript' },
      { key: 'git', label: 'Git' },
      { key: 'api', label: 'API' },
    ],
    Backend: [
      { key: 'python', label: 'Язык (Python)' },
      { key: 'node', label: 'Node.js (база)' },
      { key: 'sql', label: 'SQL' },
      { key: 'api', label: 'API (HTTP)' },
      { key: 'git', label: 'Git' },
    ],
    'QA Manual': [
      { key: 'testing', label: 'Тестирование (база)' },
      { key: 'testcases', label: 'Тест‑кейсы' },
      { key: 'bugreports', label: 'Баг‑репорты' },
      { key: 'sql', label: 'SQL' },
      { key: 'api', label: 'API (Postman)' },
    ],
    'UI/UX': [
      { key: 'figma', label: 'Figma' },
      { key: 'uxresearch', label: 'UX‑исследования' },
      { key: 'wireframes', label: 'Вайрфреймы' },
      { key: 'prototyping', label: 'Прототипирование' },
      { key: 'ui', label: 'UI‑композиция' },
    ],
    'Data Analyst': [
      { key: 'sql', label: 'SQL' },
      { key: 'excel', label: 'Excel / Google Sheets' },
      { key: 'statistics', label: 'Статистика (база)' },
      { key: 'dataviz', label: 'Визуализация данных' },
      { key: 'python', label: 'Python (анализ)' },
    ],
    DevOps: [
      { key: 'linux', label: 'Linux' },
      { key: 'docker', label: 'Docker' },
      { key: 'cicd', label: 'CI/CD' },
      { key: 'cloud', label: 'Облака (база)' },
      { key: 'networking', label: 'Сети (база)' },
    ],
    Mobile: [
      { key: 'kotlin', label: 'Kotlin (Android)' },
      { key: 'swift', label: 'Swift (iOS)' },
      { key: 'flutter', label: 'Flutter (опционально)' },
      { key: 'api', label: 'API (HTTP)' },
      { key: 'git', label: 'Git' },
    ],
    Cybersecurity: [
      { key: 'networking', label: 'Сети (база)' },
      { key: 'linux', label: 'Linux (база)' },
      { key: 'owasp', label: 'OWASP / уязвимости' },
      { key: 'threats', label: 'Модели угроз (база)' },
      { key: 'sectools', label: 'Инструменты безопасности' },
    ],
  };

  const LEVELS = [
    { value: 'yes', label: 'Отлично знаю' },
    { value: 'mid', label: 'Имею уверенную базу' },
    { value: 'no', label: 'Не знаю' },
  ];

  window.SkillPathComponents.Skills = {
    name: 'Skills',
    setup() {
      const state = SkillPathStore.state;
      const router = VueRouter.useRouter();

      const selectedDirection = Vue.computed(
        () => state.selected_direction || (state.recommended_directions || [])[0] || 'Frontend'
      );

      const primaryDirectionTitle = Vue.computed(() => {
        const d = selectedDirection.value;
        if (d === 'Frontend') return 'Frontend‑разработчик';
        if (d === 'Backend') return 'Backend‑разработчик';
        if (d === 'QA Manual') return 'QA Manual';
        if (d === 'UI/UX') return 'UI/UX дизайнер';
        if (d === 'Data Analyst') return 'Data Analyst';
        if (d === 'DevOps') return 'DevOps';
        if (d === 'Mobile') return 'Mobile‑разработка';
        if (d === 'Cybersecurity') return 'Кибербезопасность';
        return d;
      });

      function coverFor(direction) {
        if (direction === 'Frontend') return './assets/cover-frontend.svg';
        if (direction === 'Backend') return './assets/cover-frontend.svg';
        if (direction === 'QA Manual') return './assets/cover-qa.svg';
        if (direction === 'DevOps') return './assets/cover-qa.svg';
        if (direction === 'Cybersecurity') return './assets/cover-qa.svg';
        return './assets/cover-ux.svg';
      }
      const skillsHeroSrc = Vue.computed(() => coverFor(selectedDirection.value));

      const skillsForDirection = Vue.computed(() => {
        return SKILLS_BY_DIRECTION[selectedDirection.value] || SKILLS_BY_DIRECTION.Frontend;
      });

      function next() {
        const list = skillsForDirection.value;
        const known = list.filter((s) => state.skills[s.key] !== 'no').length;
        SkillPathStore.logEvent(
          'skills',
          'Оценка навыков (' + primaryDirectionTitle.value + '): знакомо ' + known + ' из ' + list.length
        );
        router.push('/roadmap');
      }

      return {
        state,
        skillsForDirection,
        LEVELS,
        next,
        primaryDirectionTitle,
        skillsHeroSrc,
      };
    },
    template: `
      <main class="page" id="main">
        <div class="shell">
          <div class="phone">
            <div class="topbar">
              <button class="back" type="button" @click="$router.back()" aria-label="Назад">←</button>
              <div class="topbar-title">SkillPath</div>
              <div class="topbar-right" aria-hidden="true">
                <img
                  class="logo-mini"
                  src="./assets/logo-mark.png"
                  alt=""
                />
              </div>
            </div>
            <p class="subtitle">Оценка навыков</p>

            <div class="content compact">
              <div class="hint" role="note">
                <strong>Шаг 2 из 4.</strong> Честно оцените каждый навык: от этого зависят roadmap и план.
              </div>
              <div class="split">
                <div class="panel">
                  <img class="media-img media-img--tall" :src="skillsHeroSrc" alt="" aria-hidden="true" />
                  <div style="margin-top:12px;">
                    <div class="h2">{{ primaryDirectionTitle }}</div>
                    <p class="small">Список навыков</p>
                  </div>

                  <div class="list skill-list" role="group" aria-label="Навыки">
                    <div v-for="s in skillsForDirection" :key="s.key" class="list-item">
                      <span class="title">{{ s.label }}</span>
                      <span class="levels" role="radiogroup" :aria-label="'Уровень: ' + s.label">
                        <label v-for="l in LEVELS" :key="s.key + '-' + l.value" class="level">
                          <input
                            type="radio"
                            :name="'skill-' + s.key"
                            :value="l.value"
                            v-model="state.skills[s.key]"
                          />
                          <span class="level-label">{{ l.label }}</span>
                        </label>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="panel">
                  <div class="h2">Ваш выбор</div>
                  <div class="note" style="margin-top:8px">
                    <div><strong>Направление:</strong> {{ primaryDirectionTitle }}</div>
                    <div style="margin-top:6px"><strong>Интересы:</strong> {{ (state.survey.interests || []).join(', ') || '—' }}</div>
                    <div style="margin-top:6px"><strong>Рекомендации:</strong> {{ (state.recommended_directions || []).join(', ') || '—' }}</div>
                  </div>
                  <p class="small" style="margin-top:12px">
                    Ответы сохраняются в вашем личном кабинете автоматически. На следующем шаге вы увидите roadmap с темами.
                  </p>
                </div>
              </div>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" type="button" @click="next">Далее</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
