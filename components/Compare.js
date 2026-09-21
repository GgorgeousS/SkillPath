(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  window.SkillPathComponents.Compare = {
    name: 'Compare',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;
      const D = window.SkillPathDirections;

      const rows = Vue.computed(() => {
        const recommended = (state.recommended_directions || []).slice(0, 3);
        // Рекомендованные направления поднимаем наверх, остальные — в исходном порядке.
        const order = recommended.concat(D.ALL.filter((d) => !recommended.includes(d)));
        return order.map((key) => {
          const i = D.info(key);
          return {
            key,
            recommended: recommended.includes(key),
            selected: state.selected_direction === key,
            title: i.title,
            summary: i.summary,
            tasks: i.tasks,
            skills: i.skills.map((s) => (D.SKILL_INFO[s] ? D.SKILL_INFO[s].label : s)),
            entry: i.entry,
          };
        });
      });

      function choose(key) {
        // Без аккаунта выбор запоминаем, регистрируем пользователя и после входа продолжаем с этого места.
        if (!SkillPathAuth.auth.user) {
          SkillPathAuth.setPendingDirection(key);
          router.push({ path: '/auth', query: { mode: 'register', redirect: '/skills' } });
          return;
        }
        state.selected_direction = key;
        SkillPathStore.logEvent('direction', 'Выбрано направление: ' + D.title(key));
        router.push('/skills');
      }

      return { rows, choose };
    },
    template: `
      <main class="page" id="main">
        <div class="shell">
          <div class="phone">
            <div class="topbar">
              <button class="back" type="button" @click="$router.back()" aria-label="Назад">←</button>
              <div class="topbar-title">SkillPath</div>
              <div class="topbar-right" aria-hidden="true">
                <img class="logo-mini" src="./assets/logo-mark.png" alt="" />
              </div>
            </div>
            <p class="subtitle">Сравнение направлений</p>

            <div class="content compact">
              <div class="hint" role="note">
                <strong>Подсказка.</strong> Сравните направления по задачам, навыкам и порогу входа, затем выберите подходящее. Рекомендованные по вашему опросу отмечены и стоят выше.
              </div>

              <div class="table-wrap" tabindex="0" role="region" aria-label="Таблица сравнения направлений">
                <table class="compare">
                  <thead>
                    <tr>
                      <th scope="col">Направление</th>
                      <th scope="col">Чем занимается</th>
                      <th scope="col">Примеры задач</th>
                      <th scope="col">Ключевые навыки</th>
                      <th scope="col">Порог входа</th>
                      <th scope="col"><span class="sr-only">Действие</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in rows" :key="r.key" :class="{ 'is-selected': r.selected }">
                      <th scope="row">
                        {{ r.title }}
                        <div v-if="r.recommended"><span class="tag">Рекомендуем</span></div>
                      </th>
                      <td>{{ r.summary }}</td>
                      <td>
                        <ul class="plain-list">
                          <li v-for="t in r.tasks" :key="t">{{ t }}</li>
                        </ul>
                      </td>
                      <td>{{ r.skills.join(', ') }}</td>
                      <td>{{ r.entry }}</td>
                      <td>
                        <button class="btn btn-small" type="button" @click="choose(r.key)" :aria-label="'Выбрать направление: ' + r.title">Выбрать</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
