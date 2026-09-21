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

  // Темп обучения: длительность плана и ориентировочная нагрузка.
  const PACES = {
    light: { key: 'light', label: 'Спокойный', hours: 1, days: 60, tasksPerDay: 3 },
    normal: { key: 'normal', label: 'Средний', hours: 2, days: 30, tasksPerDay: 4 },
    intensive: { key: 'intensive', label: 'Интенсивный', hours: 4, days: 14, tasksPerDay: 4 },
  };

  function paceOf(state) {
    const k = state.plan && state.plan.pace;
    return PACES[k] || PACES.normal;
  }

  function buildPlanModel(state) {
    const dir = _dirKey(state);
    const helper = window.SkillPathRoadmapGraph;
    const checks = _ensurePlanChecks(state);
    const pace = paceOf(state);
    const total = pace.days;

    if (!helper || typeof helper.graphFor !== 'function') {
      return {
        title: 'План обучения — ' + total + ' дней',
        goal: 'Сформируйте карту навыков, чтобы получить план по дням.',
        weeks: [],
        flatDays: [],
        totalDays: total,
      };
    }

    const g = helper.graphFor(dir);
    const orderIds = _topoOrder(g.nodes, g.edges);
    const idToLabel = Object.create(null);
    g.nodes.forEach((n) => (idToLabel[n.id] = n.label));

    // Уже освоенные навыки в план не включаем; если освоено всё — повторяем весь набор.
    const all = orderIds.map((id) => ({ id, label: idToLabel[id] || id }));
    const gaps = all.filter((s) => !state.skills || state.skills[s.id] !== 'yes');
    const core = gaps.length ? gaps : all;
    const coreLabels = core.map((s) => s.label);

    const title = 'План становления ' + _titleFor(dir) + ' — ' + total + ' дней';
    const shown = coreLabels.slice(0, 6);
    const more = coreLabels.length > shown.length ? ' и др.' : '';
    const goal =
      'Стать junior ' +
      _titleFor(dir).replace('‑', '-') +
      ' за ' + total + ' дней (≈ ' + pace.hours + ' ч в день): ' +
      shown.join(', ') +
      more +
      ', практика, мини‑проект, портфолио.';

    const projectDay = total - 1;
    const finalDay = total;
    const lastStudyDay = total - 2;

    const learningDays = [];
    for (let d = 1; d <= lastStudyDay; d += 1) {
      if (d % 7 !== 0) learningDays.push(d);
    }

    const skillByLearningIndex = (learningIndex) => {
      if (!core.length) return null;
      const phase = Math.floor(learningIndex / core.length);
      const skill = core[learningIndex % core.length];
      return { skill, phase };
    };

    const mk = (day, raw, extra) => ({
      header: 'День ' + day,
      ...(extra || {}),
      tasks: raw.map((text, idx) => ({ text, done: _doneFor(checks, day, idx, false) })),
    });

    function dayTasks(day) {
      if (day === projectDay) {
        return mk(day, [
          'Мини‑проект: собрать учебный кейс под выбранную роль',
          'Описать решение: шаги, материалы, выводы',
          'Собрать портфолио (ссылки, скриншоты, описание)',
        ], { kind: 'project' });
      }
      if (day === finalDay) {
        return mk(day, [
          'Повторение: пройтись по всем темам и пробелам',
          'Подготовить резюме + короткий рассказ о проекте',
          'План на следующий период: усилить 1–2 слабых навыка',
        ], { kind: 'project' });
      }
      if (day % 7 === 0) {
        return mk(day, [
          'Повторение недели: тезисы + конспект',
          'Практика: 3–5 задач по темам недели',
          'Итог недели: отметить, что уже уверенно получается',
        ]);
      }

      const learningIndex = learningDays.indexOf(day);
      const entry = learningIndex >= 0 ? skillByLearningIndex(learningIndex) : null;
      if (!entry) {
        return mk(day, ['Закрепление: практика и мини‑задачи', 'Повторение слабых мест']);
      }

      const { skill, phase } = entry;
      const stage = phase === 0 ? 'основы' : phase === 1 ? 'углубление' : phase === 2 ? 'практика' : phase === 3 ? 'мини‑проект' : 'закрепление';
      const extra = { skillLabel: skill.label, skillId: skill.id };

      if (stage === 'мини‑проект') {
        const raw = [
          'Мини‑проект: сделать небольшой кейс с использованием ' + skill.label,
          'Рефакторинг: привести код/структуру в порядок',
          'Проверка: пройтись по чек‑листу и исправить ошибки',
          'Заметки: оформить выводы и примеры по ' + skill.label,
        ];
        return mk(day, raw.slice(0, pace.tasksPerDay), extra);
      }

      const raw = [
        'Теория: ' + skill.label + ' — ' + stage,
        'Практика: 3–5 упражнений по ' + skill.label,
        'Мини‑задача: применить ' + skill.label + ' в маленьком кейсе',
        'Конспект: выписать 5–7 ключевых пунктов',
      ];
      return mk(day, raw.slice(0, pace.tasksPerDay), extra);
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

    const weekCount = Math.ceil(lastStudyDay / 7);
    const weeks = [];
    for (let w = 0; w < weekCount; w += 1) {
      const from = w * 7 + 1;
      const to = Math.min((w + 1) * 7, lastStudyDay);
      weeks.push({ title: 'Неделя ' + (w + 1) + ' — ' + weekFocus(from, to), days: [], from, to });
    }
    weeks.push({ title: 'Финал — проект и портфолио', days: [], from: projectDay, to: finalDay });

    const flatDays = [];
    for (let day = 1; day <= total; day += 1) {
      const model = dayTasks(day);
      flatDays.push({ day, label: model.skillLabel || (model.tasks[0] ? model.tasks[0].text : '') });
      const week = weeks.find((w) => day >= w.from && day <= w.to) || weeks[weeks.length - 1];
      week.days.push({ day, ...model });
    }

    return { title, goal, weeks, flatDays, totalDays: total };
  }


  // Roadmap: разделы = навыки направления (в порядке изучения), темы = этапы внутри раздела.
  // Процент темы и раздела считается по отметкам заданий в карьерном плане.
  const PROJECT_TOPICS = [
    'Мини‑проект под выбранную роль',
    'Описание решения',
    'Портфолио',
    'Повторение всех тем',
    'Резюме и рассказ о проекте',
    'План на следующий период',
  ];

  function _pct(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
  }

  // Делим задания раздела на n подряд идущих групп — по одной на тему.
  function _chunkTopics(titles, tasks) {
    const n = Math.min(titles.length, tasks.length);
    const topics = [];
    for (let i = 0; i < n; i += 1) {
      const part = tasks.slice(Math.floor((i * tasks.length) / n), Math.floor(((i + 1) * tasks.length) / n));
      const done = part.filter((t) => t.done).length;
      topics.push({ title: titles[i], percent: _pct(done, part.length) });
    }
    return topics;
  }

  function buildRoadmapSections(state) {
    const D = window.SkillPathDirections;
    const helper = window.SkillPathRoadmapGraph;
    if (!D || !helper) return [];

    const g = helper.graphFor(_dirKey(state));
    const order = _topoOrder(g.nodes, g.edges);
    const days = buildPlanModel(state).weeks.reduce((acc, w) => acc.concat(w.days), []);

    const sections = order.map((id) => {
      const info = D.SKILL_INFO[id] || { label: id, desc: '', icon: '📘', topics: [] };
      const level = state.skills && state.skills[id] ? state.skills[id] : 'no';
      const tasks = days.filter((d) => d.skillId === id).reduce((acc, d) => acc.concat(d.tasks), []);

      // Навык, который пользователь уже освоил, в план не попал — показываем его как пройденный.
      if (!tasks.length) {
        const known = level === 'yes';
        return {
          id, title: info.label, icon: info.icon || '📘', desc: info.desc, level,
          percent: known ? 100 : 0,
          topics: (info.topics || []).map((t) => ({ title: t, percent: known ? 100 : 0 })),
        };
      }
      const done = tasks.filter((t) => t.done).length;
      return {
        id, title: info.label, icon: info.icon || '📘', desc: info.desc, level,
        percent: _pct(done, tasks.length),
        topics: _chunkTopics(info.topics || [], tasks),
      };
    });

    const finalTasks = days.filter((d) => d.kind === 'project').reduce((acc, d) => acc.concat(d.tasks), []);
    if (finalTasks.length) {
      const done = finalTasks.filter((t) => t.done).length;
      sections.push({
        id: 'project', title: 'Проект и портфолио', icon: '🚀', level: 'no',
        desc: 'Соберите мини‑проект, оформите портфолио и подготовьтесь к собеседованиям.',
        percent: _pct(done, finalTasks.length),
        topics: _chunkTopics(PROJECT_TOPICS, finalTasks),
      });
    }

    sections.forEach((s) => {
      s.state = s.percent >= 100 ? 'done' : s.percent > 0 ? 'progress' : 'todo';
    });
    return sections;
  }

  // Сколько заданий плана выполнено (для индикатора на экране «Прогресс»).
  function planStats(model) {
    let done = 0;
    let total = 0;
    ((model && model.weeks) || []).forEach((w) => {
      (w.days || []).forEach((d) => {
        (d.tasks || []).forEach((t) => {
          total += 1;
          if (t.done) done += 1;
        });
      });
    });
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function setTaskDone(state, day, idx, checked) {
    const checks = _ensurePlanChecks(state);
    checks[_keyOf(day, idx)] = !!checked;

    // В историю обучения пишем только завершение дня целиком, а не каждый чекбокс.
    if (!checked || !window.SkillPathStore) return;
    const model = buildPlanModel(state);
    const found = model.weeks.reduce((acc, w) => acc || w.days.find((d) => d.day === day), null);
    if (found && found.tasks.every((t) => t.done)) {
      window.SkillPathStore.logEvent('progress', 'Выполнен день ' + day + ' плана');
    }
  }

  window.SkillPathPlan.PACES = PACES;
  window.SkillPathPlan.buildPlanModel = buildPlanModel;
  window.SkillPathPlan.planStats = planStats;
  window.SkillPathPlan.buildRoadmapSections = buildRoadmapSections;
  window.SkillPathPlan.setTaskDone = setTaskDone;

  window.SkillPathComponents.Plan = {
    name: 'Plan',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;

      const paces = Object.values(PACES);
      const pace = Vue.computed({
        get: () => paceOf(state).key,
        set: (v) => {
          if (v === paceOf(state).key) return;
          const hasChecks = Object.values(_ensurePlanChecks(state)).some(Boolean);
          if (hasChecks && !window.confirm('При смене темпа план пересчитается, а отметки о выполнении сбросятся. Продолжить?')) {
            return;
          }
          state.plan.task_checks = {};
          state.plan.pace = v;
        },
      });

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
        const p = paceOf(state);
        state.plan = state.plan || {};
        if (!state.plan.task_checks || typeof state.plan.task_checks !== 'object') state.plan.task_checks = {};
        state.plan.saved_at = new Date().toISOString();
        state.plan.duration_months = Math.max(1, Math.round(p.days / 30));
        state.plan.text = planText.value;
        state.plan.days = (planModel.value && planModel.value.flatDays) ? planModel.value.flatDays : [];
        SkillPathStore.logEvent('plan', 'Сохранён карьерный план: ' + p.days + ' дн., темп «' + p.label + '»');
        saveStatus.value = 'План сохранён';
        router.push('/progress');
      }

      function setTaskDone(day, idx, checked) {
        const helper = window.SkillPathPlan;
        if (!helper || typeof helper.setTaskDone !== 'function') return;
        helper.setTaskDone(state, day, idx, checked);
      }

      return { paces, pace, planText, planModel, saveStatus, savePlan, setTaskDone };
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
            <p class="subtitle">Ваш карьерный план</p>

            <div class="content compact">
              <div class="hint" role="note">
                <strong>Шаг 3 из 4.</strong> Выберите темп обучения — план пересчитается. Уже освоенные навыки в план не попадают. Сохраните план, чтобы отслеживать прогресс.
              </div>

              <div class="panel">
                <div class="h2">Темп обучения</div>
                <div class="pace" role="radiogroup" aria-label="Темп обучения">
                  <label class="pace__item" v-for="p in paces" :key="p.key" :class="{ 'is-active': pace === p.key }">
                    <input type="radio" name="pace" :value="p.key" v-model="pace" />
                    <span>
                      <strong>{{ p.label }}</strong>
                      <span class="small pace__desc">≈ {{ p.hours }} ч в день · {{ p.days }} дней</span>
                    </span>
                  </label>
                </div>
              </div>

              <div class="panel" style="margin-top:14px">
                <div class="h2">Ваш карьерный план</div>

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
                            <label class="task-label">
                              <input class="task-checkbox" type="checkbox" :checked="t.done" @change="setTaskDone(d.day, idx, $event.target.checked)" />
                              <span class="task-text">{{ t.text }}</span>
                            </label>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div class="note" v-else>План пока не построен — вернитесь на карту навыков.</div>
                </div>

                <div class="note success" v-if="saveStatus" role="status">{{ saveStatus }}</div>
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
