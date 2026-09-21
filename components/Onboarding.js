(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  // Главная страница = лендинг + онбординг (руководство пользователя):
  // ценность продукта и порядок работы «направление → навыки → план → прогресс».
  const STEPS = [
    {
      n: '01',
      title: 'Выбор направления',
      text: 'Отметьте интересы и получите 2–3 подходящих направления в IT с примерами задач специалиста.',
      tags: ['Опрос по интересам', '2–3 рекомендации', 'Сравнение направлений'],
    },
    {
      n: '02',
      title: 'Оценка навыков',
      text: 'Заполните чек-лист по выбранному направлению и увидите сильные стороны, пробелы и готовность к junior-позиции.',
      tags: ['Чек-лист навыков', 'Roadmap с темами', 'Готовность в %'],
    },
    {
      n: '03',
      title: 'Карьерный план',
      text: 'Получите план обучения по дням: уже освоенные навыки в него не попадают, а нагрузка подстраивается под ваш темп.',
      tags: ['14, 30 или 60 дней', 'Задания по дням', 'Ваш темп'],
    },
    {
      n: '04',
      title: 'Трекинг прогресса',
      text: 'Отмечайте выполненные задания — проценты по темам и разделам roadmap обновляются сами.',
      tags: ['Отметки заданий', 'Проценты по темам', 'История обучения'],
    },
  ];

  const BENEFITS = [
    { icon: '◆', title: 'Всё в одном месте', text: 'Профориентация, оценка навыков, план и трекер — не нужно собирать данные из разных сервисов.' },
    { icon: '◇', title: 'Понятная оценка', text: 'Roadmap и процент готовности к junior показывают, что доучить в первую очередь.' },
    { icon: '✦', title: 'Личный план', text: 'Шаги строятся под ваше направление, уровень навыков и выбранный темп.' },
    { icon: '○', title: 'Без установки', text: 'Работает в браузере на компьютере, планшете и смартфоне.' },
  ];

  const DIRECTIONS = ['Frontend', 'Backend', 'QA Manual', 'UI/UX', 'Data Analyst', 'DevOps', 'Mobile', 'Кибербезопасность'];

  // Демонстрационные отзывы на основе персон продукта (не реальные пользователи).
  const REVIEWS = [
    { initial: 'А', name: 'Аня', role: 'студентка 2 курса', text: 'Наконец поняла, чем отличаются направления, и выбрала своё. Тревоги стало меньше.' },
    { initial: 'И', name: 'Игорь', role: 'выпускник курсов', text: 'Увидел конкретные пробелы перед собеседованиями и получил список тем для доучивания.' },
  ];

  const PREVIEW_ROWS = [
    { title: 'HTML', tag: 'Освоено', percent: 100 },
    { title: 'CSS', tag: 'Есть база', percent: 42 },
    { title: 'JavaScript', tag: 'Нужно изучить', percent: 12 },
  ];

  window.SkillPathComponents.Onboarding = {
    name: 'Onboarding',
    setup() {
      const router = VueRouter.useRouter();
      const state = SkillPathStore.state;
      const root = Vue.ref(null);

      const auth = SkillPathAuth.auth;
      const loggedIn = Vue.computed(() => !!auth.user);
      const hasProgress = Vue.computed(() => loggedIn.value && !!(state.plan && state.plan.saved_at));

      // Опрос доступен только после входа: гостя ведём на регистрацию, а затем возвращаем к опросу.
      function start() {
        if (loggedIn.value) router.push('/survey');
        else router.push({ path: '/auth', query: { mode: 'register', redirect: '/survey' } });
      }
      function login() {
        router.push({ path: '/auth', query: { mode: 'login' } });
      }
      function cabinet() {
        router.push('/profile');
      }
      function resume() {
        router.push('/progress');
      }
      function scrollToHow() {
        const el = document.getElementById('how');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Блоки плавно появляются при прокрутке. Без JS / IntersectionObserver всё остаётся видимым.
      let observer = null;
      Vue.onMounted(() => {
        const el = root.value;
        if (!el || !('IntersectionObserver' in window)) return;
        const items = el.querySelectorAll('[data-reveal]');
        el.classList.add('lp--js');
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('is-in');
                observer.unobserve(e.target);
              }
            });
          },
          { threshold: 0.12 }
        );
        items.forEach((i) => observer.observe(i));
      });
      Vue.onBeforeUnmount(() => {
        if (observer) observer.disconnect();
      });

      return { STEPS, BENEFITS, DIRECTIONS, REVIEWS, PREVIEW_ROWS, root, loggedIn, hasProgress, start, login, cabinet, resume, scrollToHow };
    },
    template: `
      <main class="lp" id="main" ref="root">
        <!-- HERO -->
        <section class="lp-hero" aria-labelledby="lp-title">
          <div class="lp-stars" aria-hidden="true"></div>
          <div class="lp-orb" aria-hidden="true"><span class="lp-orb__ring"></span><span class="lp-orb__ring lp-orb__ring--2"></span></div>

          <div class="lp-wrap lp-hero__grid">
            <div class="lp-hero__main">
              <span class="lp-pill"><i class="lp-pill__dot"></i>Карьерный навигатор для IT</span>
              <h1 class="lp-h1" id="lp-title">
                Найдите своё<br /><span class="lp-grad">направление</span><br />в IT
                <span class="lp-h1__side">от опроса до<br />первой работы</span>
              </h1>
              <p class="lp-lead">
                Выберите профессию, честно оцените навыки и получите личный roadmap и план обучения. Первый опрос займёт около 5 минут.
              </p>
              <div class="lp-actions">
                <button class="lp-btn lp-btn--primary" type="button" @click="start">{{ loggedIn ? 'Пройти опрос' : 'Создать аккаунт и начать' }}</button>
                <button v-if="!loggedIn" class="lp-btn lp-btn--ghost" type="button" @click="login">Войти</button>
                <button v-if="loggedIn" class="lp-btn lp-btn--ghost" type="button" @click="cabinet">Личный кабинет</button>
                <button v-if="hasProgress" class="lp-btn lp-btn--ghost" type="button" @click="resume">Продолжить обучение</button>
                <button v-if="!loggedIn" class="lp-btn lp-btn--ghost" type="button" @click="scrollToHow">Как это работает</button>
              </div>
              <p class="lp-auth-note" v-if="!loggedIn">Чтобы пройти опрос и сохранять прогресс, понадобится аккаунт — регистрация займёт минуту.</p>

              <div class="lp-mini">
                <div class="lp-glass lp-mini__card"><span class="lp-mini__label">Направления</span><span class="lp-mini__num">8</span></div>
                <div class="lp-glass lp-mini__card"><span class="lp-mini__label">Навыки</span><span class="lp-mini__num">30+</span></div>
                <div class="lp-glass lp-mini__card"><span class="lp-mini__label">План</span><span class="lp-mini__num">14–60<small> дн.</small></span></div>
              </div>
            </div>

            <aside class="lp-hero__side" aria-label="Кратко о сервисе">
              <div class="lp-glass lp-stat">
                <span class="lp-stat__label">Первый опрос</span>
                <span class="lp-stat__num">5 мин</span>
                <span class="lp-stat__text">и вы получите 2–3 рекомендованных направления</span>
              </div>
              <div class="lp-glass lp-stat">
                <span class="lp-stat__num">4 шага</span>
                <span class="lp-stat__text">до персонального карьерного плана</span>
                <div class="lp-chips">
                  <span>Направление</span><span>Навыки</span><span>План</span><span>Прогресс</span>
                </div>
                <button class="lp-btn lp-btn--primary lp-btn--block" type="button" @click="start">Начать</button>
              </div>
            </aside>
          </div>
        </section>

        <!-- ABOUT -->
        <section class="lp-section lp-about" aria-labelledby="about-title">
          <div class="lp-wrap lp-about__grid">
            <span class="lp-pill lp-pill--small" data-reveal><i class="lp-pill__dot"></i>О сервисе</span>
            <h2 class="lp-statement" id="about-title" data-reveal>
              Мы помогаем <span class="lp-accent">выбрать направление</span>, честно <span class="lp-accent">оценить навыки</span> и пройти путь до первой работы — с <span class="lp-accent">планом</span>, который подстраивается под ваш темп.
            </h2>
          </div>
        </section>

        <!-- BENTO -->
        <section class="lp-section" aria-label="Возможности">
          <div class="lp-wrap lp-bento">
            <article class="lp-glass lp-bento__big" data-reveal>
              <span class="lp-pill lp-pill--small"><i class="lp-pill__dot"></i>Без установки и регистрации</span>
              <h2 class="lp-h2">Откройте в браузере — <span class="lp-grad">и начните</span></h2>
              <button class="lp-btn lp-btn--dark" type="button" @click="start">Начать опрос</button>

              <div class="lp-mock" aria-label="Пример карточек roadmap">
                <div class="lp-mock__row" v-for="r in PREVIEW_ROWS" :key="r.title">
                  <div class="lp-mock__top"><strong>{{ r.title }}</strong><span class="lp-mock__tag">{{ r.tag }}</span><span class="lp-mock__pct">{{ r.percent }}%</span></div>
                  <div class="lp-bar"><i :style="{ width: r.percent + '%' }"></i></div>
                </div>
                <p class="lp-mock__note">Пример: так выглядит ваш roadmap</p>
              </div>
            </article>

            <article class="lp-glass lp-bento__num" data-reveal style="--d:.1s">
              <p class="lp-bento__lead">8 направлений: от Frontend и Backend до DevOps и кибербезопасности</p>
              <div class="lp-bignum">8<span class="lp-bignum__plus">+</span></div>
              <div class="lp-chips lp-chips--left"><span v-for="d in DIRECTIONS.slice(0, 4)" :key="d">{{ d }}</span></div>
            </article>

            <figure class="lp-glass lp-bento__quote" data-reveal style="--d:.2s">
              <div class="lp-avatar" aria-hidden="true">{{ REVIEWS[0].initial }}</div>
              <div>
                <span class="lp-quote__mark" aria-hidden="true">“</span>
                <blockquote>{{ REVIEWS[0].text }}</blockquote>
                <figcaption><strong>{{ REVIEWS[0].name }}</strong> | {{ REVIEWS[0].role }}</figcaption>
              </div>
            </figure>
          </div>
        </section>

        <!-- DIRECTIONS STRIP -->
        <section class="lp-strip" aria-label="Направления">
          <div class="lp-wrap lp-strip__grid">
            <p class="lp-strip__label">Направления,<br />которые мы разбираем</p>
            <ul class="lp-strip__list">
              <li v-for="d in DIRECTIONS" :key="d">{{ d }}</li>
            </ul>
          </div>
        </section>

        <!-- HOW IT WORKS -->
        <section class="lp-section lp-how" id="how" aria-labelledby="how-title">
          <div class="lp-wrap lp-how__grid">
            <div class="lp-how__intro" data-reveal>
              <span class="lp-pill lp-pill--small"><i class="lp-pill__dot"></i>Как это работает</span>
              <h2 class="lp-h2" id="how-title">От опроса<br />до <span class="lp-grad">личного плана</span></h2>
              <p class="lp-text">Четыре шага в одном сервисе: не нужно собирать информацию о профессиях, тестах и трекерах из разных мест.</p>
              <button class="lp-btn lp-btn--primary" type="button" @click="start">Пройти опрос</button>
            </div>

            <ol class="lp-steps">
              <li class="lp-glass lp-step" v-for="(s, i) in STEPS" :key="s.n" data-reveal :style="{ '--d': (i * 0.06) + 's' }">
                <span class="lp-step__n" aria-hidden="true">{{ s.n }}</span>
                <h3 class="lp-step__title">{{ s.title }}</h3>
                <p class="lp-step__text">{{ s.text }}</p>
                <div class="lp-chips lp-chips--left"><span v-for="t in s.tags" :key="t">{{ t }}</span></div>
              </li>
            </ol>
          </div>
        </section>

        <!-- BENEFITS -->
        <section class="lp-section" aria-labelledby="benefits-title">
          <div class="lp-wrap">
            <h2 class="lp-h2 lp-center" id="benefits-title" data-reveal>Почему <span class="lp-grad">SkillPath</span></h2>
            <div class="lp-benefits">
              <article class="lp-glass lp-benefit" v-for="(b, i) in BENEFITS" :key="b.title" data-reveal :style="{ '--d': (i * 0.06) + 's' }">
                <span class="lp-benefit__icon" aria-hidden="true">{{ b.icon }}</span>
                <h3>{{ b.title }}</h3>
                <p>{{ b.text }}</p>
              </article>
            </div>
          </div>
        </section>

        <!-- REVIEWS -->
        <section class="lp-section" aria-labelledby="reviews-title">
          <div class="lp-wrap">
            <h2 class="lp-h2 lp-center" id="reviews-title" data-reveal>Что говорят <span class="lp-grad">пользователи</span></h2>
            <div class="lp-reviews">
              <figure class="lp-glass lp-review" v-for="(r, i) in REVIEWS" :key="r.name" data-reveal :style="{ '--d': (i * 0.08) + 's' }">
                <div class="lp-avatar" aria-hidden="true">{{ r.initial }}</div>
                <blockquote>«{{ r.text }}»</blockquote>
                <figcaption><strong>{{ r.name }}</strong> | {{ r.role }}</figcaption>
              </figure>
            </div>
            <p class="lp-note">Демонстрационные отзывы: примеры типовых пользователей.</p>
          </div>
        </section>

        <!-- FINAL CTA -->
        <section class="lp-section lp-cta" aria-labelledby="cta-title">
          <div class="lp-wrap">
            <div class="lp-cta__box" data-reveal>
              <h2 class="lp-h2" id="cta-title">Готовы выбрать<br /><span class="lp-grad">своё направление?</span></h2>
              <p class="lp-text">Пройдите короткий опрос — и уже через 5 минут увидите подходящие направления.</p>
              <button class="lp-btn lp-btn--primary" type="button" @click="start">Пройти опрос</button>
            </div>
            <footer class="lp-footer">
              <span>SkillPath — ваш путь в IT</span>
              <nav aria-label="Дополнительные ссылки">
                <router-link to="/knowledge">База знаний</router-link>
                <router-link to="/compare">Направления</router-link>
                <router-link to="/support">Поддержка</router-link>
              </nav>
            </footer>
          </div>
        </section>
      </main>
    `,
  };
})();
