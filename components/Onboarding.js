(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  window.SkillPathComponents.Onboarding = {
    name: 'Onboarding',
    setup() {
      const router = VueRouter.useRouter();

      function start() {
        router.push('/survey');
      }

      return { start };
    },
    template: `
      <main class="page">
        <div class="shell">
          <div class="phone">
            <div class="content">
              <img
                class="logo-hero"
                src="./assets/skillpathnofone.png"
                alt="SkillPath"
                onerror="this.onerror=null; this.src='./assets/logo.svg';"
              />
              <h1 class="h1">SkillPath</h1>
              <p class="p">Ваш персональный путь в IT</p>
              <p class="muted" style="text-align:center;margin:0;">
                Мы поможем вам выбрать направление, оценить навыки и сохранить результат.
              </p>
            </div>

            <div class="sticky-footer">
              <button class="btn btn-primary" @click="start">Начать</button>
            </div>
          </div>
        </div>
      </main>
    `,
  };
})();
