(function () {
  'use strict';

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function uniqueStrings(list) {
    return Array.from(new Set((list || []).filter(Boolean)));
  }

  window.SkillPathUtils = {
    safeJsonParse,
    uniqueStrings,
  };
})();
