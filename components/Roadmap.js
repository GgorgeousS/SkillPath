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

  function computeLevels(nodes, edges) {
    const ids = nodes.map((n) => n.id);
    const incoming = Object.create(null);
    const outgoing = Object.create(null);
    ids.forEach((id) => {
      incoming[id] = 0;
      outgoing[id] = [];
    });

    edges.forEach(([a, b]) => {
      if (!(a in outgoing) || !(b in incoming)) return;
      outgoing[a].push(b);
      incoming[b] += 1;
    });

    const q = [];
    ids.forEach((id) => {
      if (incoming[id] === 0) q.push(id);
    });

    const level = Object.create(null);
    q.forEach((id) => (level[id] = 0));

    while (q.length) {
      const cur = q.shift();
      const curLvl = level[cur] || 0;
      (outgoing[cur] || []).forEach((nxt) => {
        incoming[nxt] -= 1;
        level[nxt] = Math.max(level[nxt] ?? 0, curLvl + 1);
        if (incoming[nxt] === 0) q.push(nxt);
      });
    }

    // fallback: anything not reached goes to 0
    ids.forEach((id) => {
      if (typeof level[id] !== 'number') level[id] = 0;
    });

    return level;
  }

  function layoutGraph(nodes, edges) {
    const levelById = computeLevels(nodes, edges);
    const levels = {};
    nodes.forEach((n) => {
      const lvl = levelById[n.id] || 0;
      levels[lvl] = levels[lvl] || [];
      levels[lvl].push(n);
    });

    const levelKeys = Object.keys(levels)
      .map((x) => Number(x))
      .sort((a, b) => a - b);

    const nodeW = 132;
    const nodeH = 42;
    const gapX = 16;
    const gapY = 26;
    const pad = 14;

    const maxCols = Math.max(1, ...levelKeys.map((k) => levels[k].length));
    const width = pad * 2 + maxCols * nodeW + (maxCols - 1) * gapX;
    const height = pad * 2 + levelKeys.length * nodeH + (levelKeys.length - 1) * gapY;

    const pos = Object.create(null);
    levelKeys.forEach((lvl, rowIdx) => {
      const row = levels[lvl];
      const rowWidth = row.length * nodeW + (row.length - 1) * gapX;
      const startX = pad + Math.max(0, (width - pad * 2 - rowWidth) / 2);
      const y = pad + rowIdx * (nodeH + gapY);
      row.forEach((n, idx) => {
        const x = startX + idx * (nodeW + gapX);
        pos[n.id] = { x, y, w: nodeW, h: nodeH };
      });
    });

    const edgeLines = edges
      .map(([a, b]) => {
        const pa = pos[a];
        const pb = pos[b];
        if (!pa || !pb) return null;
        return {
          id: a + '->' + b,
          x1: pa.x + pa.w / 2,
          y1: pa.y + pa.h,
          x2: pb.x + pb.w / 2,
          y2: pb.y,
        };
      })
      .filter(Boolean);

    return { width, height, pos, edgeLines };
  }

  // Reuse in other screens (Progress/Plan) to keep the map identical.
  window.SkillPathRoadmapGraph = {
    graphFor,
    computeLevels,
    layoutGraph,
  };

  window.SkillPathComponents.Roadmap = {
    name: 'Roadmap',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;

      const direction = Vue.computed(
        () => state.selected_direction || (state.recommended_directions || [])[0] || 'Frontend'
      );

      function titleFor(d) {
        if (d === 'Frontend') return 'Frontend‑разработчик';
        if (d === 'Backend') return 'Backend‑разработчик';
        if (d === 'QA Manual') return 'Тестирование (QA Manual)';
        if (d === 'UI/UX') return 'Веб‑дизайн (UI/UX дизайн)';
        if (d === 'Data Analyst') return 'Data Analyst';
        if (d === 'DevOps') return 'DevOps';
        if (d === 'Mobile') return 'Mobile';
        if (d === 'Cybersecurity') return 'Кибербезопасность';
        return d;
      }

      const skillsForDirection = Vue.computed(() => {
        const key = direction.value;
        // Reuse the same skill keys as Skills screen. If key unknown, fall back to Frontend core.
        if (key === 'Frontend') return [
          { key: 'html', label: 'HTML' },
          { key: 'css', label: 'CSS' },
          { key: 'javascript', label: 'JavaScript' },
          { key: 'git', label: 'Git' },
          { key: 'api', label: 'API' },
        ];
        if (key === 'Backend') return [
          { key: 'python', label: 'Язык (Python)' },
          { key: 'node', label: 'Node.js (база)' },
          { key: 'sql', label: 'SQL' },
          { key: 'api', label: 'API (HTTP)' },
          { key: 'git', label: 'Git' },
        ];
        if (key === 'QA Manual') return [
          { key: 'testing', label: 'Тестирование (база)' },
          { key: 'testcases', label: 'Тест‑кейсы' },
          { key: 'bugreports', label: 'Баг‑репорты' },
          { key: 'sql', label: 'SQL' },
          { key: 'api', label: 'API (Postman)' },
        ];
        if (key === 'UI/UX') return [
          { key: 'figma', label: 'Figma' },
          { key: 'uxresearch', label: 'UX‑исследования' },
          { key: 'wireframes', label: 'Вайрфреймы' },
          { key: 'prototyping', label: 'Прототипирование' },
          { key: 'ui', label: 'UI‑композиция' },
        ];
        if (key === 'Data Analyst') return [
          { key: 'sql', label: 'SQL' },
          { key: 'excel', label: 'Excel / Google Sheets' },
          { key: 'statistics', label: 'Статистика (база)' },
          { key: 'dataviz', label: 'Визуализация данных' },
          { key: 'python', label: 'Python (анализ)' },
        ];
        if (key === 'DevOps') return [
          { key: 'linux', label: 'Linux' },
          { key: 'docker', label: 'Docker' },
          { key: 'cicd', label: 'CI/CD' },
          { key: 'cloud', label: 'Облака (база)' },
          { key: 'networking', label: 'Сети (база)' },
        ];
        if (key === 'Mobile') return [
          { key: 'kotlin', label: 'Kotlin (Android)' },
          { key: 'swift', label: 'Swift (iOS)' },
          { key: 'flutter', label: 'Flutter (опционально)' },
          { key: 'api', label: 'API (HTTP)' },
          { key: 'git', label: 'Git' },
        ];
        if (key === 'Cybersecurity') return [
          { key: 'networking', label: 'Сети (база)' },
          { key: 'linux', label: 'Linux (база)' },
          { key: 'owasp', label: 'OWASP / уязвимости' },
          { key: 'threats', label: 'Модели угроз (база)' },
          { key: 'sectools', label: 'Инструменты безопасности' },
        ];
        return [
          { key: 'html', label: 'HTML' },
          { key: 'css', label: 'CSS' },
          { key: 'javascript', label: 'JavaScript' },
          { key: 'git', label: 'Git' },
          { key: 'api', label: 'API' },
        ];
      });

      const strengths = Vue.computed(() => {
        return skillsForDirection.value
          .filter((s) => state.skills[s.key] === 'yes')
          .map((s) => s.label);
      });

      const gaps = Vue.computed(() => {
        return skillsForDirection.value
          .filter((s) => state.skills[s.key] === 'no')
          .map((s) => s.label);
      });

      const graph = Vue.computed(() => {
        const g = graphFor(direction.value);
        const layout = layoutGraph(g.nodes, g.edges);
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

        const levelById = computeLevels(g.nodes, g.edges);
        const order = g.nodes
          .slice()
          .sort((a, b) => (levelById[a.id] || 0) - (levelById[b.id] || 0))
          .map((n) => n.label);

        return {
          nodes: nodesWithPos,
          edges: layout.edgeLines,
          width: layout.width,
          height: layout.height,
          order,
        };
      });

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

      return { direction, titleFor, strengths, gaps, graph, toPlan };
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
            <p class="subtitle">Карта навыков</p>

            <div class="content compact">
              <div class="panel">
                <div class="h2">Карта навыков</div>
                <p class="small" style="margin-top:6px">Мы выделяем ваши сильные стороны и пробелы</p>
                <div class="note" style="margin-top:10px">
                  <div><strong>Направление:</strong> {{ titleFor(direction) }}</div>
                </div>

                <div style="margin-top:12px">
                  <div class="h2" style="font-size:14px;margin-bottom:8px">Граф обучения (что учить за чем)</div>
                  <div class="skill-graph">
                    <svg :viewBox="'0 0 ' + graph.width + ' ' + graph.height" class="skill-graph__svg" aria-label="Граф навыков" preserveAspectRatio="xMidYMin meet">
                      <defs>
                        <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L0,6 L6,3 z" class="skill-graph__arrow" />
                        </marker>
                      </defs>

                      <line
                        v-for="e in graph.edges"
                        :key="e.id"
                        :x1="e.x1"
                        :y1="e.y1"
                        :x2="e.x2"
                        :y2="e.y2"
                        class="skill-graph__edge"
                        marker-end="url(#arrow)"
                      />

                      <g v-for="n in graph.nodes" :key="n.id" :transform="'translate(' + n.x + ' ' + n.y + ')'">
                        <rect
                          :width="n.w"
                          :height="n.h"
                          rx="14"
                          ry="14"
                          class="skill-graph__node"
                          :class="{
                            'is-yes': n.status === 'yes',
                            'is-mid': n.status === 'mid',
                            'is-no': n.status === 'no'
                          }"
                        />
                        <text
                          :x="n.w / 2"
                          :y="n.h / 2 + 5"
                          text-anchor="middle"
                          class="skill-graph__label"
                        >
                          {{ n.label }}
                        </text>
                      </g>
                    </svg>
                  </div>
                  <div class="note" style="margin-top:10px">
                    <div><strong>Порядок:</strong> {{ (graph.order || []).join(' → ') }}</div>
                  </div>
                </div>

                <div style="margin-top:12px">
                  <div class="h2" style="font-size:14px;margin-bottom:8px">Сильные стороны</div>
                  <div class="chip-list" v-if="strengths.length">
                    <span class="chip" v-for="s in strengths" :key="s">{{ s }}</span>
                  </div>
                  <div class="note" v-else>Пока нет сильных сторон — пройдите оценку навыков.</div>
                </div>

                <div style="margin-top:12px">
                  <div class="h2" style="font-size:14px;margin-bottom:8px">Пробелы</div>
                  <div class="chip-list" v-if="gaps.length">
                    <span class="chip" v-for="g in gaps" :key="g">{{ g }}</span>
                  </div>
                  <div class="note" v-else>Пробелов не найдено — отличный результат.</div>
                </div>
              </div>
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
