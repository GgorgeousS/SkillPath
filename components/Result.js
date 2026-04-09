(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  window.SkillPathComponents.Result = {
    name: 'Result',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;

      const directions = Vue.computed(() => state.recommended_directions || []);
      const selected = Vue.computed({
        get: () => state.selected_direction,
        set: (v) => {
          state.selected_direction = String(v || '');
        },
      });

      const openDetails = Vue.ref('');

      Vue.watch(
        directions,
        (list) => {
          if (!Array.isArray(list) || !list.length) return;
          if (!selected.value || !list.includes(selected.value)) selected.value = list[0];
        },
        { immediate: true }
      );

      function buildPlan() {
        if (!selected.value) return;
        router.push('/skills');
      }

      function coverFor(direction) {
        if (direction === 'Frontend') return './assets/cover-frontend.svg';
        if (direction === 'Backend') return './assets/cover-frontend.svg';
        if (direction === 'QA Manual') return './assets/cover-qa.svg';
        if (direction === 'DevOps') return './assets/cover-qa.svg';
        if (direction === 'Cybersecurity') return './assets/cover-qa.svg';
        if (direction === 'UI/UX') return './assets/cover-ux.svg';
        if (direction === 'Data Analyst') return './assets/cover-ux.svg';
        if (direction === 'Mobile') return './assets/cover-ux.svg';
        return './assets/cover-ux.svg';
      }

      function titleFor(direction) {
        if (direction === 'Frontend') return 'Frontend‑разработчик';
        if (direction === 'Backend') return 'Backend‑разработчик';
        if (direction === 'QA Manual') return 'Тестирование (QA Manual)';
        if (direction === 'UI/UX') return 'Веб‑дизайн (UI/UX)';
        if (direction === 'Data Analyst') return 'Data Analyst (аналитик данных)';
        if (direction === 'DevOps') return 'DevOps‑инженер';
        if (direction === 'Mobile') return 'Mobile‑разработчик';
        if (direction === 'Cybersecurity') return 'Кибербезопасность';
        return direction;
      }

      function detailsFor(direction) {
        if (direction === 'Frontend') {
          return [
            'Что делать: верстка, компоненты, SPA, адаптив.',
            'Инструменты: HTML/CSS/JS, Vue/React, Git.',
            'Почему подходит: видимый результат и работа с UI.',
          ];
        }
        if (direction === 'Backend') {
          return [
            'Что делать: логика сервера, базы данных, интеграции.',
            'Инструменты: API, SQL, язык (Python/Node/Java), Git.',
            'Почему подходит: любите «как оно работает внутри».',
          ];
        }
        if (direction === 'QA Manual') {
          return [
            'Что делать: тест-кейсы, чек-листы, баг-репорты.',
            'Инструменты: Postman, DevTools, основы API.',
            'Почему подходит: внимательность и системность.',
          ];
        }
        if (direction === 'UI/UX') {
          return [
            'Что делать: прототипы, сценарии, исследования.',
            'Инструменты: Figma, UX-паттерны, аналитика.',
            'Почему подходит: интерес к дизайну и пользователям.',
          ];
        }
        if (direction === 'Data Analyst') {
          return [
            'Что делать: анализ данных, метрики, отчёты.',
            'Инструменты: SQL, Excel/BI, Python (по желанию).',
            'Почему подходит: нравится искать закономерности.',
          ];
        }
        if (direction === 'DevOps') {
          return [
            'Что делать: окружения, деплой, надёжность, автоматизация.',
            'Инструменты: Linux, Docker, CI/CD, облака.',
            'Почему подходит: любите системный подход.',
          ];
        }
        if (direction === 'Mobile') {
          return [
            'Что делать: приложения для iOS/Android.',
            'Инструменты: Kotlin/Swift или Flutter, API, Git.',
            'Почему подходит: нравится продукт «в кармане».',
          ];
        }
        if (direction === 'Cybersecurity') {
          return [
            'Что делать: искать уязвимости, повышать защищённость.',
            'Инструменты: сети, Linux, базовые практики безопасности.',
            'Почему подходит: интерес к защите и рискам.',
          ];
        }
        return ['Опишите интересы на опросе — и мы подберём направление.'];
      }

      function toggleDetails(direction) {
        openDetails.value = openDetails.value === direction ? '' : direction;
      }

      return {
        directions,
        selected,
        openDetails,
        buildPlan,
        coverFor,
        titleFor,
        detailsFor,
        toggleDetails,
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
            <p class="subtitle">Направления подходящие для вас:</p>

            <div class="content compact">
              <div class="grid cols-3" v-if="directions.length">
                <div class="direction" :class="{ 'is-selected': selected === d }" v-for="(d, idx) in directions" :key="d">
                  <div class="direction-head">
                    <span class="tag" v-if="idx === 0">Рекомендуем</span>
                    <span v-else class="tag">Вариант</span>
                    <input
                      type="radio"
                      name="direction"
                      :value="d"
                      v-model="selected"
                      aria-label="Выбрать направление"
                    />
                  </div>
                  <img class="media-img" :src="coverFor(d)" alt="" aria-hidden="true" />
                  <div class="direction-body">
                    <div style="min-width:0;">
                      <div class="h2">{{ titleFor(d) }}</div>
                      <p class="small">Выбрано: <strong>{{ selected === d ? 'да' : 'нет' }}</strong></p>
                    </div>
                    <button type="button" class="btn-ghost" @click="toggleDetails(d)">
                      {{ openDetails === d ? 'Свернуть' : 'Подробнее' }}
                    </button>
                  </div>

                  <div v-if="openDetails === d" class="note" style="margin-top:10px">
                    <div v-for="line in detailsFor(d)" :key="line" style="margin:6px 0">{{ line }}</div>
                  </div>
                </div>
              </div>

              <div class="note" v-else>
                Рекомендации пока не рассчитаны. Вернитесь на опрос и выберите интересы.
              </div>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" :disabled="!selected" @click="buildPlan">Построить план</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
