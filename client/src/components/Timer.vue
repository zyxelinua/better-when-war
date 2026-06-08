<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  remainingMs: number
}>()

const seconds = computed(() => Math.ceil(props.remainingMs / 1000))
const warning = computed(() => props.remainingMs <= 10_000 && props.remainingMs > 5_000)
const critical = computed(() => props.remainingMs <= 5_000)
const label = computed(() => t('game.timerSeconds', { seconds: seconds.value }))
</script>

<template>
  <div
    class="timer"
    :class="{
      'timer--warning': warning,
      'timer--critical': critical,
    }"
  >
    {{ label }}
  </div>
</template>

<style scoped>
.timer {
  min-width: 4.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(15, 22, 38, 0.85);
  border: 1px solid #2f3f66;
  color: #f4f7ff;
  font-size: 1.125rem;
  font-weight: 700;
  text-align: center;
  backdrop-filter: blur(8px);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.timer--warning {
  border-color: #e6b422;
  color: #ffe08a;
  background: rgba(58, 44, 8, 0.9);
}

.timer--critical {
  border-color: #ff4d4d;
  color: #fff;
  background: rgba(120, 24, 24, 0.92);
  animation: pulse 0.8s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}
</style>
