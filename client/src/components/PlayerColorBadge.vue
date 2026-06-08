<script setup lang="ts">
import { computed } from 'vue'
import { getPlayerColor } from '@shared/playerColors'

const props = defineProps<{
  colorIndex: number
  size?: 'sm' | 'md'
}>()

const color = computed(() => getPlayerColor(props.colorIndex))
</script>

<template>
  <span
    class="player-color-badge"
    :class="`player-color-badge--${size ?? 'md'}`"
    :style="{ background: color.main, color: color.contrast }"
    aria-hidden="true"
  />
</template>

<style scoped>
.player-color-badge {
  display: inline-block;
  border-radius: 999px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.player-color-badge--sm {
  width: 10px;
  height: 10px;
}

.player-color-badge--md {
  width: 14px;
  height: 14px;
}
</style>
