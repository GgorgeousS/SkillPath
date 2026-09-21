(function () {
  'use strict';

  // Аккаунт пользователя и синхронизация его данных с сервером (PostgreSQL).
  //  - вход / регистрация / выход, токен сессии хранится в localStorage;
  //  - после входа данные загружаются с сервера в SkillPathStore;
  //  - любые изменения данных автоматически сохраняются на сервер (с небольшой задержкой).

  const PENDING_DIRECTION_KEY = 'skillpath_pending_direction';
  const SAVE_DELAY_MS = 800;
  const RETRY_DELAY_MS = 8000;

  // sync: 'idle' | 'saving' | 'saved' | 'error'
  const auth = Vue.reactive({ user: null, ready: false, sync: 'idle' });

  let applying = false; // true, пока данные с сервера загружаются в хранилище (не отправлять их обратно)
  let dirty = false;
  let saveTimer = null;
  let inflight = false;

  function store() {
    return window.SkillPathStore;
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(Vue.toRaw(store().state)));
  }

  async function applyState(data) {
    applying = true;
    if (data) store().replaceState(data);
    else store().reset();
    await Vue.nextTick();
    await Vue.nextTick();
    applying = false;
  }

  // Профиль в данных всегда согласован с аккаунтом: email нельзя менять, имя по умолчанию из регистрации.
  function syncProfileWithAccount() {
    const st = store().state;
    st.profile.email = auth.user.email;
    if (!st.profile.name) st.profile.name = auth.user.name;
  }

  async function pullState() {
    const res = await window.SkillPathAPI.getState();
    if (res.error) return res;
    await applyState(res.data && res.data.state);
    applying = true;
    syncProfileWithAccount();
    await Vue.nextTick();
    await Vue.nextTick();
    applying = false;
    dirty = false;
    auth.sync = 'idle';
    return res;
  }

  // ---- сохранение данных на сервер ----
  function scheduleSave() {
    if (applying || !auth.user) return;
    dirty = true;
    auth.sync = 'saving';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY_MS);
  }

  async function save() {
    clearTimeout(saveTimer);
    if (!auth.user || !dirty) return;
    if (inflight) {
      saveTimer = setTimeout(save, SAVE_DELAY_MS);
      return;
    }
    inflight = true;
    dirty = false; // изменения, сделанные во время запроса, снова выставят dirty
    const res = await window.SkillPathAPI.putState(snapshot());
    inflight = false;
    if (res.error) {
      if (res.error.status === 401) {
        await localLogout();
        return;
      }
      dirty = true;
      auth.sync = 'error';
      saveTimer = setTimeout(save, RETRY_DELAY_MS);
      return;
    }
    auth.sync = dirty ? 'saving' : 'saved';
  }

  // Последняя попытка сохранить данные при закрытии вкладки.
  function flushOnLeave() {
    if (!auth.user || !dirty) return;
    window.SkillPathAPI.putState(snapshot(), { keepalive: true });
    dirty = false;
  }

  // ---- вход / выход ----
  async function init() {
    if (!window.SkillPathAPI.getToken()) {
      auth.ready = true;
      return;
    }
    const me = await window.SkillPathAPI.me();
    if (me.error) {
      // 401 — токен недействителен; при сетевой ошибке токен оставляем, чтобы не разлогинить зря.
      if (me.error.status === 401) window.SkillPathAPI.setToken('');
      auth.ready = true;
      return;
    }
    auth.user = me.data;
    await pullState();
    auth.ready = true;
  }

  function validCredentials(email, password) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim()) && String(password || '').length > 0;
  }

  async function register({ email, password, name, persona_type }) {
    const res = await window.SkillPathAPI.register({ email: String(email).trim(), password, name: String(name).trim() });
    if (res.error) return { error: res.error };
    window.SkillPathAPI.setToken(res.data.token);
    auth.user = res.data.user;
    await applyState(null);
    applying = true;
    syncProfileWithAccount();
    if (persona_type) store().state.profile.persona_type = persona_type;
    await Vue.nextTick();
    await Vue.nextTick();
    applying = false;
    dirty = true;
    await save(); // сразу создаём запись с данными нового пользователя
    return { user: res.data.user };
  }

  async function login({ email, password }) {
    const res = await window.SkillPathAPI.login({ email: String(email).trim(), password });
    if (res.error) return { error: res.error };
    window.SkillPathAPI.setToken(res.data.token);
    auth.user = res.data.user;
    const pulled = await pullState();
    if (pulled.error) return { error: pulled.error };
    return { user: res.data.user };
  }

  async function localLogout() {
    clearTimeout(saveTimer);
    dirty = false;
    window.SkillPathAPI.setToken('');
    auth.user = null;
    auth.sync = 'idle';
    await applyState(null);
  }

  async function logout() {
    if (dirty) await save();
    await window.SkillPathAPI.logout(); // ошибку игнорируем: локально всё равно выходим
    await localLogout();
  }

  async function deleteAccount() {
    const res = await window.SkillPathAPI.deleteAccount();
    if (res.error) return { error: res.error };
    await localLogout();
    return {};
  }

  // Направление, выбранное до входа (например, на экране сравнения), применяется после входа.
  function setPendingDirection(direction) {
    try {
      sessionStorage.setItem(PENDING_DIRECTION_KEY, direction);
    } catch (_) {
      /* ignore */
    }
  }
  function consumePendingDirection() {
    try {
      const d = sessionStorage.getItem(PENDING_DIRECTION_KEY) || '';
      sessionStorage.removeItem(PENDING_DIRECTION_KEY);
      return d;
    } catch (_) {
      return '';
    }
  }

  // Автосохранение при любом изменении данных.
  Vue.watch(store().state, scheduleSave, { deep: true });
  window.addEventListener('pagehide', flushOnLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnLeave();
  });

  window.SkillPathAuth = {
    auth,
    init,
    register,
    login,
    logout,
    deleteAccount,
    validCredentials,
    setPendingDirection,
    consumePendingDirection,
    saveNow: save,
  };
})();
