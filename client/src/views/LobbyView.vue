<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PlayerColorBadge from '../components/PlayerColorBadge.vue'
import { useGameSocket } from '../composables/useGameSocket'

const { t } = useI18n()
const { state, setReady, startGame } = useGameSocket()

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const room = computed(() => state.room)
const isHost = computed(() => room.value?.hostId === room.value?.playerId)
const allReady = computed(
  () => room.value?.players.every((player) => player.ready) && (room.value?.players.length ?? 0) >= 1,
)
const currentPlayer = computed(() =>
  room.value?.players.find((player) => player.id === room.value?.playerId),
)

async function copyRoomCode() {
  if (!room.value) return

  const code = room.value.code

  try {
    await navigator.clipboard.writeText(code)
  } catch {
    const input = document.createElement('textarea')
    input.value = code
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  }

  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <section v-if="room" class="panel lobby">
    <div class="lobby__header">
      <div>
        <p class="eyebrow">{{ t('lobby.title') }}</p>
        <h1 class="lobby__code-row">
          <span>
            {{ t('lobby.roomCodeLabel') }}
            <span class="code">{{ room.code }}</span>
          </span>
          <button
            v-if="isHost"
            class="btn btn--copy"
            type="button"
            :title="t('lobby.copyCode')"
            @click="copyRoomCode"
          >
            {{ copied ? t('lobby.codeCopied') : t('lobby.copyCode') }}
          </button>
        </h1>
      </div>
      <p class="muted">
        {{ t('lobby.meta', { rounds: room.totalRounds, seconds: 60 }) }}
      </p>
    </div>

    <div class="card">
      <h2>{{ t('lobby.players', { count: room.players.length }) }}</h2>
      <ul class="player-list">
        <li v-for="player in room.players" :key="player.id" class="player-list__item">
          <span class="player-list__name">
            <PlayerColorBadge :color-index="player.colorIndex" size="sm" />
            {{ player.name }}
            <span v-if="player.id === room.hostId" class="badge">{{ t('lobby.host') }}</span>
            <span v-if="player.id === room.playerId" class="badge badge--you">{{ t('lobby.you') }}</span>
            <span v-if="!player.connected" class="badge badge--offline">{{ t('lobby.offline') }}</span>
          </span>
          <span :class="player.ready ? 'ready' : 'waiting'">
            {{ player.ready ? t('lobby.ready') : t('lobby.waiting') }}
          </span>
        </li>
      </ul>

      <div class="lobby__actions">
        <button class="btn" type="button" @click="setReady(!currentPlayer?.ready)">
          {{ currentPlayer?.ready ? t('lobby.notReady') : t('lobby.ready') }}
        </button>

        <button
          v-if="isHost"
          class="btn btn--primary"
          type="button"
          :disabled="!allReady"
          @click="startGame"
        >
          {{ t('lobby.startGame') }}
        </button>
      </div>

      <p v-if="isHost && !allReady" class="muted small">{{ t('lobby.allMustReady') }}</p>
    </div>
  </section>
</template>
