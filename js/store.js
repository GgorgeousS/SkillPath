(function () {
  'use strict';

  const HISTORY_LIMIT = 100;

  function defaultState() {
    return {
      profile: {
        email: '',
        name: '',
        last_name: '',
        phone: '',
        persona_type: 'student',
      },
      survey: {
        interests: [],
      },
      recommended_directions: [],
      selected_direction: '',
      roadmap: {
        strengths: [],
        gaps: [],
      },
      plan: {
        duration_months: 6,
        text: '',
        days: [],
        task_checks: {},
        saved_at: '',
        pace: 'normal',
      },
      history: [],
      skills: {
        html: 'no',
        css: 'no',
        javascript: 'no',
        git: 'no',
        api: 'no',
        testing: 'no',
        testcases: 'no',
        bugreports: 'no',
        sql: 'no',
        figma: 'no',
        uxresearch: 'no',
        wireframes: 'no',
        prototyping: 'no',
        ui: 'no',
        python: 'no',
        node: 'no',
        excel: 'no',
        statistics: 'no',
        dataviz: 'no',
        linux: 'no',
        docker: 'no',
        cicd: 'no',
        cloud: 'no',
        networking: 'no',
        kotlin: 'no',
        swift: 'no',
        flutter: 'no',
        owasp: 'no',
        threats: 'no',
        sectools: 'no',
      },
    };
  }

  // Приводит данные (например, полученные с сервера) к корректной структуре.
  function normalize(parsed) {
    if (!parsed || typeof parsed !== 'object') return defaultState();

    // Небольшая защита от поломанной структуры
    const state = defaultState();

    if (parsed.profile && typeof parsed.profile === 'object') {
      state.profile.email = String(parsed.profile.email || '');
      state.profile.name = String(parsed.profile.name || '');
      state.profile.last_name = String(parsed.profile.last_name || '');
      state.profile.phone = String(parsed.profile.phone || '');
      state.profile.persona_type = String(parsed.profile.persona_type || 'student');
    }
    if (parsed.survey && typeof parsed.survey === 'object') {
      state.survey.interests = Array.isArray(parsed.survey.interests)
        ? parsed.survey.interests.filter(Boolean)
        : [];
    }
    if (Array.isArray(parsed.recommended_directions)) {
      state.recommended_directions = parsed.recommended_directions.filter(Boolean);
    }
    if (typeof parsed.selected_direction === 'string') {
      state.selected_direction = parsed.selected_direction;
    }

    if (parsed.roadmap && typeof parsed.roadmap === 'object') {
      state.roadmap.strengths = Array.isArray(parsed.roadmap.strengths)
        ? parsed.roadmap.strengths.filter(Boolean)
        : [];
      state.roadmap.gaps = Array.isArray(parsed.roadmap.gaps) ? parsed.roadmap.gaps.filter(Boolean) : [];
    }

    if (parsed.plan && typeof parsed.plan === 'object') {
      state.plan.duration_months = Number(parsed.plan.duration_months || 6) || 6;
      state.plan.text = String(parsed.plan.text || '');
      state.plan.days = Array.isArray(parsed.plan.days) ? parsed.plan.days : [];
      state.plan.task_checks = (parsed.plan.task_checks && typeof parsed.plan.task_checks === 'object')
        ? parsed.plan.task_checks
        : {};
      state.plan.saved_at = String(parsed.plan.saved_at || '');
      state.plan.pace = ['light', 'normal', 'intensive'].includes(parsed.plan.pace) ? parsed.plan.pace : 'normal';
    }

    if (Array.isArray(parsed.history)) {
      state.history = parsed.history
        .filter((e) => e && typeof e === 'object' && e.text)
        .map((e) => ({ ts: String(e.ts || ''), type: String(e.type || ''), text: String(e.text) }))
        .slice(-HISTORY_LIMIT);
    }
    if (parsed.skills && typeof parsed.skills === 'object') {
      Object.keys(state.skills).forEach((k) => {
        const v = parsed.skills[k];
        if (v === true) state.skills[k] = 'yes';
        else if (v === false) state.skills[k] = 'no';
        else if (v === 'no' || v === 'mid' || v === 'yes') state.skills[k] = v;
        else state.skills[k] = 'no';
      });
    }

    return state;
  }

  // Данные пользователя живут на сервере (PostgreSQL) и загружаются после входа в аккаунт —
  // см. js/auth.js. В браузере они не хранятся, чтобы разные аккаунты не смешивались.
  const state = Vue.reactive(defaultState());

  function assign(fresh) {
    Object.keys(fresh).forEach((key) => {
      state[key] = fresh[key];
    });
  }

  function replaceState(parsed) {
    assign(normalize(parsed));
  }

  // История обучения для личного профиля. Подряд идущие одинаковые записи не дублируем.
  function logEvent(type, text) {
    const last = state.history[state.history.length - 1];
    if (last && last.type === type && last.text === text) return;
    state.history.push({ ts: new Date().toISOString(), type, text });
    if (state.history.length > HISTORY_LIMIT) {
      state.history.splice(0, state.history.length - HISTORY_LIMIT);
    }
  }

  function reset() {
    assign(defaultState());
  }

  window.SkillPathStore = {
    state,
    reset,
    replaceState,
    logEvent,
  };
})();
