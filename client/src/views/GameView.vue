<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PanoramaViewer from '../components/PanoramaViewer.vue'
import GuessMap from '../components/GuessMap.vue'
import YearPicker from '../components/YearPicker.vue'
import Timer from '../components/Timer.vue'
import { useGameSocket } from '../composables/useGameSocket'
import { resolvePanoramaImage } from '../config'

const MAP_PINNED_STORAGE_KEY = 'game-map-pinned'
const MOBILE_BREAKPOINT = 900

const { t } = useI18n()
const { state, submitGuess } = useGameSocket()

const year = ref(1800)
const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const submitted = ref(false)
const mapOpen = ref(false)
const mapHovered = ref(false)
const mapPinned = ref(localStorage.getItem(MAP_PINNED_STORAGE_KEY) === '1')
const isMobile = ref(false)

const round = computed(() => state.round)
const room = computed(() => state.room)

const imageUrl = computed(() => {
  const image = round.value?.image
  if (!image) return ''
  return resolvePanoramaImage(image)
})

const hasGuess = computed(() => lat.value !== null && lng.value !== null)

function updateIsMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

function toggleMapPinned() {
  mapPinned.value = !mapPinned.value
  localStorage.setItem(MAP_PINNED_STORAGE_KEY, mapPinned.value ? '1' : '0')
  if (isMobile.value) {
    mapOpen.value = true
  }
}

function onMapSelect(selectedLat: number, selectedLng: number) {
  lat.value = selectedLat
  lng.value = selectedLng
}

function sendGuess() {
  if (!hasGuess.value || submitted.value) return
  submitGuess(year.value, lat.value!, lng.value!)
  submitted.value = true
  if (isMobile.value) {
    mapOpen.value = false
  }
}

watch(
  () => round.value?.roundIndex,
  () => {
    submitted.value = false
    lat.value = null
    lng.value = null
    year.value = 1800
    if (isMobile.value) {
      mapOpen.value = false
    }
  },
)

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<template>
  <section v-if="round && room" class="game">
    <div class="game__panorama">
      <PanoramaViewer v-if="imageUrl" :key="imageUrl" :image-url="imageUrl" />
      <p v-else class="game__panorama-fallback">{{ t('game.panoramaMissing') }}</p>

      <div class="game__hud">
        <div class="game__round">
          {{ t('game.round', { current: round.roundIndex + 1, total: round.totalRounds }) }}
        </div>
        <div class="game__timer">
          <Timer :remaining-ms="state.remainingMs" />
        </div>
      </div>
    </div>

    <aside
      class="game__float"
      :class="{
        'game__float--hovered': mapHovered && !mapPinned && !isMobile,
        'game__float--pinned': mapPinned && !isMobile,
        'game__float--open': isMobile && mapOpen,
      }"
      @mouseenter="mapHovered = true"
      @mouseleave="mapHovered = false"
    >
      <div class="game__float-toolbar">
        <button
          v-if="!isMobile"
          class="game__float-btn"
          type="button"
          :title="mapPinned ? t('game.unpinMap') : t('game.pinMap')"
          @click="toggleMapPinned"
        >
          {{ mapPinned ? '⤢' : '⤡' }}
        </button>
        <button
          v-if="isMobile"
          class="game__float-btn"
          type="button"
          :title="t('game.hideMap')"
          @click="mapOpen = false"
        >
          ×
        </button>
      </div>

      <div class="game__map">
        <GuessMap :lat="lat" :lng="lng" @select="onMapSelect" />
      </div>

      <div class="game__controls">
        <YearPicker v-model="year" />
        <button
          class="btn btn--primary game__submit"
          type="button"
          :disabled="!hasGuess || submitted"
          @click="sendGuess"
        >
          {{ t('game.confirmGuess') }}
        </button>
        <p v-if="submitted" class="submitted">{{ t('game.guessSubmitted') }}</p>
      </div>
    </aside>

    <button
      v-if="isMobile"
      class="btn btn--primary game__mobile-toggle"
      type="button"
      @click="mapOpen = !mapOpen"
    >
      {{ mapOpen ? t('game.hideMap') : t('game.openMap') }}
    </button>
  </section>
</template>

<style scoped>
.game {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #070b14;
}

.game__panorama {
  position: absolute;
  inset: 0;
  background: #0b1020;
}

.game__panorama-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 1rem;
  color: #9fb0d0;
  text-align: center;
}

.game__hud {
  position: absolute;
  top: 1rem;
  left: 0;
  right: 0;
  height: 2.75rem;
  pointer-events: none;
  z-index: 10;
}

.game__round {
  position: absolute;
  top: 0;
  left: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(15, 22, 38, 0.85);
  border: 1px solid #2f3f66;
  color: #dce6ff;
  backdrop-filter: blur(8px);
}

.game__timer {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.game__float {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  width: min(300px, calc(100vw - 2rem));
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 16px;
  background: rgba(10, 15, 28, 0.94);
  border: 1px solid #24304d;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px);
  z-index: 5;
  transition:
    width 0.25s ease,
    height 0.25s ease,
    top 0.25s ease,
    bottom 0.25s ease,
    border-radius 0.25s ease;
}

.game__float--hovered {
  width: min(546px, calc(100vw - 2rem));
}

.game__float--hovered .game__map {
  height: 260px;
}

.game__float--pinned {
  top: 0;
  bottom: 0;
  right: 0;
  width: min(468px, 55vw);
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-right: none;
}

.game__float--pinned .game__map {
  flex: 1 1 auto;
  min-height: 200px;
  height: auto;
}

.game__float-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}

.game__float-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #3a4c74;
  border-radius: 8px;
  background: #172238;
  color: #dce6ff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}

.game__float-btn:hover {
  border-color: #5b8cff;
  color: #9ec2ff;
}

.game__map {
  height: 170px;
  min-height: 0;
  transition: height 0.25s ease;
}

.game__controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.game__submit {
  width: 100%;
}

.submitted {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(15, 22, 38, 0.9);
  color: #9ed0ff;
  font-size: 0.875rem;
  text-align: center;
}

.game__mobile-toggle {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
  z-index: 6;
}

@media (max-width: 899px) {
  .game__float {
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-height: min(68vh, 560px);
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
    transition: transform 0.25s ease;
  }

  .game__float--open {
    transform: translateY(0);
  }

  .game__float .game__map {
    height: min(36vh, 280px);
  }

  .game__mobile-toggle {
    bottom: 0.75rem;
  }

  .game__float--open ~ .game__mobile-toggle {
    display: none;
  }
}
</style>
