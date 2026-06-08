<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatPanoramaDate } from '@shared/formatDate'
import { getLocalizedText } from '@shared/localized'
import { getPlayerColor } from '@shared/playerColors'
import { DEFAULT_REVEAL_AUTO_MS } from '@shared/types'
import GuessMap from '../components/GuessMap.vue'
import PlayerColorBadge from '../components/PlayerColorBadge.vue'
import EventMetaBadges from '../components/EventMetaBadges.vue'
import WikipediaPreview from '../components/WikipediaPreview.vue'
import { useGameSocket } from '../composables/useGameSocket'
import type { AppLocale } from '@shared/types'

const AUTO_ADVANCE_KEY = 'reveal-auto-advance'
const AUTO_SECONDS = DEFAULT_REVEAL_AUTO_MS / 1000

const { t, locale } = useI18n()
const { state, continueReveal } = useGameSocket()

const autoAdvance = ref(localStorage.getItem(AUTO_ADVANCE_KEY) !== '0')
const countdown = ref(AUTO_SECONDS)
const hasContinued = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const result = computed(() => state.roundResult)
const reveal = computed(() => result.value?.reveal)
const appLocale = computed(() => locale.value as AppLocale)
const playerId = computed(() => state.room?.playerId ?? '')

const colorIndexByPlayerId = computed(() => {
  const map = new Map<string, number>()
  for (const player of state.room?.players ?? []) {
    map.set(player.id, player.colorIndex)
  }
  return map
})

const revealTitle = computed(() => {
  if (!reveal.value) return ''
  return getLocalizedText(reveal.value.title, appLocale.value)
})

const revealPlace = computed(() => {
  if (!reveal.value) return ''
  return getLocalizedText(reveal.value.place, appLocale.value)
})

const revealDate = computed(() => {
  if (!reveal.value) return ''
  return formatPanoramaDate(reveal.value.date, appLocale.value)
})

const hasWikipedia = computed(() => {
  const urls = reveal.value?.wikipedia ?? {}
  return Boolean(urls.ru?.trim() || urls.en?.trim())
})

const guessMarkers = computed(() =>
  (result.value?.results ?? [])
    .filter((item) => item.guess)
    .map((item) => ({
      lat: item.guess!.lat,
      lng: item.guess!.lng,
      label: item.playerName,
      colorIndex: colorIndexByPlayerId.value.get(item.playerId) ?? 0,
    })),
)

const waitingPlayers = computed(() => state.revealState?.waitingPlayers ?? [])

const continueButtonLabel = computed(() => {
  if (hasContinued.value) {
    return waitingPlayers.value.length > 0
      ? t('reveal.waitingPlayers', { count: waitingPlayers.value.length })
      : t('reveal.continuing')
  }

  if (autoAdvance.value) {
    return t('reveal.continueIn', { seconds: countdown.value })
  }

  return t('reveal.continue')
})

