(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  function buildAssistantReply(state, userText) {
    const t = String(userText || '').toLowerCase();

    const direction = state.selected_direction || (state.recommended_directions || [])[0] || 'Frontend';

    const skills = state.skills || {};
    const gaps = Object.keys(skills)
      .filter((k) => skills[k] === 'no')
      .slice(0, 5);

    if (t.includes('план')) {
      return (
        'По плану: выдели 6 месяцев, каждую неделю делай маленький проект. ' +
        (gaps.length ? ('Сейчас в приоритете: ' + gaps.join(', ') + '.') : 'Сейчас явных пробелов нет.')
      );
    }

    if (t.includes('с чего') || t.includes('начать')) {
      return (
        'Начни с одного направления: ' +
        direction +
        '. Дальше закрой 1–2 пробела и сделай мини‑проект для закрепления.'
      );
    }

    if (t.includes('рекомендац') || t.includes('совет')) {
      return gaps.length
        ? 'Рекомендация: выбери один пробел и закрой его практикой. Приоритет: ' + gaps.join(', ') + '.'
        : 'Рекомендация: закрепляй знания через проекты и повторение.';
    }

    return 'Понял. Напиши, что именно уточнить: план, навыки или следующий шаг.';
  }

  window.SkillPathComponents.AI = {
    name: 'AI',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;

      state.chat = state.chat || { messages: [] };
      if (!Array.isArray(state.chat.messages)) state.chat.messages = [];

      const input = Vue.ref('');

      const messages = Vue.computed(() => state.chat.messages);

      function send() {
        const text = (input.value || '').trim();
        if (!text) return;

        state.chat.messages.push({ role: 'user', text, ts: new Date().toISOString() });
        const reply = buildAssistantReply(state, text);
        state.chat.messages.push({ role: 'assistant', text: reply, ts: new Date().toISOString() });
        input.value = '';
      }

      function backToProgress() {
        router.push('/progress');
      }

      return { input, messages, send, backToProgress };
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
            <p class="subtitle">ИИ</p>

            <div class="content compact">
              <div class="chat">
                <div class="chat-bubble chat-bubble--assistant">
                  Привет, это твой персональный ИИ ассистент, чем тебе помочь?
                </div>

                <div v-for="(m, idx) in messages" :key="idx" class="chat-bubble" :class="m.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'">
                  {{ m.text }}
                </div>
              </div>

              <div class="chat-input" style="margin-top:12px">
                <input class="input" type="text" v-model="input" placeholder="Текст" @keydown.enter.prevent="send" />
                <button class="btn" type="button" @click="send">Отправить</button>
              </div>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" type="button" @click="backToProgress">К прогрессу</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
