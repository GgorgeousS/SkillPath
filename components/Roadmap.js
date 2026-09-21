(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  function graphFor(direction) {
    // Small DAG per trajectory: nodes match skill keys used in Skills screen.
    // Edges mean "learn A before B".
    if (direction === 'Backend') {
      return {
        nodes: [
          { id: 'git', label: 'Git' },
          { id: 'python', label: 'Python' },
          { id: 'sql', label: 'SQL' },
          { id: 'api', label: 'API' },
          { id: 'node', label: 'Node.js' },
        ],
        edges: [
          ['git', 'api'],
          ['python', 'api'],
          ['sql', 'api'],
          ['node', 'api'],
        ],
      };
    }
    if (direction === 'QA Manual') {
      return {
        nodes: [
          { id: 'testing', label: 'Testing' },
          { id: 'testcases', label: 'Test cases' },
          { id: 'bugreports', label: 'Bug reports' },
          { id: 'api', label: 'API' },
          { id: 'sql', label: 'SQL' },
        ],
        edges: [
          ['testing', 'testcases'],
          ['testing', 'bugreports'],
          ['api', 'bugreports'],
          ['sql', 'api'],
        ],
      };
    }
    if (direction === 'UI/UX') {
      return {
        nodes: [
          { id: 'uxresearch', label: 'UX‑исследования' },
          { id: 'wireframes', label: 'Вайрфреймы' },
          { id: 'prototyping', label: 'Прототипирование' },
          { id: 'ui', label: 'UI‑композиция' },
          { id: 'figma', label: 'Figma' },
        ],
        edges: [
          ['uxresearch', 'wireframes'],
          ['wireframes', 'prototyping'],
          ['prototyping', 'ui'],
          ['figma', 'prototyping'],
        ],
      };
    }
    if (direction === 'Data Analyst') {
      return {
        nodes: [
          { id: 'excel', label: 'Excel' },
          { id: 'statistics', label: 'Статистика' },
          { id: 'sql', label: 'SQL' },
          { id: 'python', label: 'Python' },
          { id: 'dataviz', label: 'Data viz' },
        ],
        edges: [
          ['excel', 'dataviz'],
          ['statistics', 'dataviz'],
          ['sql', 'python'],
          ['python', 'dataviz'],
        ],
      };
    }
    if (direction === 'DevOps') {
      return {
        nodes: [
          { id: 'linux', label: 'Linux' },
          { id: 'docker', label: 'Docker' },
          { id: 'cicd', label: 'CI/CD' },
          { id: 'cloud', label: 'Cloud' },
          { id: 'networking', label: 'Networking' },
        ],
        edges: [
          ['linux', 'docker'],
          ['docker', 'cicd'],
          ['cicd', 'cloud'],
          ['networking', 'cloud'],
        ],
      };
    }
    if (direction === 'Mobile') {
      return {
        nodes: [
          { id: 'git', label: 'Git' },
          { id: 'api', label: 'API' },
          { id: 'kotlin', label: 'Kotlin' },
          { id: 'swift', label: 'Swift' },
          { id: 'flutter', label: 'Flutter' },
        ],
        edges: [
          ['git', 'api'],
          ['kotlin', 'api'],
          ['swift', 'api'],
          ['flutter', 'api'],
        ],
      };
    }
    if (direction === 'Cybersecurity') {
      return {
        nodes: [
          { id: 'networking', label: 'Networking' },
          { id: 'linux', label: 'Linux' },
          { id: 'owasp', label: 'OWASP' },
          { id: 'threats', label: 'Threat models' },
          { id: 'sectools', label: 'Security tools' },
        ],
        edges: [
          ['networking', 'owasp'],
          ['linux', 'sectools'],
          ['owasp', 'sectools'],
          ['networking', 'threats'],
        ],
      };
    }

    // Frontend (default)
    return {
      nodes: [
        { id: 'html', label: 'HTML' },
        { id: 'css', label: 'CSS' },
        { id: 'javascript', label: 'JavaScript' },
        { id: 'git', label: 'Git' },
        { id: 'api', label: 'API' },
      ],
      edges: [
        ['html', 'css'],
        ['css', 'javascript'],
        ['javascript', 'api'],
        ['git', 'api'],
      ],
    };
  }

  // Порядок изучения навыков направления используется и в плане (Plan.js).
  window.SkillPathRoadmapGraph = {
    graphFor,
  };

  window.SkillPathComponents.Roadmap = {
    name: 'Roadmap',
    components: { RoadmapTimeline: window.SkillPathComponents.RoadmapTimeline },
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;
      const D = window.SkillPathDirections;

      const direction = Vue.computed(
        () => state.selected_direction || (state.recommended_directions || [])[0] || 'Frontend'
      );

      const skillKeys = Vue.computed(() => {
        const info = D.info(direction.value) || D.info('Frontend');
        return info.skills;
      });

      const labelOf = (key) => (D.SKILL_INFO[key] ? D.SKILL_INFO[key].label : key);

      const strengths = Vue.computed(() => skillKeys.value.filter((k) => state.skills[k] === 'yes').map(labelOf));
      const gaps = Vue.computed(() => skillKeys.value.filter((k) => state.skills[k] === 'no').map(labelOf));

      // Готовность к junior‑позиции: «Отлично знаю» = 1, «Уверенная база» = 0.5, «Не знаю» = 0.
      const readiness = Vue.computed(() => {
        const list = skillKeys.value;
        if (!list.length) return 0;
        const sum = list.reduce((acc, k) => {
          const v = state.skills[k];
          return acc + (v === 'yes' ? 1 : v === 'mid' ? 0.5 : 0);
        }, 0);
        return Math.round((sum / list.length) * 100);
      });

      const readinessText = Vue.computed(() => {
        const r = readiness.value;
        if (r >= 75) return 'Вы близки к junior‑уровню: закрепите слабые места и переходите к практике.';
        if (r >= 40) return 'Хорошая база: закройте пробелы, и уровень junior станет реальным.';
        return 'Пока рано подаваться на junior‑позиции: начните с базовых навыков из списка пробелов.';
      });

      // Roadmap строится под пользователя: направление, уровень навыков, темп и отметки в плане.
      const sections = Vue.computed(() => SkillPathPlan.buildRoadmapSections(state));
      const stats = Vue.computed(() => SkillPathPlan.planStats(SkillPathPlan.buildPlanModel(state)));

      Vue.watch(
        [strengths, gaps],
        () => {
          state.roadmap = state.roadmap || { strengths: [], gaps: [] };
          state.roadmap.strengths = strengths.value;
          state.roadmap.gaps = gaps.value;
        },
        { immediate: true }
      );

      function toPlan() {
        router.push('/plan');
      }

      return { title: Vue.computed(() => D.title(direction.value)), readiness, readinessText, sections, stats, toPlan };
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
            <p class="subtitle">Roadmap</p>

            <div class="content compact">
              <div class="hint" role="note">
                <strong>Шаг 2 из 4.</strong> Каждый раздел — навык вашего направления, внутри — темы для изучения. Проценты растут, когда вы отмечаете задания в карьерном плане.
              </div>

              <div class="panel">
                <div class="h2">Ваш roadmap: {{ title }}</div>

                <div class="progress-wrap" style="margin-top:12px">
                  <div class="progress-meta">
                    <span class="badge">Готовность к junior‑позиции</span>
                    <span class="badge">{{ readiness }}%</span>
                  </div>
                  <div class="progress-bar" role="progressbar" aria-label="Готовность к junior-позиции" :aria-valuenow="readiness" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar__fill" :style="{ width: readiness + '%' }"></div>
                  </div>
                  <p class="small">{{ readinessText }}</p>
                </div>

                <div class="progress-wrap" style="margin-top:12px">
                  <div class="progress-meta">
                    <span class="badge">Изучено по плану: {{ stats.done }} из {{ stats.total }} заданий</span>
                    <span class="badge">{{ stats.percent }}%</span>
                  </div>
                  <div class="progress-bar" role="progressbar" aria-label="Выполнение плана" :aria-valuenow="stats.percent" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar__fill" :style="{ width: stats.percent + '%' }"></div>
                  </div>
                </div>
              </div>

              <roadmap-timeline :sections="sections"></roadmap-timeline>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" @click="toPlan">Сформировать карьерный план</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
