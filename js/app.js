(function () {
  'use strict';

  const REQUIRED_SCREENS = [
    'Onboarding',
    'Survey',
    'Result',
    'Compare',
    'Skills',
    'Roadmap',
    'Plan',
    'Progress',
    'Knowledge',
    'Profile',
    'Support',
    'Auth',
  ];

  function ensureGlobals() {
    const missing = [];
    if (!window.Vue) missing.push('Vue');
    if (!window.VueRouter) missing.push('VueRouter');
    if (!window.SkillPathComponents) missing.push('SkillPathComponents');
    if (!window.SkillPathStore) missing.push('SkillPathStore');
    if (!window.SkillPathRecommend) missing.push('SkillPathRecommend');
    if (!window.SkillPathDirections) missing.push('SkillPathDirections');
    if (!window.SkillPathAPI) missing.push('SkillPathAPI');
    if (!window.SkillPathAuth) missing.push('SkillPathAuth');
    if (window.SkillPathComponents) {
      REQUIRED_SCREENS.forEach((name) => {
        if (!window.SkillPathComponents[name]) missing.push('SkillPathComponents.' + name);
      });
    }
    if (missing.length) {
      throw new Error('Не хватает глобальных зависимостей: ' + missing.join(', '));
    }
  }

  ensureGlobals();

  const C = window.SkillPathComponents;

  // requiresAuth: экраны, доступные только после входа в аккаунт.
  const routes = [
    { path: '/', component: C.Onboarding, meta: { title: 'SkillPath — ваш путь в IT' } },
    { path: '/auth', component: C.Auth, meta: { title: 'Вход и регистрация — SkillPath', guestOnly: true } },
    { path: '/survey', component: C.Survey, meta: { title: 'Опрос по интересам — SkillPath', requiresAuth: true } },
    { path: '/result', component: C.Result, meta: { title: 'Рекомендованные направления — SkillPath', requiresAuth: true } },
    { path: '/compare', component: C.Compare, meta: { title: 'Сравнение направлений — SkillPath' } },
    { path: '/skills', component: C.Skills, meta: { title: 'Оценка навыков — SkillPath', requiresAuth: true } },
    { path: '/roadmap', component: C.Roadmap, meta: { title: 'Roadmap — SkillPath', requiresAuth: true } },
    { path: '/plan', component: C.Plan, meta: { title: 'Карьерный план — SkillPath', requiresAuth: true } },
    { path: '/progress', component: C.Progress, meta: { title: 'Прогресс — SkillPath', requiresAuth: true } },
    { path: '/knowledge', component: C.Knowledge, meta: { title: 'База знаний — SkillPath' } },
    { path: '/profile', component: C.Profile, meta: { title: 'Личный кабинет — SkillPath', requiresAuth: true } },
    { path: '/support', component: C.Support, meta: { title: 'Контакты и поддержка — SkillPath' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ];

  const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
  });

  // Без входа личные экраны недоступны: ведём на регистрацию и после неё возвращаем обратно.
  router.beforeEach((to) => {
    const user = window.SkillPathAuth.auth.user;
    if (to.meta.requiresAuth && !user) {
      return { path: '/auth', query: { mode: 'register', redirect: to.fullPath } };
    }
    if (to.meta.guestOnly && user) return { path: '/profile' };
    return true;
  });

  router.afterEach((to) => {
    document.title = (to.meta && to.meta.title) || 'SkillPath';
  });

  const NAV_PUBLIC = [
    { to: '/', label: 'Главная' },
    { to: '/compare', label: 'Направления' },
    { to: '/knowledge', label: 'База знаний' },
    { to: '/support', label: 'Поддержка' },
  ];
  const NAV_USER = [
    { to: '/', label: 'Главная' },
    { to: '/compare', label: 'Направления' },
    { to: '/progress', label: 'Мой план' },
    { to: '/knowledge', label: 'База знаний' },
    { to: '/profile', label: 'Личный кабинет' },
    { to: '/support', label: 'Поддержка' },
  ];

  const App = {
    name: 'App',
    setup() {
      const root = document.documentElement;
      const isDark = Vue.ref(root.getAttribute('data-theme') === 'dark');
      const auth = window.SkillPathAuth.auth;
      const nav = Vue.computed(() => (auth.user ? NAV_USER : NAV_PUBLIC));

      function toggleTheme() {
        isDark.value = !isDark.value;
        root.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
        try {
          localStorage.setItem('skillpath_theme', isDark.value ? 'dark' : 'light');
        } catch (_) {
          /* хранилище недоступно — тема просто не запомнится */
        }
      }

      function skipToContent() {
        const main = document.getElementById('main');
        if (!main) return;
        main.setAttribute('tabindex', '-1');
        main.focus();
      }
      return { auth, nav, isDark, toggleTheme, skipToContent };
    },
    template: `
      <a class="skip-link" href="#main" @click.prevent="skipToContent">К содержимому</a>
      <div class="sitenav">
        <span class="sitenav__spacer" aria-hidden="true"></span>
        <nav class="sitenav__links" aria-label="Основное меню">
          <router-link v-for="n in nav" :key="n.to" :to="n.to">{{ n.label }}</router-link>
          <router-link v-if="!auth.user" class="sitenav__login" :to="{ path: '/auth', query: { mode: 'login' } }">Войти</router-link>
        </nav>
        <button
          class="theme-toggle"
          type="button"
          @click="toggleTheme"
          :aria-label="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'"
          :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
        >{{ isDark ? '☀' : '☾' }}</button>
      </div>
      <router-view />
    `,
  };

  // Сначала проверяем сохранённую сессию и загружаем данные пользователя, затем показываем приложение.
  window.SkillPathAuth.init()
    .catch((e) => console.error('Auth init failed:', e))
    .finally(() => {
      const app = Vue.createApp(App);
      app.use(router);
      app.mount('#app');
    });
})();
