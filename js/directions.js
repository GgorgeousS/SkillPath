(function () {
  'use strict';

  // Единый справочник направлений и навыков: используется на экранах
  // «Результат», «Сравнение направлений» и «База знаний».

  const DIRECTION_INFO = {
    Frontend: {
      title: 'Frontend‑разработчик',
      cover: './assets/cover-frontend.svg',
      summary: 'Создаёт то, что пользователь видит и с чем взаимодействует в браузере.',
      tasks: [
        'Сверстать адаптивную страницу по макету',
        'Сделать форму с проверкой данных на JavaScript',
        'Подключить интерфейс к API и вывести данные',
      ],
      tools: ['HTML/CSS', 'JavaScript', 'Vue/React', 'Git'],
      fit: 'Видимый результат работы и интерес к интерфейсам.',
      entry: 'Низкий',
      skills: ['html', 'css', 'javascript', 'git', 'api'],
      resources: [
        { title: 'MDN: основы веб‑разработки', url: 'https://developer.mozilla.org/ru/docs/Learn_web_development' },
        { title: 'roadmap.sh: Frontend', url: 'https://roadmap.sh/frontend' },
      ],
    },
    Backend: {
      title: 'Backend‑разработчик',
      cover: './assets/cover-frontend.svg',
      summary: 'Отвечает за серверную логику, базы данных и интеграции «под капотом» сервиса.',
      tasks: [
        'Спроектировать таблицы и написать SQL‑запросы',
        'Реализовать REST API для списка задач',
        'Настроить авторизацию и обработку ошибок',
      ],
      tools: ['Python или Node.js', 'SQL', 'REST API', 'Git'],
      fit: 'Любите разбираться, как всё устроено внутри.',
      entry: 'Средний',
      skills: ['python', 'node', 'sql', 'api', 'git'],
      resources: [
        { title: 'Официальный туториал по Python', url: 'https://docs.python.org/3/tutorial/' },
        { title: 'roadmap.sh: Backend', url: 'https://roadmap.sh/backend' },
      ],
    },
    'QA Manual': {
      title: 'Тестирование (QA Manual)',
      cover: './assets/cover-qa.svg',
      summary: 'Проверяет качество продукта до релиза и помогает находить ошибки раньше пользователей.',
      tasks: [
        'Составить тест‑кейсы для формы регистрации',
        'Оформить баг‑репорт с шагами воспроизведения',
        'Проверить API‑запросы в Postman',
      ],
      tools: ['Тест‑дизайн', 'Postman', 'DevTools', 'SQL (база)'],
      fit: 'Внимательность, системность и любовь к деталям.',
      entry: 'Низкий',
      skills: ['testing', 'testcases', 'bugreports', 'sql', 'api'],
      resources: [
        { title: 'roadmap.sh: QA', url: 'https://roadmap.sh/qa' },
      ],
    },
    'UI/UX': {
      title: 'Веб‑дизайн (UI/UX)',
      cover: './assets/cover-ux.svg',
      summary: 'Проектирует удобные и понятные интерфейсы на основе потребностей пользователей.',
      tasks: [
        'Провести мини‑интервью и описать сценарий пользователя',
        'Нарисовать вайрфреймы мобильного приложения',
        'Собрать кликабельный прототип в Figma',
      ],
      tools: ['Figma', 'UX‑исследования', 'Прототипирование', 'UI‑паттерны'],
      fit: 'Интерес к дизайну и к тому, как люди пользуются продуктами.',
      entry: 'Низкий',
      skills: ['figma', 'uxresearch', 'wireframes', 'prototyping', 'ui'],
      resources: [
        { title: 'Справка Figma', url: 'https://help.figma.com/hc/en-us' },
        { title: 'roadmap.sh: UX Design', url: 'https://roadmap.sh/ux-design' },
      ],
    },
    'Data Analyst': {
      title: 'Data Analyst (аналитик данных)',
      cover: './assets/cover-ux.svg',
      summary: 'Находит закономерности в данных и помогает принимать решения на основе метрик.',
      tasks: [
        'Выгрузить данные SQL‑запросом и посчитать метрики',
        'Построить сводную таблицу и график в Excel',
        'Подготовить короткий отчёт с выводами',
      ],
      tools: ['SQL', 'Excel/Google Sheets', 'Статистика', 'Python (по желанию)'],
      fit: 'Нравится искать закономерности и объяснять их цифрами.',
      entry: 'Средний',
      skills: ['sql', 'excel', 'statistics', 'dataviz', 'python'],
      resources: [
        { title: 'Учебник по SQL', url: 'https://www.sqltutorial.org/' },
        { title: 'roadmap.sh: Data Analyst', url: 'https://roadmap.sh/data-analyst' },
      ],
    },
    DevOps: {
      title: 'DevOps‑инженер',
      cover: './assets/cover-qa.svg',
      summary: 'Автоматизирует сборку, доставку и работу сервисов, следит за их надёжностью.',
      tasks: [
        'Упаковать приложение в Docker‑контейнер',
        'Настроить автоматическую сборку и тесты (CI/CD)',
        'Развернуть сервис на виртуальной машине',
      ],
      tools: ['Linux', 'Docker', 'CI/CD', 'Облачные платформы'],
      fit: 'Системный подход и интерес к автоматизации.',
      entry: 'Высокий',
      skills: ['linux', 'docker', 'cicd', 'cloud', 'networking'],
      resources: [
        { title: 'Docker: Get started', url: 'https://docs.docker.com/get-started/' },
        { title: 'roadmap.sh: DevOps', url: 'https://roadmap.sh/devops' },
      ],
    },
    Mobile: {
      title: 'Mobile‑разработчик',
      cover: './assets/cover-ux.svg',
      summary: 'Создаёт приложения для смартфонов на iOS и Android.',
      tasks: [
        'Сделать экран со списком и переходом на карточку',
        'Получить данные с сервера и показать их в приложении',
        'Сохранить настройки пользователя на устройстве',
      ],
      tools: ['Kotlin или Swift', 'Flutter', 'REST API', 'Git'],
      fit: 'Нравится, когда продукт всегда «в кармане» у пользователя.',
      entry: 'Средний',
      skills: ['kotlin', 'swift', 'flutter', 'api', 'git'],
      resources: [
        { title: 'Android Developers: курсы', url: 'https://developer.android.com/courses' },
        { title: 'roadmap.sh: Android', url: 'https://roadmap.sh/android' },
      ],
    },
    Cybersecurity: {
      title: 'Кибербезопасность',
      cover: './assets/cover-qa.svg',
      summary: 'Защищает системы и данные, ищет уязвимости и оценивает риски.',
      tasks: [
        'Разобрать типовые уязвимости из OWASP Top 10',
        'Составить модель угроз для простого веб‑сервиса',
        'Проанализировать сетевой трафик и найти аномалии',
      ],
      tools: ['Сети', 'Linux', 'OWASP', 'Инструменты безопасности'],
      fit: 'Интерес к защите, рискам и «взгляду глазами атакующего».',
      entry: 'Высокий',
      skills: ['networking', 'linux', 'owasp', 'threats', 'sectools'],
      resources: [
        { title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/' },
        { title: 'roadmap.sh: Cyber Security', url: 'https://roadmap.sh/cyber-security' },
      ],
    },
  };

  const SKILL_INFO = {
    html: { label: 'HTML', desc: 'Язык разметки: структура и содержимое веб‑страницы.' },
    css: { label: 'CSS', desc: 'Оформление страниц: цвета, сетки, адаптивность.' },
    javascript: { label: 'JavaScript', desc: 'Язык, который делает страницы интерактивными.' },
    git: { label: 'Git', desc: 'Система контроля версий: история изменений и работа в команде.' },
    api: { label: 'API', desc: 'Обмен данными между приложениями по HTTP (REST, JSON).' },
    python: { label: 'Python', desc: 'Универсальный язык для серверной логики, анализа данных и скриптов.' },
    node: { label: 'Node.js', desc: 'Среда выполнения JavaScript на сервере.' },
    sql: { label: 'SQL', desc: 'Язык запросов к реляционным базам данных.' },
    testing: { label: 'Основы тестирования', desc: 'Виды тестирования, жизненный цикл дефекта, тест‑дизайн.' },
    testcases: { label: 'Тест‑кейсы', desc: 'Пошаговые сценарии проверки с ожидаемым результатом.' },
    bugreports: { label: 'Баг‑репорты', desc: 'Чёткое описание ошибки: шаги, факт, ожидание, окружение.' },
    figma: { label: 'Figma', desc: 'Редактор макетов и прототипов для совместной работы.' },
    uxresearch: { label: 'UX‑исследования', desc: 'Интервью, опросы и тесты, чтобы понять пользователя.' },
    wireframes: { label: 'Вайрфреймы', desc: 'Схематичные наброски экранов без детального оформления.' },
    prototyping: { label: 'Прототипирование', desc: 'Кликабельные макеты для проверки идей до разработки.' },
    ui: { label: 'UI‑композиция', desc: 'Сетка, типографика, цвет и иерархия элементов интерфейса.' },
    excel: { label: 'Excel / Google Sheets', desc: 'Сводные таблицы, формулы и быстрая визуализация данных.' },
    statistics: { label: 'Статистика', desc: 'Среднее, медиана, распределения, проверка гипотез.' },
    dataviz: { label: 'Визуализация данных', desc: 'Выбор графиков и дашбордов, которые доносят вывод.' },
    linux: { label: 'Linux', desc: 'Командная строка, права доступа, процессы и сервисы.' },
    docker: { label: 'Docker', desc: 'Контейнеры: одинаковое окружение на любой машине.' },
    cicd: { label: 'CI/CD', desc: 'Автоматическая сборка, тесты и выкладка изменений.' },
    cloud: { label: 'Облака', desc: 'Виртуальные машины, хранилища и управляемые сервисы.' },
    networking: { label: 'Сети', desc: 'IP, DNS, HTTP/HTTPS, маршрутизация и порты.' },
    kotlin: { label: 'Kotlin', desc: 'Основной язык для разработки под Android.' },
    swift: { label: 'Swift', desc: 'Основной язык для разработки под iOS.' },
    flutter: { label: 'Flutter', desc: 'Кроссплатформенная разработка: один код для iOS и Android.' },
    owasp: { label: 'OWASP / уязвимости', desc: 'Типовые уязвимости веб‑приложений и способы защиты.' },
    threats: { label: 'Модели угроз', desc: 'Оценка того, что и от кого нужно защищать.' },
    sectools: { label: 'Инструменты безопасности', desc: 'Сканеры, анализаторы трафика и средства мониторинга.' },
  };

  // Иконка и темы (этапы изучения) для каждого навыка — для экрана Roadmap.
  const SKILL_TOPICS = {
    html: { icon: '🧱', topics: ['Структура документа и теги', 'Семантическая вёрстка', 'Формы и ввод данных', 'Мультимедиа и доступность'] },
    css: { icon: '🎨', topics: ['Селекторы и каскад', 'Блочная модель и позиционирование', 'Flexbox и Grid', 'Адаптивная вёрстка'] },
    javascript: { icon: '⚡', topics: ['Синтаксис и типы данных', 'Функции и области видимости', 'DOM и события', 'Асинхронность и fetch'] },
    git: { icon: '🌿', topics: ['Репозиторий и коммиты', 'Ветки и слияние', 'Удалённые репозитории (GitHub)', 'Pull request и конфликты'] },
    api: { icon: '🔌', topics: ['HTTP‑методы и статусы', 'JSON и REST', 'Аутентификация и заголовки', 'Запросы в коде и Postman'] },
    python: { icon: '🐍', topics: ['Синтаксис и типы данных', 'Функции и модули', 'Файлы и обработка ошибок', 'Библиотеки и окружения'] },
    node: { icon: '🟢', topics: ['Модули и npm', 'Асинхронный ввод‑вывод', 'HTTP‑сервер (Express)', 'Работа с файлами и БД'] },
    sql: { icon: '🗄️', topics: ['SELECT и фильтрация', 'JOIN и связи таблиц', 'Агрегаты и группировка', 'Проектирование таблиц'] },
    testing: { icon: '🧪', topics: ['Виды и уровни тестирования', 'Тест‑дизайн: классы и границы', 'Жизненный цикл дефекта', 'Тестовая документация'] },
    testcases: { icon: '📋', topics: ['Структура тест‑кейса', 'Позитивные и негативные проверки', 'Чек‑листы', 'Трассируемость требований'] },
    bugreports: { icon: '🐞', topics: ['Заголовок и шаги воспроизведения', 'Приоритет и серьёзность', 'Окружение и вложения', 'Работа в баг‑трекере'] },
    figma: { icon: '🖌️', topics: ['Интерфейс и фреймы', 'Компоненты и стили', 'Auto Layout', 'Совместная работа и экспорт'] },
    uxresearch: { icon: '🔍', topics: ['Интервью с пользователями', 'Персоны и сценарии', 'Юзабилити‑тесты', 'Анализ результатов'] },
    wireframes: { icon: '📐', topics: ['Структура и иерархия экрана', 'Паттерны навигации', 'Низкодетальные наброски', 'Проверка сценариев'] },
    prototyping: { icon: '🖱️', topics: ['Связи между экранами', 'Анимации и переходы', 'Кликабельный прототип', 'Тестирование прототипа'] },
    ui: { icon: '🎯', topics: ['Сетка и отступы', 'Типографика', 'Цвет и контраст', 'Иерархия и состояния элементов'] },
    excel: { icon: '📊', topics: ['Формулы и функции', 'Сводные таблицы', 'Фильтры и очистка данных', 'Диаграммы'] },
    statistics: { icon: '📈', topics: ['Описательная статистика', 'Распределения', 'Корреляция', 'Проверка гипотез'] },
    dataviz: { icon: '🖼️', topics: ['Выбор типа графика', 'Дашборды', 'Цвет и подписи', 'Сторителлинг с данными'] },
    linux: { icon: '🐧', topics: ['Командная строка и файловая система', 'Права доступа', 'Процессы и сервисы', 'Bash‑скрипты'] },
    docker: { icon: '🐳', topics: ['Образы и контейнеры', 'Dockerfile', 'Тома и сети', 'Docker Compose'] },
    cicd: { icon: '🔄', topics: ['Основы CI/CD', 'Сборка и автотесты', 'Пайплайны (GitHub Actions)', 'Автоматический деплой'] },
    cloud: { icon: '☁️', topics: ['Модели IaaS, PaaS, SaaS', 'Виртуальные машины', 'Хранилища и базы данных', 'Стоимость и безопасность'] },
    networking: { icon: '🌐', topics: ['Модель OSI и TCP/IP', 'IP‑адресация и DNS', 'HTTP/HTTPS и TLS', 'Маршрутизация и порты'] },
    kotlin: { icon: '🤖', topics: ['Синтаксис Kotlin', 'Экраны и UI (Compose)', 'Сеть и данные', 'Хранение данных на устройстве'] },
    swift: { icon: '🍎', topics: ['Синтаксис Swift', 'SwiftUI и экраны', 'Сеть и JSON', 'Хранение данных'] },
    flutter: { icon: '🦋', topics: ['Dart и виджеты', 'Состояние приложения', 'Навигация', 'Работа с API'] },
    owasp: { icon: '🛡️', topics: ['OWASP Top 10', 'Инъекции и XSS', 'Аутентификация и сессии', 'Безопасная разработка'] },
    threats: { icon: '🧭', topics: ['Активы и границы системы', 'Метод STRIDE', 'Оценка рисков', 'План защитных мер'] },
    sectools: { icon: '🔧', topics: ['Сканеры уязвимостей', 'Анализ трафика (Wireshark)', 'Логи и мониторинг', 'Основы пентеста'] },
  };
  Object.keys(SKILL_TOPICS).forEach((k) => {
    if (SKILL_INFO[k]) Object.assign(SKILL_INFO[k], SKILL_TOPICS[k]);
  });

  function info(direction) {
    return DIRECTION_INFO[direction] || null;
  }

  function title(direction) {
    const i = info(direction);
    return i ? i.title : String(direction || '');
  }

  window.SkillPathDirections = {
    DIRECTION_INFO,
    SKILL_INFO,
    ALL: Object.keys(DIRECTION_INFO),
    info,
    title,
  };
})();