function playerColorStyle(colorIndex: number) {
  const color = getPlayerColor(colorIndex)
  return {
    color: color.main,
  }
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function submitContinue() {
  if (hasContinued.value) return
  hasContinued.value = true
  clearCountdown()
  continueReveal()
}

function startCountdown() {
  clearCountdown()
  countdown.value = AUTO_SECONDS

  if (!autoAdvance.value || hasContinued.value) return

  countdownTimer = setInterval(() => {
    if (hasContinued.value) {
      clearCountdown()
      return
    }

    countdown.value -= 1
    if (countdown.value <= 0) {
      submitContinue()
    }
  }, 1000)
}

watch(autoAdvance, (value) => {
  localStorage.setItem(AUTO_ADVANCE_KEY, value ? '1' : '0')
  if (value) {
    startCountdown()
  } else {
    clearCountdown()
    countdown.value = AUTO_SECONDS
  }
})

watch(
  () => result.value?.roundIndex,
  () => {
    hasContinued.value = false
    countdown.value = AUTO_SECONDS
    startCountdown()
  },
  { immediate: true },
)

watch(
  () => state.revealState?.continuedPlayerIds,
  (ids) => {
    if (ids?.includes(playerId.value)) {
      hasContinued.value = true
      clearCountdown()
    }
  },
  { immediate: true },
)

onUnmounted(clearCountdown)
</script>

<template>
  <section v-if="result && reveal" class="panel reveal">
    <div class="reveal__header">
      <p class="eyebrow">{{ t('reveal.title', { round: result.roundIndex + 1 }) }}</p>
      <h1>{{ revealTitle }}</h1>
      <EventMetaBadges
        v-if="reveal.epoch && reveal.eventType"
        :epoch="reveal.epoch"
        :event-type="reveal.eventType"
      />
      <p class="muted reveal__meta">{{ t('reveal.date', { date: revealDate }) }}</p>
      <p class="muted reveal__meta">{{ t('reveal.place', { place: revealPlace }) }}</p>
      <p class="muted reveal__meta">
        {{
          t('reveal.coordinates', {
            lat: reveal.location.lat.toFixed(2),
            lng: reveal.location.lng.toFixed(2),
          })
        }}
      </p>
    </div>

    <div class="reveal__grid">
      <div class="card reveal__map">
        <GuessMap
          readonly
          :lat="null"
          :lng="null"
          :answer="{ lat: reveal.location.lat, lng: reveal.location.lng, label: t('reveal.correctPoint') }"
          :guesses="guessMarkers"
        />
      </div>

      <div class="card">
        <h2>{{ t('reveal.roundScores') }}</h2>
        <ul class="score-list">
          <li
            v-for="item in result.results"
            :key="item.playerId"
            class="score-list__item"
            :class="{ 'score-list__item--self': item.playerId === playerId }"
          >
            <div>
              <div class="score-list__name">
                <PlayerColorBadge
                  :color-index="colorIndexByPlayerId.get(item.playerId) ?? 0"
                />
                <strong :style="playerColorStyle(colorIndexByPlayerId.get(item.playerId) ?? 0)">
                  {{ item.playerName }}
                </strong>
                <span v-if="item.playerId === playerId" class="badge badge--you">{{ t('lobby.you') }}</span>
              </div>
              <p class="muted small">
                <template v-if="item.guess">
                  {{
                    t('reveal.yearGuess', {
                      year: item.guess.year,
                      diff: item.yearDiff,
                      distance: Math.round(item.distanceMeters / 1000),
                    })
                  }}
                </template>
                <template v-else>{{ t('reveal.noAnswer') }}</template>
              </p>
            </div>
            <span class="score">{{ item.totalScore }}</span>
          </li>
        </ul>

        <WikipediaPreview v-if="hasWikipedia" :urls="reveal.wikipedia" />

        <div class="reveal__actions">
          <button
            class="btn btn--primary reveal__continue"
            type="button"
            :disabled="hasContinued"
            @click="submitContinue"
          >
            {{ continueButtonLabel }}
          </button>

          <ul v-if="hasContinued && waitingPlayers.length > 0" class="waiting-list">
            <li class="waiting-list__title">{{ t('reveal.waitingFor') }}</li>
            <li v-for="player in waitingPlayers" :key="player.id" class="waiting-list__item">
              <PlayerColorBadge :color-index="player.colorIndex" />
              <span>{{ player.name }}</span>
            </li>
          </ul>

          <label class="reveal__auto">
            <input v-model="autoAdvance" type="checkbox" :disabled="hasContinued" />
            <span>{{ t('reveal.autoAdvance') }}</span>
          </label>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reveal__meta {
  margin: 0 0 0.35rem;
}

.reveal__grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1rem;
}

.reveal__map {
  min-height: 360px;
}

.score-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.score-list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-bottom: 1px solid #24304d;
}

.score-list__item--self {
  background: rgba(91, 140, 255, 0.08);
  border-radius: 10px;
  border-bottom-color: transparent;
}

.score-list__name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score {
  font-size: 1.25rem;
  font-weight: 700;
  color: #8eb6ff;
}

.reveal__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.reveal__continue {
  width: 100%;
}

.waiting-list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  border-radius: 10px;
  background: #11182a;
  border: 1px solid #24304d;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.waiting-list__title {
  color: #9fb0d0;
  font-size: 0.875rem;
}

.waiting-list__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dce6ff;
}

.reveal__auto {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9fb0d0;
  font-size: 0.875rem;
  cursor: pointer;
}

@media (max-width: 900px) {
  .reveal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
