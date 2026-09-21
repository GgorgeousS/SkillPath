(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  window.SkillPathComponents.Knowledge = {
    name: 'Knowledge',
    setup() {
      const D = window.SkillPathDirections;
      const query = Vue.ref('');

      const items = Vue.computed(() => {
        const q = query.value.trim().toLowerCase();
        return D.ALL.map((key) => {
          const i = D.info(key);
          return {
            key,
            title: i.title,
            summary: i.summary,
            tools: i.tools,
            tasks: i.tasks,
            resources: i.resources,
            skills: i.skills.map((s) => D.SKILL_INFO[s]).filter(Boolean),
          };
        }).filter((it) => {
          if (!q) return true;
          const hay = [it.title, it.summary, it.tools.join(' '), it.tasks.join(' ')]
            .concat(it.skills.map((s) => s.label + ' ' + s.desc))
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
      });

      return { query, items };
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
            <p class="subtitle">База знаний</p>

            <div class="content compact">
              <div class="hint" role="note">
                <strong>Подсказка.</strong> Справочник по профессиям, технологиям и навыкам. Найдите нужное через поиск или раскройте направление.
              </div>

              <div class="field">
                <label class="label" for="kb-search">Поиск по профессиям, технологиям и навыкам</label>
                <input id="kb-search" class="input" type="search" v-model="query" placeholder="Например: SQL, Figma, Docker" />
              </div>

              <div class="kb-list" aria-live="polite">
                <details class="panel kb-item" v-for="it in items" :key="it.key">
                  <summary class="kb-item__title">{{ it.title }}</summary>
                  <p class="small kb-p">{{ it.summary }}</p>

                  <div class="h2 kb-h">Инструменты</div>
                  <div class="chip-list">
                    <span class="chip" v-for="t in it.tools" :key="t">{{ t }}</span>
                  </div>

                  <div class="h2 kb-h">Навыки</div>
                  <dl class="kb-skills">
                    <template v-for="s in it.skills" :key="s.label">
                      <dt>{{ s.label }}</dt>
                      <dd>{{ s.desc }}</dd>
                    </template>
                  </dl>

                  <div class="h2 kb-h">Примеры задач</div>
                  <ul class="plain-list">
                    <li v-for="t in it.tasks" :key="t">{{ t }}</li>
                  </ul>

                  <div class="h2 kb-h">Где изучать</div>
                  <ul class="plain-list">
                    <li v-for="r in it.resources" :key="r.url">
                      <a :href="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }}</a>
                    </li>
                  </ul>
                </details>

                <div class="note" v-if="!items.length">Ничего не найдено. Попробуйте другой запрос.</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
