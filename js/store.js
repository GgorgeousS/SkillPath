(function () {
  'use strict';

  const STORAGE_KEY = 'skillpath_mvp_v1';

  function defaultState() {
    return {
      profile: {
        email: '',
        name: '',
        persona_type: 'student',
      },
      survey: {
        interests: [],
      },
      recommended_directions: [],
      selected_direction: '',
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

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = window.SkillPathUtils.safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object') return defaultState();

    // Небольшая защита от поломанной структуры
    const state = defaultState();

    if (parsed.profile && typeof parsed.profile === 'object') {
      state.profile.email = String(parsed.profile.email || '');
      state.profile.name = String(parsed.profile.name || '');
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

  function save(snapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  const state = Vue.reactive(load());

  Vue.watch(
    state,
    () => {
      save(Vue.toRaw(state));
    },
    { deep: true }
  );

  function reset() {
    const fresh = defaultState();
    Object.keys(fresh).forEach((key) => {
      state[key] = fresh[key];
    });
  }

  window.SkillPathStore = {
    state,
    reset,
  };
})();
