(function () {
  'use strict';

  window.SkillPathComponents = window.SkillPathComponents || {};

  const LEVEL_LABELS = {
    yes: 'Освоено',
    mid: 'Есть база',
    no: 'Нужно изучить',
  };

  // Вертикальный timeline: разделы (навыки) чередуются слева и справа от линии,
  // внутри раздела — темы с процентом изучения по отметкам в карьерном плане.
  window.SkillPathComponents.RoadmapTimeline = {
    name: 'RoadmapTimeline',
    props: {
      sections: { type: Array, required: true },
    },
    setup() {
      return { LEVEL_LABELS };
    },
    template: `
      <ol class="rm" aria-label="Roadmap по разделам">
        <li
          class="rm__item"
          v-for="(s, i) in sections"
          :key="s.id"
          :class="['rm__item--' + (i % 2 === 0 ? 'right' : 'left'), 'is-' + s.state]"
        >
          <span class="rm__dot" aria-hidden="true"></span>
          <article class="rm__card">
            <header class="rm__head">
              <span class="rm__icon" aria-hidden="true">{{ s.icon }}</span>
              <div class="rm__headtext">
                <h3 class="rm__title">{{ s.title }}</h3>
                <div class="rm__meta">
                  <span class="rm__level" v-if="s.id !== 'project'" :class="'rm__level--' + s.level">{{ LEVEL_LABELS[s.level] }}</span>
                  <span class="rm__percent">{{ s.percent }}%</span>
                </div>
              </div>
            </header>

            <p class="rm__desc">{{ s.desc }}</p>

            <div
              class="progress-bar rm__bar"
              role="progressbar"
              :aria-label="'Изучено: ' + s.title"
              :aria-valuenow="s.percent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="progress-bar__fill" :style="{ width: s.percent + '%' }"></div>
            </div>

            <ul class="rm__topics">
              <li class="rm__topic" v-for="t in s.topics" :key="t.title" :class="{ 'is-done': t.percent >= 100, 'is-part': t.percent > 0 && t.percent < 100 }">
                <span class="rm__check" aria-hidden="true">{{ t.percent >= 100 ? '✓' : '' }}</span>
                <span class="rm__topicname">{{ t.title }}</span>
                <span class="rm__pct">{{ t.percent }}%</span>
                <span class="rm__minibar" aria-hidden="true"><i :style="{ width: t.percent + '%' }"></i></span>
              </li>
            </ul>
          </article>
        </li>
      </ol>
    `,
  };
})();
