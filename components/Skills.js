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
    { value: 'no', label: 'Нет' },
    { value: 'mid', label: 'Средне' },
    { value: 'yes', label: 'Да' },
  ];

  window.SkillPathComponents.Skills = {
    name: 'Skills',
    setup() {
      const state = SkillPathStore.state;

      const supabaseConfigured = Vue.computed(() => SkillPathSupabase.isConfigured());
      const supabaseHelp = Vue.computed(() => {
        if (supabaseConfigured.value) return '';
        return typeof SkillPathSupabase.getConfigHelp === 'function'
          ? SkillPathSupabase.getConfigHelp()
          : 'Supabase не настроен: откройте js/supabase.js и вставьте URL и anon key.';
      });

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

      const status = Vue.ref({ type: 'idle', message: '' });
      const isSubmitting = Vue.ref(false);

      const canSubmit = Vue.computed(() => {
        const email = (state.profile.email || '').trim();
        const name = (state.profile.name || '').trim();
        return email.length > 3 && email.includes('@') && name.length > 1;
      });

      function payload() {
        const skillsList = skillsForDirection.value;
        const skills = {};
        skillsList.forEach((s) => {
          const v = state.skills[s.key];
          skills[s.key] = v === 'no' || v === 'mid' || v === 'yes' ? v : 'no';
        });

        return {
          email: (state.profile.email || '').trim(),
          name: (state.profile.name || '').trim(),
          persona_type: state.profile.persona_type,
          answers: {
            interests: SkillPathUtils.uniqueStrings(state.survey.interests),
            selected_direction: selectedDirection.value || null,
          },
          recommended_directions: SkillPathUtils.uniqueStrings(state.recommended_directions),
          skills,
        };
      }

      async function submit() {
        status.value = { type: 'idle', message: '' };

        if (!canSubmit.value) {
          status.value = {
            type: 'error',
            message: 'Заполните email и имя (минимальная проверка).',
          };
          return;
        }

        isSubmitting.value = true;
        try {
          const { data, error } = await SkillPathSupabase.insertSubmission(payload());
          if (error) {
            status.value = {
              type: 'error',
              message: 'Ошибка Supabase: ' + (error.message || String(error)),
            };
            return;
          }

          const insertedId = Array.isArray(data) && data[0] && data[0].id ? data[0].id : null;
          status.value = {
            type: 'success',
            message:
              'Отправлено в Supabase.' + (insertedId ? (' ID записи: ' + insertedId) : ''),
          };
        } catch (e) {
          status.value = { type: 'error', message: e.message || String(e) };
        } finally {
          isSubmitting.value = false;
        }
      }

      return {
        state,
        skillsForDirection,
        LEVELS,
        status,
        isSubmitting,
        canSubmit,
        submit,
        supabaseConfigured,
        supabaseHelp,
        primaryDirectionTitle,
        skillsHeroSrc,
      };
    },
    template: `
      <main class="page">
        <div class="shell">
          <div class="phone">
            <div class="topbar">
              <button class="back" type="button" @click="$router.back()" aria-label="Назад">←</button>
              <div class="topbar-title">SkillPath</div>
              <div class="topbar-right" aria-hidden="true">
                <img
                  class="logo-mini"
                  src="./assets/skillpathnofone.png"
                  alt=""
                  onerror="this.onerror=null; this.src='./assets/logo.svg';"
                />
              </div>
            </div>
            <p class="subtitle">Оценка навыков</p>

            <div class="content compact">
              <div class="split">
                <div class="panel">
                  <img class="media-img media-img--tall" :src="skillsHeroSrc" alt="" aria-hidden="true" />
                  <div style="margin-top:12px;">
                    <div class="h2">{{ primaryDirectionTitle }}</div>
                    <p class="small">Список навыков</p>
                  </div>

                  <div class="list skill-list" role="group" aria-label="Навыки">
                    <label v-for="s in skillsForDirection" :key="s.key" class="list-item">
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
                    </label>
                  </div>
                </div>

                <div class="panel">
                  <div class="h2">Данные пользователя</div>
                  <div class="field">
                    <div class="label">Email</div>
                    <input class="input" type="email" v-model="state.profile.email" placeholder="you@example.com" />
                  </div>
                  <div class="field">
                    <div class="label">Имя</div>
                    <input class="input" type="text" v-model="state.profile.name" placeholder="Ваше имя" />
                  </div>
                  <div class="field">
                    <div class="label">Persona type</div>
                    <select class="select" v-model="state.profile.persona_type">
                      <option value="student">student</option>
                      <option value="junior">junior</option>
                      <option value="switcher">switcher</option>
                    </select>
                  </div>

                  <div class="note" style="margin-top:8px">
                    <div><strong>Интересы:</strong> {{ (state.survey.interests || []).join(', ') || '—' }}</div>
                    <div style="margin-top:6px"><strong>Рекомендации:</strong> {{ (state.recommended_directions || []).join(', ') || '—' }}</div>
                  </div>

                  <div v-if="status.type !== 'idle'" class="note" :class="status.type">
                    {{ status.message }}
                  </div>

                  <div class="note" v-if="!supabaseConfigured">
                    {{ supabaseHelp || 'Supabase не настроен: откройте js/supabase.js и вставьте URL и anon key.' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" :disabled="!canSubmit || isSubmitting" @click="submit">
                {{ isSubmitting ? 'Отправка…' : 'Отправить' }}
              </button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
