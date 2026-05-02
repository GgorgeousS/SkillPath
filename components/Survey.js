(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  const SKILL_TAGS = [
    'Верстка (HTML/CSS)',
    'JavaScript',
    'API (HTTP/Postman)',
    'SQL / Базы данных',
    'Python',
    'Аналитика (Excel/BI)',
    'Тестирование (QA)',
    'Дизайн (Figma)',
    'UX-исследования',
    'Linux',
    'Docker',
    'CI/CD',
    'Мобильная разработка',
    'Сети и безопасность',
  ];

  window.SkillPathComponents.Survey = {
    name: 'Survey',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;

      const interests = Vue.computed(() => state.survey.interests);

      const liveRecs = Vue.computed(() => {
        return SkillPathRecommend.computeDirections(state.survey.interests);
      });

      function toggle(interest) {
        const set = new Set(state.survey.interests);
        if (set.has(interest)) set.delete(interest);
        else set.add(interest);
        state.survey.interests = Array.from(set);
      }

      const canNext = Vue.computed(() => (state.survey.interests || []).length > 0);

      function next() {
        const recs = liveRecs.value;
        state.recommended_directions = recs;
        state.selected_direction = Array.isArray(recs) && recs.length ? recs[0] : '';
        router.push('/result');
      }

      return { SKILL_TAGS, interests, toggle, canNext, next, liveRecs };
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
            <p class="subtitle">Опрос по интересам — выберите всё, что вам интересно</p>

            <div class="content compact">
              <div class="list" role="group" aria-label="Навыки и темы">
                <label v-for="i in SKILL_TAGS" :key="i" class="list-item">
                  <span class="title">{{ i }}</span>
                  <input type="checkbox" :checked="interests.includes(i)" @change="toggle(i)" />
                </label>
              </div>

              <div class="note" style="margin-top:12px">
                <div><strong>Рекомендации:</strong></div>
                <div style="margin-top:6px">
                  {{ (liveRecs || []).join(', ') || '—' }}
                </div>
              </div>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" :disabled="!canNext" @click="next">Далее</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
