(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  window.SkillPathComponents.Result = {
    name: 'Result',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;
      const D = window.SkillPathDirections;

      // Рекомендации — 2–3 направления; остальные доступны на экране сравнения.
      const directions = Vue.computed(() => (state.recommended_directions || []).slice(0, 3));
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
        SkillPathStore.logEvent('direction', 'Выбрано направление: ' + D.title(selected.value));
        router.push('/skills');
      }

      function goCompare() {
        router.push('/compare');
      }

      function toggleDetails(direction) {
        openDetails.value = openDetails.value === direction ? '' : direction;
      }

      function infoFor(direction) {
        return D.info(direction) || { title: direction, cover: './assets/cover-ux.svg', summary: '', tasks: [], tools: [], fit: '' };
      }

      return { directions, selected, openDetails, buildPlan, goCompare, toggleDetails, infoFor };
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
            <p class="subtitle">Направления на основе ваших ответов</p>

            <div class="content compact">
              <div class="hint" role="note">
                <strong>Шаг 1 из 4.</strong> Выберите одно направление — по нему построим оценку навыков и план. Если сомневаетесь, откройте сравнение всех направлений.
              </div>

              <div class="grid cols-3" v-if="directions.length" role="radiogroup" aria-label="Рекомендованные направления">
                <div class="direction" :class="{ 'is-selected': selected === d }" v-for="(d, idx) in directions" :key="d">
                  <div class="direction-head">
                    <span class="tag" v-if="idx === 0">Рекомендуем</span>
                    <span v-else class="tag">Вариант</span>
                    <input
                      type="radio"
                      name="direction"
                      :value="d"
                      v-model="selected"
                      :aria-label="'Выбрать направление: ' + infoFor(d).title"
                    />
                  </div>
                  <img class="media-img" :src="infoFor(d).cover" alt="" aria-hidden="true" />
                  <div class="direction-body">
                    <div style="min-width:0;">
                      <div class="h2">{{ infoFor(d).title }}</div>
                      <p class="small">{{ infoFor(d).summary }}</p>
                    </div>
                  </div>

                  <div class="actions" style="margin-top:10px">
                    <button
                      type="button"
                      class="btn-ghost"
                      :aria-expanded="openDetails === d ? 'true' : 'false'"
                      @click="toggleDetails(d)"
                    >
                      {{ openDetails === d ? 'Свернуть' : 'Примеры задач и почему подходит' }}
                    </button>
                  </div>

                  <div v-if="openDetails === d" class="note">
                    <div><strong>Примеры задач:</strong></div>
                    <ul class="plain-list">
                      <li v-for="t in infoFor(d).tasks" :key="t">{{ t }}</li>
                    </ul>
                    <div><strong>Инструменты:</strong> {{ infoFor(d).tools.join(', ') }}</div>
                    <div style="margin-top:6px"><strong>Почему подходит:</strong> {{ infoFor(d).fit }}</div>
                  </div>
                </div>
              </div>

              <div class="note" v-else>
                Рекомендации пока не рассчитаны. Вернитесь на опрос и выберите интересы.
              </div>

              <div class="actions" style="justify-content:center">
                <button type="button" class="btn-ghost" @click="goCompare">Сравнить все направления</button>
              </div>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" :disabled="!selected" @click="buildPlan">Оценить навыки</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
