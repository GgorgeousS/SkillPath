(function () {
  'use strict';

  // REST API SkillPath (папка ./api, FastAPI + PostgreSQL).
  // Браузер не подключается к БД напрямую: данные принимает API и сохраняет в PostgreSQL.
  // Для production укажите адрес развёрнутого API (только https) либо задайте его через localStorage.
  const API_BASE_URL = 'http://127.0.0.1:8081';
  const LS_BASE_URL_KEY = 'skillpath_api_base_url';
  const LS_TOKEN_KEY = 'skillpath_token';

  function baseUrl() {
    let override = '';
    try {
      override = (localStorage.getItem(LS_BASE_URL_KEY) || '').trim();
    } catch (_) {
      override = '';
    }
    return String(override || API_BASE_URL || '').trim().replace(/\/$/, '');
  }

  function isLocal(base) {
    return base.startsWith('http://localhost') || base.startsWith('http://127.0.0.1');
  }

  function isConfigured() {
    const base = baseUrl();
    return !!base && (base.startsWith('https://') || isLocal(base));
  }

  function getConfigHelp() {
    const base = baseUrl();
    if (!base) return 'Адрес API не задан: укажите API_BASE_URL в js/api.js.';
    if (!base.startsWith('https://') && !isLocal(base)) {
      return 'Для production нужен HTTPS-адрес API (http допустим только для localhost).';
    }
    return '';
  }

  // ---- токен сессии ----
  function getToken() {
    try {
      return localStorage.getItem(LS_TOKEN_KEY) || '';
    } catch (_) {
      return '';
    }
  }
  function setToken(token) {
    try {
      if (token) localStorage.setItem(LS_TOKEN_KEY, token);
      else localStorage.removeItem(LS_TOKEN_KEY);
    } catch (_) {
      /* хранилище недоступно */
    }
  }

  function errorMessage(res, json) {
    if (json && typeof json.detail === 'string') return json.detail;
    if (res.status === 422) return 'Проверьте введённые данные: email, пароль (от 8 символов), имя.';
    return 'Ошибка сервера (HTTP ' + res.status + ')';
  }

  // opts.keepalive — для отправки данных при закрытии вкладки.
  async function request(method, path, body, opts) {
    const options = opts || {};
    const base = baseUrl();
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        keepalive: !!options.keepalive,
      });
    } catch (e) {
      const message = 'Нет связи с сервером (' + base + '). Проверьте, что API запущен: откройте ' + base + '/health.';
      return { data: null, error: { message, status: 0 } };
    }

    let json = null;
    try {
      json = res.status === 204 ? null : await res.json();
    } catch (_) {
      json = null;
    }

    if (!res.ok) {
      return { data: null, error: { message: errorMessage(res, json), status: res.status } };
    }
    return { data: json, error: null };
  }

  window.SkillPathAPI = {
    isConfigured,
    getConfigHelp,
    baseUrl,
    getToken,
    setToken,
    register: (payload) => request('POST', '/api/auth/register', payload),
    login: (payload) => request('POST', '/api/auth/login', payload),
    logout: () => request('POST', '/api/auth/logout'),
    me: () => request('GET', '/api/me'),
    getState: () => request('GET', '/api/me/state'),
    putState: (state, opts) => request('PUT', '/api/me/state', { state }, opts),
    deleteAccount: () => request('DELETE', '/api/me'),
    sendFeedback: (payload) => request('POST', '/api/feedback', payload),
  };
})();
