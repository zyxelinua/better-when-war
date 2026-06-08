<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const model = defineModel<number>({ required: true })

const minYear = -500
const maxYear = 2025
</script>

<template>
  <div class="year-picker">
    <label class="year-picker__label" for="year-input">{{ t('game.eventYear') }}</label>
    <input
      id="year-input"
      v-model.number="model"
      class="year-picker__input"
      type="number"
      :min="minYear"
      :max="maxYear"
    />
    <input
      v-model.number="model"
      class="year-picker__slider"
      type="range"
      :min="minYear"
      :max="maxYear"
      step="1"
    />
    <div class="year-picker__range">
      <span>{{ minYear }}</span>
      <span>{{ maxYear }}</span>
    </div>
  </div>
</template>

<style scoped>
.year-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.year-picker__label {
  font-size: 0.875rem;
  color: #9fb0d0;
}

.year-picker__input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #2a3550;
  border-radius: 10px;
  background: #121a2b;
  color: #f4f7ff;
  font-size: 1.25rem;
  font-weight: 600;
}

.year-picker__slider {
  width: 100%;
  accent-color: #5b8cff;
}

.year-picker__range {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6f7f9f;
}
</style>
