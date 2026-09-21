(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  const PERSONAS = [
    { value: 'student', label: 'Студент IT-специальности' },
    { value: 'junior', label: 'Выпускник / джун' },
    { value: 'switcher', label: 'Перехожу в IT' },
    { value: 'specialist', label: 'Специалист (карьерный рост)' },
  ];

  const PERKS = [
    'Прогресс и план сохраняются и доступны с любого устройства',
    'Личный кабинет с историей обучения',
    'Roadmap и рекомендации строятся под вас',
  ];

  // Возвращаем пользователя туда, куда он шёл, но только на внутренние страницы сайта.
  function safeRedirect(value) {
    const v = typeof value === 'string' ? value : '';
    return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/auth') ? v : '';
  }

  window.SkillPathComponents.Auth = {
    name: 'Auth',
    setup() {
      const route = VueRouter.useRoute();
      const router = VueRouter.useRouter();
      const Auth = window.SkillPathAuth;

      const mode = Vue.ref(route.query.mode === 'login' ? 'login' : 'register');
      const form = Vue.reactive({ name: '', email: '', password: '', persona_type: 'student' });
      const showPassword = Vue.ref(false);
      const loading = Vue.ref(false);
      const error = Vue.ref('');

      const isRegister = Vue.computed(() => mode.value === 'register');
      const redirectTo = Vue.computed(() => safeRedirect(route.query.redirect));

      function setMode(m) {
        mode.value = m;
        error.value = '';
      }

      function validate() {
        if (isRegister.value && form.name.trim().length < 1) return 'Укажите имя.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return 'Укажите корректный email.';
        if (isRegister.value && form.password.length < 8) return 'Пароль должен содержать не меньше 8 символов.';
        if (!isRegister.value && !form.password) return 'Введите пароль.';
        return '';
      }

      async function submit() {
        error.value = validate();
        if (error.value) return;
        if (!window.SkillPathAPI.isConfigured()) {
          error.value = window.SkillPathAPI.getConfigHelp() || 'Сервер не настроен (см. js/api.js).';
          return;
        }

        loading.value = true;
        try {
          const res = isRegister.value ? await Auth.register(form) : await Auth.login(form);
          if (res.error) {
            error.value = res.error.message;
            return;
          }

          // Направление, выбранное до входа (экран сравнения), применяем и ведём на оценку навыков.
          const pending = Auth.consumePendingDirection();
          if (pending) {
            SkillPathStore.state.selected_direction = pending;
            SkillPathStore.logEvent('direction', 'Выбрано направление: ' + SkillPathDirections.title(pending));
            router.replace('/skills');
            return;
          }
          router.replace(redirectTo.value || (isRegister.value ? '/survey' : '/profile'));
        } finally {
          loading.value = false;
        }
      }

      return { PERSONAS, PERKS, mode, form, showPassword, loading, error, isRegister, setMode, submit };
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
            <p class="subtitle">{{ isRegister ? 'Создайте аккаунт, чтобы пройти опрос' : 'Войдите в личный кабинет' }}</p>

            <div class="content compact">
              <div class="auth">
                <aside class="auth__aside panel">
                  <h2 class="h2">Зачем нужен аккаунт</h2>
                  <ul class="auth__perks">
                    <li v-for="p in PERKS" :key="p">{{ p }}</li>
                  </ul>
                  <p class="small">Пароль хранится на сервере только в зашифрованном виде.</p>
                </aside>

                <section class="auth__card panel" aria-labelledby="auth-title">
                  <div class="tabs" role="tablist" aria-label="Вход или регистрация">
                    <button type="button" role="tab" class="tabs__tab" :class="{ 'is-active': !isRegister }" :aria-selected="!isRegister ? 'true' : 'false'" @click="setMode('login')">Вход</button>
                    <button type="button" role="tab" class="tabs__tab" :class="{ 'is-active': isRegister }" :aria-selected="isRegister ? 'true' : 'false'" @click="setMode('register')">Регистрация</button>
                  </div>

                  <h1 class="h2 auth__title" id="auth-title">{{ isRegister ? 'Создать аккаунт' : 'С возвращением' }}</h1>

                  <form @submit.prevent="submit" novalidate>
                    <div class="field" v-if="isRegister">
                      <label class="label" for="a-name">Имя</label>
                      <input id="a-name" class="input" type="text" autocomplete="given-name" v-model="form.name" />
                    </div>
                    <div class="field">
                      <label class="label" for="a-email">Email</label>
                      <input id="a-email" class="input" type="email" autocomplete="email" v-model="form.email" placeholder="you@example.com" />
                    </div>
                    <div class="field">
                      <label class="label" for="a-pass">Пароль</label>
                      <input
                        id="a-pass"
                        class="input"
                        :type="showPassword ? 'text' : 'password'"
                        :autocomplete="isRegister ? 'new-password' : 'current-password'"
                        v-model="form.password"
                        :aria-describedby="isRegister ? 'a-pass-hint' : null"
                      />
                      <span class="small" id="a-pass-hint" v-if="isRegister">Не меньше 8 символов.</span>
                    </div>
                    <label class="auth__show">
                      <input type="checkbox" v-model="showPassword" /> Показать пароль
                    </label>
                    <div class="field" v-if="isRegister">
                      <label class="label" for="a-persona">Кто вы</label>
                      <select id="a-persona" class="select" v-model="form.persona_type">
                        <option v-for="p in PERSONAS" :key="p.value" :value="p.value">{{ p.label }}</option>
                      </select>
                    </div>

                    <div v-if="error" class="note error" role="alert">{{ error }}</div>

                    <div class="actions">
                      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
                        {{ loading ? 'Подождите…' : (isRegister ? 'Зарегистрироваться' : 'Войти') }}
                      </button>
                    </div>
                  </form>

                  <p class="small auth__switch">
                    <template v-if="isRegister">Уже есть аккаунт? <button type="button" class="link-btn" @click="setMode('login')">Войти</button></template>
                    <template v-else>Впервые здесь? <button type="button" class="link-btn" @click="setMode('register')">Создать аккаунт</button></template>
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
