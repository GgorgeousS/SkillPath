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

      const progressPercent = Vue.computed(() => {
        const total = trackedSkills.value.length || 1;
        return Math.round((done.value.length / total) * 100);
      });

      function topoOrder(nodes, edges) {
        const ids = nodes.map((n) => n.id);
        const idx = Object.create(null);
        ids.forEach((id, i) => (idx[id] = i));

        const incoming = Object.create(null);
        const outgoing = Object.create(null);
        ids.forEach((id) => {
          incoming[id] = 0;
          outgoing[id] = [];
        });

        (edges || []).forEach(([a, b]) => {
          if (!(a in outgoing) || !(b in incoming)) return;
          outgoing[a].push(b);
          incoming[b] += 1;
        });

        const q = ids.filter((id) => incoming[id] === 0);
        q.sort((a, b) => (idx[a] ?? 0) - (idx[b] ?? 0));

        const out = [];
        while (q.length) {
          const cur = q.shift();
          out.push(cur);
          (outgoing[cur] || []).forEach((nxt) => {
            incoming[nxt] -= 1;
            if (incoming[nxt] === 0) {
              q.push(nxt);
              q.sort((a, b) => (idx[a] ?? 0) - (idx[b] ?? 0));
            }
          });
        }

        ids.forEach((id) => {
          if (!out.includes(id)) out.push(id);
        });
        return out;
      }

      const embeddedGraph = Vue.computed(() => {
        const helper = window.SkillPathRoadmapGraph;
        if (!helper || typeof helper.graphFor !== 'function') return null;
        const g = helper.graphFor(direction.value);
        const layout = helper.layoutGraph(g.nodes, g.edges);
        const nodesWithPos = g.nodes.map((n) => {
          const p = layout.pos[n.id];
          const v = state.skills ? state.skills[n.id] : 'no';
          return {
            ...n,
            x: p ? p.x : 0,
            y: p ? p.y : 0,
            w: p ? p.w : 132,
            h: p ? p.h : 42,
            status: v === 'yes' || v === 'mid' || v === 'no' ? v : 'no',
          };
        });

        const orderIds = topoOrder(g.nodes, g.edges);
        const idToLabel = Object.create(null);
        g.nodes.forEach((n) => (idToLabel[n.id] = n.label));
        const order = orderIds.map((id) => idToLabel[id] || id);

        return {
          nodes: nodesWithPos,
          edges: layout.edgeLines,
          width: layout.width,
          height: layout.height,
          order,
        };
      });

      const planDays = Vue.computed(() => {
        // Prefer saved plan if present; otherwise build from the same roadmap order.
        const saved = state.plan && Array.isArray(state.plan.days) ? state.plan.days : [];
        if (saved.length) return saved;

        const g = embeddedGraph.value;
        if (!g) return [];
        return (g.order || []).map((label, i) => ({ day: i + 1, label }));
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

      const aiRecommendation = Vue.computed(() => {
        // Simple deterministic recommendation (no external API)
        const remainingList = remaining.value.slice(0, 3);
        if (!remainingList.length) return 'Рекомендация: закрепляйте навыки через проекты.';
        return 'Рекомендация: начните с ' + remainingList.join(', ') + ' и закрепите практикой.';
      });

      function goPlan() {
        router.push('/plan');
      }
      function goRoadmap() {
        router.push('/roadmap');
      }
      function goAI() {
        router.push('/ai');
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
        embeddedGraph,
        planDays,
        displayPlanModel,
        hasMorePlanDays,
        isPlanExpanded,
        aiRecommendation,
        goPlan,
        goRoadmap,
        goAI,
        togglePlanExpanded,
        setTaskDone,
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
            <p class="subtitle">Прогресс</p>

            <div class="content compact">
              <div class="panel">
                <div class="h2">Прогресс</div>

                <div class="progress-wrap" style="margin-top:12px">
                  <div class="progress-meta">
                    <span class="badge">Заполнение прогресса в %</span>
                    <span class="badge">{{ progressPercent }}%</span>
                  </div>
                  <div class="progress-bar" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar__fill" :style="{ width: progressPercent + '%' }"></div>
                  </div>
                </div>

                <div style="margin-top:14px">
                  <div class="h2" style="font-size:14px;margin-bottom:8px">Выполнено</div>
                  <div class="chip-list" v-if="done.length">
                    <span class="chip" v-for="s in done" :key="s">{{ s }}</span>
                  </div>
                  <div class="note" v-else>Пока нет отмеченных выполненных навыков.</div>
                </div>

                <div style="margin-top:12px">
                  <div class="h2" style="font-size:14px;margin-bottom:8px">Осталось</div>
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
                                <input
                                  class="task-checkbox"
                                  type="checkbox"
                                  :checked="t.done"
                                  @click.stop
                                  @change.stop="setTaskDone(d.day, idx, $event.target.checked)"
                                  aria-label="Отметить выполнено"
                                />
                                <span class="task-text">{{ t.text }}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div class="note" v-else>Откройте карту навыков и сформируйте план.</div>
                    </div>
                  </div>

                  <div class="card-link card-link--static">
                    <div class="card-link__title">Карта навыков</div>
                    <div class="card-link__box card-link__box--stack">
                      <div class="skill-graph" v-if="embeddedGraph">
                        <svg :viewBox="'0 0 ' + embeddedGraph.width + ' ' + embeddedGraph.height" class="skill-graph__svg" aria-label="Граф навыков" preserveAspectRatio="xMidYMin meet">
                          <defs>
                            <marker id="arrow-mini" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L0,6 L6,3 z" class="skill-graph__arrow" />
                            </marker>
                          </defs>

                          <line
                            v-for="e in embeddedGraph.edges"
                            :key="e.id"
                            :x1="e.x1"
                            :y1="e.y1"
                            :x2="e.x2"
                            :y2="e.y2"
                            class="skill-graph__edge"
                            marker-end="url(#arrow-mini)"
                          />

                          <g v-for="n in embeddedGraph.nodes" :key="n.id" :transform="'translate(' + n.x + ' ' + n.y + ')'">
                            <rect
                              :width="n.w"
                              :height="n.h"
                              rx="14"
                              ry="14"
                              class="skill-graph__node"
                              :class="{ 'is-yes': n.status === 'yes', 'is-mid': n.status === 'mid', 'is-no': n.status === 'no' }"
                            />
                            <text :x="n.w / 2" :y="n.h / 2 + 5" text-anchor="middle" class="skill-graph__label">{{ n.label }}</text>
                          </g>
                        </svg>
                      </div>
                      <div class="note" v-else>Карта навыков пока недоступна.</div>
                    </div>
                  </div>

                  <button class="card-link" type="button" @click="goAI">
                    <div class="card-link__title">Рекомендации ИИ</div>
                    <div class="card-link__box">{{ aiRecommendation }}</div>
                  </button>
                </div>
              </div>
            </div>

            <div class="sticky-footer">
              <div class="bottom-menu">
                <div class="bottom-menu-label">ИИ ассистент</div>
                <button class="ai-fab" type="button" @click="goAI" aria-label="Открыть чат с ИИ">ИИ</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
