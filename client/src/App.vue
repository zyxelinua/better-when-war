<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeView from './views/HomeView.vue'
import LobbyView from './views/LobbyView.vue'
import GameView from './views/GameView.vue'
import RevealView from './views/RevealView.vue'
import GameOverView from './views/GameOverView.vue'
import { useGameSocket } from './composables/useGameSocket'

const { locale, t } = useI18n()
const { state, tryAutoRejoin } = useGameSocket()

onMounted(() => {
  tryAutoRejoin()
})

const pageTitle = computed(() => t('app.title'))

watch(
  locale,
  (value) => {
    document.documentElement.lang = value
  },
  { immediate: true },
)

watch(pageTitle, (value) => {
  document.title = value
}, { immediate: true })
</script>

<template>
  <main class="app">
    <HomeView v-if="state.screen === 'home'" />
    <LobbyView v-else-if="state.screen === 'lobby'" />
    <GameView v-else-if="state.screen === 'game'" />
    <RevealView v-else-if="state.screen === 'reveal'" />
    <GameOverView v-else-if="state.screen === 'gameover'" />
  </main>
</template>
