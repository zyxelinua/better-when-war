<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameSocket } from '../composables/useGameSocket'
import { getRoomCodeFromUrl } from '../utils/session'

const { t } = useI18n()
const { state, connected, createRoom, joinRoom, rejoinRoom, connect, setError, loadSession } =
  useGameSocket()

const playerName = ref('')
const roomCode = ref('')
const mode = ref<'create' | 'join'>('create')
const savedSession = ref(loadSession())

onMounted(() => {
  const urlCode = getRoomCodeFromUrl()
  if (urlCode) {
    mode.value = 'join'
    roomCode.value = urlCode
  }

  const session = loadSession()
  if (session) {
    playerName.value = session.playerName
    if (!urlCode) {
      roomCode.value = session.roomCode
      mode.value = 'join'
    }
  }
})

const errorMessage = computed(() =>
  state.error ? t(`errors.${state.error}`) : null,
)

const serverStatus = computed(() =>
  t('home.serverStatus', {
    status: connected.value ? t('home.serverConnected') : t('home.serverDisconnected'),
  }),
)

function submit() {
  const name = playerName.value.trim()
  if (!name) {
    setError('NAME_REQUIRED')
    return
  }

  connect()

  if (mode.value === 'create') {
    createRoom(name)
  } else {
    const code = roomCode.value.trim()
    if (!code) {
      setError('ROOM_CODE_REQUIRED')
      return
    }
    joinRoom(code, name)
  }
}

function rejoin() {
  const session = savedSession.value ?? loadSession()
  if (!session) return
  rejoinRoom(session)
}
</script>

<template>
  <section class="panel home">
    <div class="home__hero">
      <p class="eyebrow">{{ t('app.title') }}</p>
      <h1>{{ t('home.subtitle') }}</h1>
      <p class="muted">{{ t('home.description') }}</p>
    </div>

    <div v-if="savedSession" class="card card--rejoin">
      <p class="rejoin-text">
        {{ t('home.rejoinPrompt', { name: savedSession.playerName, code: savedSession.roomCode }) }}
      </p>
      <button class="btn btn--primary" type="button" @click="rejoin">
        {{ t('home.rejoinGame') }}
      </button>
    </div>

    <div class="card">
      <div class="tabs">
        <button
          class="tab"
          :class="{ 'tab--active': mode === 'create' }"
          type="button"
          @click="mode = 'create'"
        >
          {{ t('home.createRoom') }}
        </button>
        <button
          class="tab"
          :class="{ 'tab--active': mode === 'join' }"
          type="button"
          @click="mode = 'join'"
        >
          {{ t('home.joinByCode') }}
        </button>
      </div>

      <label class="field">
        <span>{{ t('home.playerName') }}</span>
        <input
          v-model="playerName"
          type="text"
          maxlength="20"
          :placeholder="t('home.playerNamePlaceholder')"
        />
      </label>

      <label v-if="mode === 'join'" class="field">
        <span>{{ t('home.roomCode') }}</span>
        <input v-model="roomCode" type="text" maxlength="4" placeholder="ABCD" />
      </label>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p class="muted small">{{ serverStatus }}</p>

      <button class="btn btn--primary" type="button" @click="submit">
        {{ mode === 'create' ? t('home.createGame') : t('home.joinRoom') }}
      </button>
    </div>
  </section>
</template>
