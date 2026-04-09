(function () {
  'use strict';

  function ensureGlobals() {
    const missing = [];
    if (!window.Vue) missing.push('Vue');
    if (!window.VueRouter) missing.push('VueRouter');
    if (!window.SkillPathComponents) missing.push('SkillPathComponents');
    if (!window.SkillPathStore) missing.push('SkillPathStore');
    if (!window.SkillPathRecommend) missing.push('SkillPathRecommend');
    if (!window.SkillPathSupabase) missing.push('SkillPathSupabase');
    if (missing.length) {
      throw new Error('Не хватает глобальных зависимостей: ' + missing.join(', '));
    }
  }

  ensureGlobals();

  const routes = [
    { path: '/', component: window.SkillPathComponents.Onboarding },
    { path: '/survey', component: window.SkillPathComponents.Survey },
    { path: '/result', component: window.SkillPathComponents.Result },
    { path: '/skills', component: window.SkillPathComponents.Skills },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ];

  const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
  });

  const App = {
    name: 'App',
    template: `<router-view />`,
  };

  const app = Vue.createApp(App);
  app.use(router);
  app.mount('#app');
})();
