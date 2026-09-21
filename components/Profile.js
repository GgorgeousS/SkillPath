(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  const PERSONAS = [
    { value: 'student', label: 'Студент IT-специальности' },
    { value: 'junior', label: 'Выпускник / джун' },
    { value: 'switcher', label: 'Перехожу в IT' },
    { value: 'specialist', label: 'Специалист (карьерный рост)' },
  ];

  const EVENT_LABELS = {
    survey: 'Опрос',
    direction: 'Направление',
    skills: 'Навыки',
    plan: 'План',
    progress: 'Прогресс',
  };

  const SYNC_TEXT = {
    idle: 'Данные хранятся в вашем аккаунте',
    saving: 'Сохранение…',
    saved: 'Все изменения сохранены',
    error: 'Не удалось сохранить — попробуем ещё раз автоматически',
  };

  // Личный кабинет: сводка по обучению, данные профиля, история и управление аккаунтом.
  window.SkillPathComponents.Profile = {
    name: 'Profile',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;
      const auth = SkillPathAuth.auth;
      const D = window.SkillPathDirections;

      const displayName = Vue.computed(() => (state.profile.name || (auth.user && auth.user.name) || '').trim());
      const directionKey = Vue.computed(() => state.selected_direction || '');
      const directionTitle = Vue.computed(() => (directionKey.value ? D.title(directionKey.value) : 'Не выбрано'));

      const readiness = Vue.computed(() => {
        const info = D.info(directionKey.value);
        if (!info || !info.skills.length) return null;
        const sum = info.skills.reduce((acc, k) => {
          const v = state.skills[k];
          return acc + (v === 'yes' ? 1 : v === 'mid' ? 0.5 : 0);
        }, 0);
        return Math.round((sum / info.skills.length) * 100);
      });

      const planStats = Vue.computed(() => {
        const helper = window.SkillPathPlan;
        if (!helper || !directionKey.value) return null;
        return helper.planStats(helper.buildPlanModel(state));
      });

      const hasSavedPlan = Vue.computed(() => !!(state.plan && state.plan.saved_at));
      const hasDirection = Vue.computed(() => !!directionKey.value);

      // Главное действие: продолжить с того места, где остановились.
      const nextAction = Vue.computed(() => {
        if (hasSavedPlan.value) return { label: 'Продолжить обучение', to: '/progress' };
        if (hasDirection.value) return { label: 'Открыть roadmap', to: '/roadmap' };
        return { label: 'Пройти опрос', to: '/survey' };
      });

      const history = Vue.computed(() =>
        (state.history || [])
          .slice()
          .reverse()
          .map((e) => ({
            ...e,
            when: e.ts ? new Date(e.ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '',
            kind: EVENT_LABELS[e.type] || 'Событие',
          }))
      );

      const syncText = Vue.computed(() => SYNC_TEXT[auth.sync] || '');
      const busy = Vue.ref(false);
      const error = Vue.ref('');

      async function logout() {
        busy.value = true;
        await SkillPathAuth.logout();
        busy.value = false;
        router.push('/');
      }

      async function deleteAccount() {
        error.value = '';
        if (!window.confirm('Удалить аккаунт и все ваши данные (ответы, план, историю)? Это действие необратимо.')) return;
        busy.value = true;
        const res = await SkillPathAuth.deleteAccount();
        busy.value = false;
        if (res.error) {
          error.value = 'Не удалось удалить аккаунт: ' + res.error.message;
          return;
        }
        router.push('/');
      }

      return {
        state,
        auth,
        PERSONAS,
        displayName,
        directionTitle,
        readiness,
        planStats,
        hasSavedPlan,
        nextAction,
        history,
        syncText,
        busy,
        error,
        logout,
        deleteAccount,
      };
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
            <p class="subtitle">Личный кабинет</p>

            <div class="content compact">
              <section class="panel cab-hero" aria-labelledby="cab-title">
                <div class="cab-hero__text">
                  <h1 class="h2 cab-hero__title" id="cab-title">Здравствуйте, {{ displayName }}!</h1>
                  <p class="small">{{ auth.user && auth.user.email }}</p>
                  <p class="small cab-sync" role="status" aria-live="polite" :class="{ 'is-error': auth.sync === 'error' }">{{ syncText }}</p>
                </div>
                <div class="actions cab-hero__actions">
                  <router-link class="btn btn-primary" :to="nextAction.to">{{ nextAction.label }}</router-link>
                  <router-link class="btn btn-ghost" to="/survey">Пройти опрос заново</router-link>
                </div>
              </section>

              <div class="cab-stats">
                <div class="panel cab-stat">
                  <span class="small">Направление</span>
                  <strong class="cab-stat__value">{{ directionTitle }}</strong>
                </div>
                <div class="panel cab-stat">
                  <span class="small">Готовность к junior</span>
                  <strong class="cab-stat__value">{{ readiness === null ? '—' : readiness + '%' }}</strong>
                </div>
                <div class="panel cab-stat">
                  <span class="small">Выполнено заданий</span>
                  <strong class="cab-stat__value">{{ planStats ? planStats.done + ' из ' + planStats.total : '—' }}</strong>
                </div>
              </div>

              <div class="split">
                <div class="panel">
                  <div class="h2">Мои данные</div>
                  <div class="field">
                    <label class="label" for="p-email">Email (логин)</label>
                    <input id="p-email" class="input" type="email" :value="auth.user && auth.user.email" readonly aria-readonly="true" />
                  </div>
                  <div class="field">
                    <label class="label" for="p-name">Имя</label>
                    <input id="p-name" class="input" type="text" autocomplete="given-name" v-model="state.profile.name" />
                  </div>
                  <div class="field">
                    <label class="label" for="p-last">Фамилия</label>
                    <input id="p-last" class="input" type="text" autocomplete="family-name" v-model="state.profile.last_name" />
                  </div>
                  <div class="field">
                    <label class="label" for="p-phone">Телефон</label>
                    <input id="p-phone" class="input" type="tel" autocomplete="tel" v-model="state.profile.phone" />
                  </div>
                  <div class="field">
                    <label class="label" for="p-persona">Кто вы</label>
                    <select id="p-persona" class="select" v-model="state.profile.persona_type">
                      <option v-for="p in PERSONAS" :key="p.value" :value="p.value">{{ p.label }}</option>
                    </select>
                  </div>
                </div>

                <div class="panel">
                  <div class="h2">История обучения</div>
                  <ol class="history" v-if="history.length">
                    <li v-for="(e, idx) in history" :key="idx">
                      <span class="badge">{{ e.kind }}</span>
                      <span class="history__text">{{ e.text }}</span>
                      <span class="small history__when">{{ e.when }}</span>
                    </li>
                  </ol>
                  <div class="note" v-else>Пока пусто. Пройдите опрос — и здесь появятся ваши шаги.</div>
                </div>
              </div>

              <div class="note error" v-if="error" role="alert">{{ error }}</div>

              <div class="actions" style="justify-content:center">
                <button class="btn btn-ghost" type="button" :disabled="busy" @click="logout">Выйти из аккаунта</button>
                <button class="btn btn-ghost btn-danger" type="button" :disabled="busy" @click="deleteAccount">Удалить аккаунт</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
