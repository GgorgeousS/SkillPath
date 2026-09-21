(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  const FAQ = [
    {
      q: 'Сколько времени занимает первый опрос?',
      a: 'Обычно около 5 минут: нужно отметить интересные темы и получить рекомендованные направления.',
    },
    {
      q: 'Как считается готовность к junior‑позиции?',
      a: 'По вашей оценке навыков выбранного направления: «Отлично знаю» даёт 1 балл, «Уверенная база» — 0,5, «Не знаю» — 0. Сумма делится на число навыков.',
    },
    {
      q: 'Как изменить темп обучения?',
      a: 'На экране «Ваш карьерный план» выберите спокойный, средний или интенсивный темп. План пересчитается; если вы уже отмечали задания, отметки сбросятся (перед этим будет запрос подтверждения).',
    },
    {
      q: 'Можно ли сменить направление?',
      a: 'Да. Откройте «Направления», выберите другое и заново оцените навыки — карта и план построятся под новое направление.',
    },
    {
      q: 'Где хранятся мои данные?',
      a: 'В вашем аккаунте на сервере (база данных PostgreSQL): ответы, навыки, план, отметки заданий и история обучения. Пароль хранится только в зашифрованном виде. Данные доступны после входа с любого устройства.',
    },
    {
      q: 'Как удалить свои данные?',
      a: 'В личном кабинете нажмите «Удалить аккаунт» — аккаунт, ответы, план и история будут удалены без возможности восстановления.',
    },
  ];

  window.SkillPathComponents.Support = {
    name: 'Support',
    setup() {
      const state = SkillPathStore.state;

      const auth = SkillPathAuth.auth;
      const form = Vue.reactive({
        name: state.profile.name || (auth.user ? auth.user.name : ''),
        email: (auth.user && auth.user.email) || state.profile.email || '',
        message: '',
      });
      const status = Vue.ref({ type: 'idle', message: '' });
      const isSending = Vue.ref(false);

      const canSend = Vue.computed(() => {
        const email = form.email.trim();
        return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && form.message.trim().length >= 5;
      });

      async function send() {
        status.value = { type: 'idle', message: '' };
        if (!canSend.value) {
          status.value = { type: 'error', message: 'Укажите email и сообщение (не короче 5 символов).' };
          return;
        }
        if (!SkillPathAPI.isConfigured()) {
          status.value = { type: 'error', message: 'Сервис обратной связи сейчас недоступен. Попробуйте позже.' };
          return;
        }

        isSending.value = true;
        try {
          const res = await SkillPathAPI.sendFeedback({
            name: form.name.trim() || 'Аноним',
            email: form.email.trim(),
            message: form.message.trim(),
          });
          if (res.error) {
            status.value = { type: 'error', message: 'Не удалось отправить сообщение: ' + res.error.message };
            return;
          }
          status.value = { type: 'success', message: 'Спасибо! Сообщение отправлено, мы свяжемся с вами по email.' };
          form.message = '';
        } catch (e) {
          status.value = { type: 'error', message: e.message || String(e) };
        } finally {
          isSending.value = false;
        }
      }

      return { FAQ, form, status, isSending, send };
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
            <p class="subtitle">Контакты / Поддержка</p>

            <div class="content compact">
              <div class="split">
                <section class="panel" aria-labelledby="faq-title">
                  <h2 class="h2" id="faq-title">Частые вопросы</h2>
                  <details class="faq" v-for="item in FAQ" :key="item.q">
                    <summary>{{ item.q }}</summary>
                    <p class="small faq__a">{{ item.a }}</p>
                  </details>
                </section>

                <section class="panel" aria-labelledby="fb-title">
                  <h2 class="h2" id="fb-title">Обратная связь</h2>
                  <p class="small">Не нашли ответ или хотите предложить улучшение — напишите нам.</p>
                  <div class="field">
                    <label class="label" for="fb-name">Имя</label>
                    <input id="fb-name" class="input" type="text" autocomplete="name" v-model="form.name" />
                  </div>
                  <div class="field">
                    <label class="label" for="fb-email">Email для ответа</label>
                    <input id="fb-email" class="input" type="email" autocomplete="email" v-model="form.email" placeholder="you@example.com" />
                  </div>
                  <div class="field">
                    <label class="label" for="fb-msg">Сообщение</label>
                    <textarea id="fb-msg" class="input textarea" rows="5" v-model="form.message"></textarea>
                  </div>

                  <div v-if="status.type !== 'idle'" class="note" :class="status.type" :role="status.type === 'error' ? 'alert' : 'status'">
                    {{ status.message }}
                  </div>

                  <div class="actions">
                    <button class="btn btn-primary" type="button" :disabled="isSending" @click="send">
                      {{ isSending ? 'Отправка…' : 'Отправить' }}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
