(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  window.SkillPathPlan = window.SkillPathPlan || {};

  function _dirKey(state) {
    return state.selected_direction || (state.recommended_directions || [])[0] || 'Frontend';
  }

  function _topoOrder(nodes, edges) {
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

  function _titleFor(d) {
    if (d === 'Frontend') return 'Frontend‑разработчиком';
    if (d === 'Backend') return 'Backend‑разработчиком';
    if (d === 'QA Manual') return 'QA Manual специалистом';
    if (d === 'UI/UX') return 'UI/UX дизайнером';
    if (d === 'Data Analyst') return 'Data Analyst';
    if (d === 'DevOps') return 'DevOps инженером';
    if (d === 'Mobile') return 'Mobile‑разработчиком';
    if (d === 'Cybersecurity') return 'специалистом по кибербезопасности';
    return d;
  }

  function _ensurePlanChecks(state) {
    state.plan = state.plan || {};
    if (!state.plan.task_checks || typeof state.plan.task_checks !== 'object') state.plan.task_checks = {};
    return state.plan.task_checks;
  }

  function _keyOf(day, idx) {
    return String(day) + ':' + String(idx);
  }

  function _doneFor(checks, day, idx, fallback) {
    const k = _keyOf(day, idx);
    const v = checks[k];
    return typeof v === 'boolean' ? v : !!fallback;
  }

  function buildPlanModel(state) {
    const dir = _dirKey(state);
    const helper = window.SkillPathRoadmapGraph;
    const checks = _ensurePlanChecks(state);

    if (!helper || typeof helper.graphFor !== 'function') {
      return {
        title: 'План обучения — 30 дней',
        goal: 'Сформируйте карту навыков, чтобы получить план по дням.',
        weeks: [],
        flatDays: [],
      };
    }

    const g = helper.graphFor(dir);
    const orderIds = _topoOrder(g.nodes, g.edges);
    const idToLabel = Object.create(null);
    g.nodes.forEach((n) => (idToLabel[n.id] = n.label));

    const core = orderIds.map((id) => ({ id, label: idToLabel[id] || id }));
    const coreLabels = core.map((s) => s.label);

    const title = 'План становления ' + _titleFor(dir) + ' — 30 дней';
    const shown = coreLabels.slice(0, 6);
    const more = coreLabels.length > shown.length ? ' и др.' : '';
    const goal =
      'Стать junior ' +
      _titleFor(dir).replace('‑', '-') +
      ' за 30 дней: ' +
      shown.join(', ') +
      more +
      ', практика, мини‑проект, портфолио.';

    const learningDays = [];
    for (let d = 1; d <= 28; d += 1) {
      if (d % 7 !== 0) learningDays.push(d);
    }

    const skillByLearningIndex = (learningIndex) => {
      if (!core.length) return null;
      const phase = Math.floor(learningIndex / core.length);
      const skill = core[learningIndex % core.length];
      return { skill, phase };
    };

    function dayTasks(day) {
      const isReview = day % 7 === 0 && day <= 28;
      const learningIndex = learningDays.indexOf(day);
      const entry = learningIndex >= 0 ? skillByLearningIndex(learningIndex) : null;
      const skill = entry ? entry.skill : null;
      const phase = entry ? entry.phase : 0;
      const status = skill && state.skills ? state.skills[skill.id] : 'no';
      const doneBySkill = status === 'yes';

      if (day === 29) {
        const raw = [
          { text: 'Мини‑проект: собрать учебный кейс под выбранную роль', fallback: false },
          { text: 'Описать решение: шаги, материалы, выводы', fallback: false },
          { text: 'Собрать портфолио (ссылки, скриншоты, описание)', fallback: false },
        ];
        return {
          header: 'День 29',
          tasks: raw.map((t, idx) => ({ text: t.text, done: _doneFor(checks, day, idx, t.fallback) })),
        };
      }
      if (day === 30) {
        const raw = [
          { text: 'Повторение: пройтись по всем темам и пробелам', fallback: false },
          { text: 'Подготовить резюме + короткий рассказ о проекте', fallback: false },
          { text: 'План на следующий месяц: усилить 1–2 слабых навыка', fallback: false },
        ];
        return {
          header: 'День 30',
          tasks: raw.map((t, idx) => ({ text: t.text, done: _doneFor(checks, day, idx, t.fallback) })),
        };
      }

      if (isReview) {
        const raw = [
          { text: 'Повторение недели: тезисы + конспект', fallback: false },
          { text: 'Практика: 3–5 задач по темам недели', fallback: false },
          { text: 'Итог недели: отметить, что уже уверенно получается', fallback: false },
        ];
        return {
          header: 'День ' + day,
          tasks: raw.map((t, idx) => ({ text: t.text, done: _doneFor(checks, day, idx, t.fallback) })),
        };
      }

      if (!skill) {
        const raw = [
          { text: 'Закрепление: практика и мини‑задачи', fallback: false },
          { text: 'Повторение слабых мест', fallback: false },
        ];
        return {
          header: 'День ' + day,
          tasks: raw.map((t, idx) => ({ text: t.text, done: _doneFor(checks, day, idx, t.fallback) })),
        };
      }

      const stage = phase === 0 ? 'основы' : phase === 1 ? 'углубление' : phase === 2 ? 'практика' : 'мини‑проект';
      if (stage === 'мини‑проект') {
        const raw = [
          { text: 'Мини‑проект: сделать небольшой кейс с использованием ' + skill.label, fallback: doneBySkill },
          { text: 'Рефакторинг: привести код/структуру в порядок', fallback: doneBySkill },
          { text: 'Проверка: пройтись по чек‑листу и исправить ошибки', fallback: doneBySkill },
          { text: 'Заметки: оформить выводы и примеры по ' + skill.label, fallback: doneBySkill },
        ];
        return {
          header: 'День ' + day,
          skillLabel: skill.label,
          tasks: raw.map((t, idx) => ({ text: t.text, done: _doneFor(checks, day, idx, t.fallback) })),
        };
      }

      const raw = [
        { text: 'Теория: ' + skill.label + ' — ' + stage, fallback: doneBySkill },
        { text: 'Практика: 3–5 упражнений по ' + skill.label, fallback: doneBySkill },
        { text: 'Мини‑задача: применить ' + skill.label + ' в маленьком кейсе', fallback: doneBySkill },
        { text: 'Конспект: выписать 5–7 ключевых пунктов', fallback: doneBySkill },
      ];
      return {
        header: 'День ' + day,
        skillLabel: skill.label,
        tasks: raw.map((t, idx) => ({ text: t.text, done: _doneFor(checks, day, idx, t.fallback) })),
      };
    }

    function weekFocus(fromDay, toDay) {
      const used = [];
      for (let d = fromDay; d <= toDay; d += 1) {
        const li = learningDays.indexOf(d);
        const entry = li >= 0 ? skillByLearningIndex(li) : null;
        const s = entry ? entry.skill : null;
        if (s && !used.includes(s.label)) used.push(s.label);
      }
      if (!used.length) return 'Закрепление и практика';
      return used.join(' + ');
    }

    const weeks = [
      { title: 'Неделя 1 — ' + weekFocus(1, 7), days: [] },
      { title: 'Неделя 2 — ' + weekFocus(8, 14), days: [] },
      { title: 'Неделя 3 — ' + weekFocus(15, 21), days: [] },
      { title: 'Неделя 4 — ' + weekFocus(22, 28), days: [] },
      { title: 'Финал — проект и портфолио', days: [] },
    ];

    const flatDays = [];
    for (let day = 1; day <= 30; day += 1) {
      const model = dayTasks(day);
      flatDays.push({ day, label: model.skillLabel || (model.tasks[0] ? model.tasks[0].text : '') });
      const weekIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : day <= 28 ? 3 : 4;
      weeks[weekIdx].days.push({ day, ...model });
    }

    return { title, goal, weeks, flatDays };
  }

  function setTaskDone(state, day, idx, checked) {
    const checks = _ensurePlanChecks(state);
    checks[_keyOf(day, idx)] = !!checked;
  }

  window.SkillPathPlan.buildPlanModel = buildPlanModel;
  window.SkillPathPlan.setTaskDone = setTaskDone;

  window.SkillPathComponents.Plan = {
    name: 'Plan',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;

      const durationMonths = Vue.computed(() => (state.plan && state.plan.duration_months) || 6);

      const planModel = Vue.computed(() => {
        const helper = window.SkillPathPlan;
        if (!helper || typeof helper.buildPlanModel !== 'function') return null;
        return helper.buildPlanModel(state);
      });

      const planText = Vue.computed(() => {
        const m = planModel.value;
        if (!m) return 'Карьерный план';
        return (m.title || 'Карьерный план') + '\n\n' + (m.goal || '');
      });

      const saveStatus = Vue.ref('');

      function savePlan() {
        state.plan = state.plan || {};
        if (!state.plan.task_checks || typeof state.plan.task_checks !== 'object') state.plan.task_checks = {};
        state.plan.saved_at = new Date().toISOString();
        state.plan.duration_months = durationMonths.value;
        state.plan.text = planText.value;
        state.plan.days = (planModel.value && planModel.value.flatDays) ? planModel.value.flatDays : [];
        saveStatus.value = 'План сохранён';
        router.push('/progress');
      }

      function setTaskDone(day, idx, checked) {
        const helper = window.SkillPathPlan;
        if (!helper || typeof helper.setTaskDone !== 'function') return;
        helper.setTaskDone(state, day, idx, checked);
      }

      return { durationMonths, planText, planModel, saveStatus, savePlan, setTaskDone };
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
            <p class="subtitle">Ваш карьерный план</p>

            <div class="content compact">
              <div class="panel">
                <div class="h2">Ваш карьерный план</div>
                <p class="small" style="margin-top:6px">План обучения: 30 дней</p>

                <div class="plan-box" style="margin-top:12px">
                  <div class="plan-md" v-if="planModel && planModel.weeks && planModel.weeks.length">
                    <div class="plan-md__title"><strong>{{ planModel.title }}</strong></div>
                    <div class="plan-md__section">
                      <div class="plan-md__h">Цель</div>
                      <div class="note" style="margin:0">{{ planModel.goal }}</div>
                    </div>

                    <div class="plan-md__section" v-for="w in planModel.weeks" :key="w.title">
                      <div class="plan-md__week"><strong>{{ w.title }}</strong></div>

                      <div class="plan-md__day" v-for="d in w.days" :key="d.day">
                        <div class="plan-md__dayTitle"><strong>{{ d.header }}</strong><span v-if="d.skillLabel"> — {{ d.skillLabel }}</span></div>
                        <ul class="task-list">
                          <li v-for="(t, idx) in d.tasks" :key="idx">
                            <input class="task-checkbox" type="checkbox" :checked="t.done" @change="setTaskDone(d.day, idx, $event.target.checked)" aria-label="Отметить выполнено" />
                            <span class="task-text">{{ t.text }}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div class="note" v-else>План пока не построен — вернитесь на карту навыков.</div>
                </div>

                <div class="note" v-if="saveStatus">{{ saveStatus }}</div>
              </div>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" @click="savePlan">Сохранить план</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
