(function () {
  'use strict';

  // ====== CRM API (Stage 4 Integration) ======
  // This project is hosted as a static site (GitHub Pages), so the CRM API must be a separate backend.
  // Default backend in this repo: ./crm_api (FastAPI).
  // Note: CRM_API_KEY is the key for THIS backend API (proxy). Bitrix24 webhook URL/key is stored on the server side.

  const CRM_API_BASE_URL = 'http://127.0.0.1:8081';
  const CRM_API_KEY = 'PASTE_CRM_API_KEY_HERE';

  const LS_BASE_URL_KEY = 'skillpath_crm_base_url';
  const LS_API_KEY_KEY = 'skillpath_crm_api_key';

  function normalizeBaseUrl(input) {
    const base = String(input || '').trim();
    if (base.startsWith('http://localhost')) {
      return base.replace('http://localhost', 'http://127.0.0.1');
    }
    return base;
  }

  function resolvedConfig() {
    const baseOverride = (localStorage.getItem(LS_BASE_URL_KEY) || '').trim();
    const keyOverride = (localStorage.getItem(LS_API_KEY_KEY) || '').trim();

    return {
      base: normalizeBaseUrl(baseOverride || String(CRM_API_BASE_URL || '').trim()),
      key: keyOverride || String(CRM_API_KEY || '').trim(),
    };
  }

  function isConfigured() {
    const { base, key } = resolvedConfig();

    const isLocal = base.includes('localhost') || base.includes('127.0.0.1');
    if (!base || (!isLocal && !base.startsWith('https://'))) {
      // Allow http://localhost / http://127.0.0.1 in dev; require https in prod.
      return false;
    }

    // In local dev we allow running without an API key if backend is in dev mode.
    // If backend requires a key, request will return 401 and UI will show the error.
    if (!key || key.includes('PASTE_CRM_API_KEY_HERE') || key.length < 8) {
      return isLocal;
    }

    return true;
  }

  function getConfigHelp() {
    const { base, key } = resolvedConfig();
    const isLocal = base.includes('localhost') || base.includes('127.0.0.1');

    if (!base) {
      return 'CRM не настроен: заполните CRM_API_BASE_URL в js/crm.js.';
    }

    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      return 'CRM_API_BASE_URL должен начинаться с http:// или https://';
    }

    if (base.startsWith('http://') && !base.includes('localhost') && !base.includes('127.0.0.1')) {
      return 'Для production нужен HTTPS URL CRM API (http допустим только для localhost).';
    }

    if (!key || key.includes('PASTE_CRM_API_KEY_HERE') || key.length < 8) {
      if (isLocal) {
        return (
          'CRM: ключ не задан. Для локальной проверки можно запустить backend без CRM_API_KEY (dev-режим), ' +
          'или задать ключ через localStorage (рекомендуется, без правки файлов):\n' +
          "localStorage.setItem('skillpath_crm_base_url', '" + base + "');\n" +
          "localStorage.setItem('skillpath_crm_api_key', '<ВАШ_КЛЮЧ>');\n" +
          'Bitrix24 вебхук/ключ на фронтенде не нужен — он настраивается в переменных окружения backend.'
        );
      }

      return 'CRM не настроен: задайте CRM_API_KEY (ключ доступа к backend crm_api) через localStorage или настройку фронтенда. Bitrix24 вебхук/ключ на фронтенде не нужен — он настраивается в переменных окружения backend.';
    }

    return '';
  }

  async function createLead(payload) {
    const { base: rawBase, key } = resolvedConfig();
    const base = String(rawBase || '').trim().replace(/\/$/, '');

    const keyOk = key && !String(key).includes('PASTE_CRM_API_KEY_HERE') && String(key).trim().length >= 8;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (keyOk) headers['X-API-Key'] = key;

    let res;
    try {
      res = await fetch(base + '/api/leads', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (e) {
      const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
      const message =
        'Failed to fetch: браузер не смог подключиться к CRM API. ' +
        'Проверьте: 1) backend открыт по ' + base + ' (откройте ' + base + '/health), ' +
        '2) фронт открыт НЕ как file://, а как http://127.0.0.1:5173, ' +
        '3) нет ли переопределения в localStorage (skillpath_crm_base_url). ' +
        (origin ? ('Текущий origin: ' + origin + '.') : '');
      return { data: null, error: { message, status: 0, raw: String((e && e.message) || e) } };
    }

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {
      json = null;
    }

    if (!res.ok) {
      const baseMessage =
        (json && (json.detail || json.message || json.error)) ||
        (typeof text === 'string' && text.trim() ? text.trim() : 'HTTP ' + res.status);

      if (res.status === 401) {
        const hint =
          ' (401: backend требует ключ. Задайте localStorage skillpath_crm_api_key, либо запустите backend без CRM_API_KEY.)';
        return { data: null, error: { message: String(baseMessage) + hint, status: res.status, raw: json || text } };
      }
      return { data: null, error: { message: baseMessage, status: res.status, raw: json || text } };
    }

    return { data: json, error: null };
  }

  window.SkillPathCRM = {
    isConfigured,
    getConfigHelp,
    getResolvedConfig: () => {
      const { base, key } = resolvedConfig();
      return { base, keyLength: (key || '').length, hasPlaceholder: String(key || '').includes('PASTE_CRM_API_KEY_HERE') };
    },
    createLead,
  };
})();
