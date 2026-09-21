(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  window.SkillPathComponents.Progress = {
    name: 'Progress',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;

      const direction = Vue.computed(
        () => state.selected_direction || (state.recommended_directions || [])[0] || 'Frontend'
      );

      const trackedSkills = Vue.computed(() => {
        // Track the same core set used in Roadmap per direction
        const d = direction.value;
        const map = {
          Frontend: [
            { key: 'html', label: 'HTML' },
            { key: 'css', label: 'CSS' },
            { key: 'javascript', label: 'JavaScript' },
            { key: 'git', label: 'Git' },
            { key: 'api', label: 'API' },
          ],
          Backend: [
            { key: 'python', label: 'Python' },
            { key: 'sql', label: 'SQL' },
            { key: 'api', label: 'API' },
            { key: 'git', label: 'Git' },
            { key: 'node', label: 'Node.js' },
          ],
          'QA Manual': [
            { key: 'testing', label: 'Testing' },
            { key: 'testcases', label: 'Test cases' },
            { key: 'bugreports', label: 'Bug reports' },
            { key: 'api', label: 'API' },
            { key: 'sql', label: 'SQL' },
          ],
          'UI/UX': [
            { key: 'figma', label: 'Figma' },
            { key: 'wireframes', label: 'Wireframes' },
            { key: 'prototyping', label: 'Prototyping' },
            { key: 'uxresearch', label: 'UX research' },
            { key: 'ui', label: 'UI composition' },
          ],
          'Data Analyst': [
            { key: 'sql', label: 'SQL' },
            { key: 'excel', label: 'Excel' },
            { key: 'statistics', label: 'Statistics' },
            { key: 'dataviz', label: 'Data viz' },
            { key: 'python', label: 'Python' },
          ],
          DevOps: [
            { key: 'linux', label: 'Linux' },
            { key: 'docker', label: 'Docker' },
            { key: 'cicd', label: 'CI/CD' },
            { key: 'cloud', label: 'Cloud' },
            { key: 'networking', label: 'Networking' },
          ],
          Mobile: [
            { key: 'kotlin', label: 'Kotlin' },
            { key: 'swift', label: 'Swift' },
            { key: 'api', label: 'API' },
            { key: 'git', label: 'Git' },
            { key: 'flutter', label: 'Flutter' },
          ],
          Cybersecurity: [
            { key: 'networking', label: 'Networking' },
            { key: 'linux', label: 'Linux' },
            { key: 'owasp', label: 'OWASP' },
            { key: 'threats', label: 'Threat models' },
            { key: 'sectools', label: 'Security tools' },
          ],
        };
        return map[d] || map.Frontend;
      });

      const done = Vue.computed(() => {
        return trackedSkills.value
          .filter((s) => state.skills[s.key] === 'yes')
          .map((s) => s.label);
      });

      const remaining = Vue.computed(() => {
        return trackedSkills.value
          .filter((s) => state.skills[s.key] !== 'yes')
          .map((s) => s.label);
      });


      // Краткая сводка roadmap: раздел → процент изучения (подробно — на экране Roadmap).
      const roadmapSections = Vue.computed(() => {
        const helper = window.SkillPathPlan;
        return helper && typeof helper.buildRoadmapSections === 'function' ? helper.buildRoadmapSections(state) : [];
      });

      function limitPlanModel(model, maxDay) {
        if (!model || !model.weeks) return model;
        const weeks = (model.weeks || [])
          .map((w) => ({
            ...w,
            days: (w.days || []).filter((d) => typeof d.day === 'number' && d.day <= maxDay),
          }))
          .filter((w) => (w.days || []).length);
        const flatDays = Array.isArray(model.flatDays) ? model.flatDays.slice(0, maxDay) : [];
        return { ...model, weeks, flatDays };
      }

      const planModelFull = Vue.computed(() => {
        const helper = window.SkillPathPlan;
        if (!helper || typeof helper.buildPlanModel !== 'function') return null;
        return helper.buildPlanModel(state);
      });

      const planDayCount = Vue.computed(() => {
        const m = planModelFull.value;
        return m && Array.isArray(m.flatDays) ? m.flatDays.length : 0;
      });

      const isPlanExpanded = Vue.ref(false);
      const hasMorePlanDays = Vue.computed(() => planDayCount.value > 7);
      const displayPlanModel = Vue.computed(() => {
        const full = planModelFull.value;
        if (!full) return null;
        return isPlanExpanded.value ? full : limitPlanModel(full, 7);
      });

      function togglePlanExpanded() {
        isPlanExpanded.value = !isPlanExpanded.value;
      }

      // Прогресс = доля выполненных заданий плана.
      const stats = Vue.computed(() => {
        const helper = window.SkillPathPlan;
        const m = planModelFull.value;
        if (!helper || typeof helper.planStats !== 'function' || !m) return { done: 0, total: 0, percent: 0 };
        return helper.planStats(m);
      });
      const progressPercent = Vue.computed(() => stats.value.percent);

      const hasSavedPlan = Vue.computed(() => !!(state.plan && state.plan.saved_at));

      // Рекомендации строятся по правилам из состояния пользователя: следующий шаг плана и приоритетные навыки.
      const recommendation = Vue.computed(() => {
        const lines = [];
        const m = planModelFull.value;
        if (!hasSavedPlan.value) {
          lines.push('Сформируйте и сохраните карьерный план — так вы сможете отмечать шаги и видеть динамику.');
        } else if (m) {
          let next = null;
          (m.weeks || []).some((w) =>
            (w.days || []).some((d) => {
              if ((d.tasks || []).some((t) => !t.done)) {
                next = d;
                return true;
              }
              return false;
            })
          );
          if (next) {
            lines.push('Следующий шаг: ' + next.header + (next.skillLabel ? ' — ' + next.skillLabel : '') + '.');
          } else {
            lines.push('Все задания плана выполнены. Соберите портфолио и переходите к откликам на вакансии.');
          }
        }
        const rest = remaining.value.slice(0, 3);
        if (rest.length) lines.push('Приоритетные навыки: ' + rest.join(', ') + '. Закрепляйте их практикой и мини‑проектами.');
        else lines.push('Навыки направления освоены — закрепляйте знания через проекты и повторение.');
        return lines;
      });

      function goPlan() {
        router.push('/plan');
      }
      function goRoadmap() {
        router.push('/roadmap');
      }
      function goKnowledge() {
        router.push('/knowledge');
      }

      function setTaskDone(day, idx, checked) {
        const helper = window.SkillPathPlan;
        if (!helper || typeof helper.setTaskDone !== 'function') return;
        helper.setTaskDone(state, day, idx, checked);
      }

      return {
        progressPercent,
        done,
        remaining,
        roadmapSections,
        displayPlanModel,
        hasMorePlanDays,
        isPlanExpanded,
        stats,
        hasSavedPlan,
        recommendation,
        goPlan,
        goRoadmap,
        goKnowledge,
        togglePlanExpanded,
        setTaskDone,
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
            <p class="subtitle">Прогресс</p>

            <div class="content compact">
              <div class="hint" role="note">
                <strong>Шаг 4 из 4.</strong> Отмечайте выполненные задания прямо в плане — индикатор обновится сам. Полный план открывается по нажатию на карточку.
              </div>
              <div class="panel">
                <div class="h2">Прогресс</div>

                <div class="progress-wrap" style="margin-top:12px">
                  <div class="progress-meta">
                    <span class="badge">Выполнено заданий: {{ stats.done }} из {{ stats.total }}</span>
                    <span class="badge">{{ progressPercent }}%</span>
                  </div>
                  <div class="progress-bar" role="progressbar" aria-label="Выполнение плана" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar__fill" :style="{ width: progressPercent + '%' }"></div>
                  </div>
                  <p class="small" v-if="!hasSavedPlan">План ещё не сохранён — откройте «Ваш карьерный план» и нажмите «Сохранить план».</p>
                </div>

                <div style="margin-top:14px">
                  <div class="h2" style="font-size:14px;margin-bottom:8px">Освоенные навыки</div>
                  <div class="chip-list" v-if="done.length">
                    <span class="chip" v-for="s in done" :key="s">{{ s }}</span>
                  </div>
                  <div class="note" v-else>Пока нет отмеченных выполненных навыков.</div>
                </div>

                <div style="margin-top:12px">
                  <div class="h2" style="font-size:14px;margin-bottom:8px">Осталось освоить</div>
                  <div class="chip-list" v-if="remaining.length">
                    <span class="chip" v-for="s in remaining" :key="s">{{ s }}</span>
                  </div>
                  <div class="note" v-else>Всё выполнено — отличный прогресс.</div>
                </div>

                <div style="margin-top:16px">
                  <div
                    class="card-link"
                    role="button"
                    tabindex="0"
                    @click="goPlan"
                    @keydown.enter.prevent="goPlan"
                    @keydown.space.prevent="goPlan"
                  >
                    <div class="card-link__titleRow">
                      <div class="card-link__title">Ваш карьерный план</div>
                      <button
                        v-if="hasMorePlanDays"
                        class="card-link__toggle"
                        type="button"
                        @click.stop.prevent="togglePlanExpanded"
                        :aria-label="isPlanExpanded ? 'Свернуть план' : 'Развернуть план'"
                        :aria-expanded="isPlanExpanded ? 'true' : 'false'"
                      >
                        {{ isPlanExpanded ? '▴' : '▾' }}
                      </button>
                    </div>
                    <div class="card-link__box card-link__box--stack">
                      <div class="plan-md" v-if="displayPlanModel && displayPlanModel.weeks && displayPlanModel.weeks.length" @click.stop>
                        <div class="plan-md__title"><strong>{{ displayPlanModel.title }}</strong></div>
                        <div class="plan-md__section">
                          <div class="plan-md__h">Цель</div>
                          <div class="note" style="margin:0">{{ displayPlanModel.goal }}</div>
                        </div>

                        <div class="plan-md__section" v-for="w in displayPlanModel.weeks" :key="w.title">
                          <div class="plan-md__week"><strong>{{ w.title }}</strong></div>
                          <div class="plan-md__day" v-for="d in w.days" :key="d.day">
                            <div class="plan-md__dayTitle"><strong>{{ d.header }}</strong><span v-if="d.skillLabel"> — {{ d.skillLabel }}</span></div>
                            <ul class="task-list" @click.stop>
                              <li v-for="(t, idx) in d.tasks" :key="idx">
                                <label class="task-label" @click.stop>
                                  <input
                                    class="task-checkbox"
                                    type="checkbox"
                                    :checked="t.done"
                                    @change.stop="setTaskDone(d.day, idx, $event.target.checked)"
                                  />
                                  <span class="task-text">{{ t.text }}</span>
                                </label>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div class="note" v-else>Откройте карту навыков и сформируйте план.</div>
                    </div>
                  </div>

                  <div class="card-link card-link--static">
                    <div class="card-link__titleRow">
                      <div class="card-link__title">Roadmap</div>
                      <button class="btn-ghost btn-small" type="button" @click="goRoadmap">Открыть</button>
                    </div>
                    <div class="card-link__box card-link__box--stack">
                      <ul class="rm-summary" v-if="roadmapSections.length">
                        <li v-for="s in roadmapSections" :key="s.id">
                          <span class="rm-summary__icon" aria-hidden="true">{{ s.icon }}</span>
                          <span class="rm-summary__name">{{ s.title }}</span>
                          <span class="rm-summary__pct">{{ s.percent }}%</span>
                          <span class="progress-bar rm-summary__bar" role="progressbar" :aria-label="'Изучено: ' + s.title" :aria-valuenow="s.percent" aria-valuemin="0" aria-valuemax="100">
                            <span class="progress-bar__fill" :style="{ width: s.percent + '%' }"></span>
                          </span>
                        </li>
                      </ul>
                      <div class="note" v-else>Roadmap пока недоступен.</div>
                    </div>
                  </div>

                  <div class="card-link card-link--static">
                    <div class="card-link__title">Рекомендации</div>
                    <div class="card-link__box card-link__box--stack">
                      <p class="rec" v-for="line in recommendation" :key="line">{{ line }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="sticky-footer">
              <div class="actions" style="margin:0">
                <button class="btn btn-primary" type="button" @click="goPlan">Открыть план</button>
                <button class="btn" type="button" @click="goKnowledge">База знаний</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
