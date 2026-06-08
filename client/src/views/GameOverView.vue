<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameSocket } from '../composables/useGameSocket'

const { t } = useI18n()
const { state, resetToHome, disconnect } = useGameSocket()

const players = computed(() => {
  const list = state.gameOver?.players ?? []
  return [...list].sort((a, b) => b.score - a.score)
})

function goHome() {
  disconnect()
  resetToHome()
}
</script>

<template>
  <section class="panel gameover">
    <div class="gameover__header">
      <p class="eyebrow">{{ t('gameOver.title') }}</p>
      <h1>{{ t('gameOver.finalScore') }}</h1>
    </div>

    <div class="card">
      <ol class="final-list">
        <li v-for="(player, index) in players" :key="player.id" class="final-list__item">
          <span class="place">#{{ index + 1 }}</span>
          <span class="name">{{ player.name }}</span>
          <span class="score">{{ player.score }}</span>
        </li>
      </ol>

      <button class="btn btn--primary" type="button" @click="goHome">
        {{ t('gameOver.backHome') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.final-list {
  list-style: none;
  margin: 0 0 1.5rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.final-list__item {
  display: grid;
  grid-template-columns: 3rem 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  background: #11182a;
  border: 1px solid #24304d;
}

.place {
  color: #8eb6ff;
  font-weight: 700;
}

.name {
  font-weight: 600;
}

.score {
  font-size: 1.25rem;
  font-weight: 700;
}
</style>
