(function () {
  'use strict';

  // Вставьте сюда значения из Supabase проекта:
  // Settings -> Data API (Project URL)
  // Settings -> API Keys (Publishable key)
  const SUPABASE_URL = 'https://bhhamvyxboncdnfgzlqd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_tkMRZudDjGFk_WGiogVQCg_P77jednT';

  let _client = null;

  function isConfigured() {
    const url = String(SUPABASE_URL || '').trim();
    const key = String(SUPABASE_ANON_KEY || '').trim();
    return (
      url.startsWith('https://') &&
      url.includes('.supabase.co') &&
      !url.includes('PASTE_SUPABASE_URL_HERE') &&
      !key.includes('PASTE_SUPABASE_ANON_KEY_HERE') &&
      key.length > 20
    );
  }

  function getConfigHelp() {
    const url = String(SUPABASE_URL || '').trim();
    const key = String(SUPABASE_ANON_KEY || '').trim();

    if (!url || url.includes('PASTE_SUPABASE_URL_HERE')) {
      return 'Не заполнен SUPABASE_URL. Нужен Project URL вида https://<ref>.supabase.co (Settings → Data API).';
    }
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      return 'SUPABASE_URL выглядит неверно. Должен быть https://<ref>.supabase.co (без /rest/v1).';
    }
    if (!key || key.includes('PASTE_SUPABASE_ANON_KEY_HERE')) {
      return 'Не заполнен SUPABASE_ANON_KEY. Нужен Publishable key (Settings → API Keys → Publishable key).';
    }
    if (key.length <= 20) {
      return 'SUPABASE_ANON_KEY слишком короткий. Скорее всего вы скопировали не тот ключ.';
    }
    return '';
  }

  function getClient() {
    if (_client) return _client;
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      throw new Error('Supabase SDK не загружен (проверьте подключение CDN).');
    }
    if (!isConfigured()) {
      throw new Error(
        'Supabase не настроен: вставьте SUPABASE_URL и SUPABASE_ANON_KEY в js/supabase.js'
      );
    }

    _client = window.supabase.createClient(
      String(SUPABASE_URL || '').trim(),
      String(SUPABASE_ANON_KEY || '').trim()
    );
    return _client;
  }

  function keyKind() {
    const key = String(SUPABASE_ANON_KEY || '').trim();
    if (key.startsWith('sb_publishable_')) return 'publishable';
    // Legacy anon key is a JWT (usually starts with eyJ...)
    if (key.startsWith('eyJ') && key.split('.').length === 3) return 'jwt';
    return 'unknown';
  }

  async function insertViaRest(payload) {
    const url = String(SUPABASE_URL || '').trim().replace(/\/$/, '');
    const key = String(SUPABASE_ANON_KEY || '').trim();

    const res = await fetch(url + '/rest/v1/submissions', {
      method: 'POST',
      headers: {
        apikey: key,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {
      json = null;
    }

    if (!res.ok) {
      const base =
        (json && (json.message || json.error_description || json.error)) ||
        (typeof text === 'string' && text.trim() ? text.trim() : 'HTTP ' + res.status);

      const extraParts = [];
      if (json && json.code) extraParts.push('code=' + json.code);
      if (json && json.details) extraParts.push('details=' + json.details);
      if (json && json.hint) extraParts.push('hint=' + json.hint);
      extraParts.push('status=' + res.status);

      const message = extraParts.length ? base + ' (' + extraParts.join('; ') + ')' : base;
      return { data: null, error: { message, status: res.status, raw: json || text } };
    }

    return { data: json, error: null };
  }

  async function insertSubmission(payload) {
    const kind = keyKind();

    // Для новых publishable ключей (sb_publishable_...) нельзя использовать Bearer-токен.
    // Через REST достаточно заголовка apikey — Supabase API Gateway сам разрулит.
    if (kind === 'publishable') {
      return await insertViaRest(payload);
    }

    const client = getClient();
    const { data, error } = await client.from('submissions').insert([payload]);
    return { data, error };
  }

  window.SkillPathSupabase = {
    isConfigured,
    getConfigHelp,
    insertSubmission,
  };
})();
