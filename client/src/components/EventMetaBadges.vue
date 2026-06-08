<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PanoramaEpoch, PanoramaEventType } from '@shared/types'

defineProps<{
  epoch: PanoramaEpoch
  eventType: PanoramaEventType
}>()

const { t } = useI18n()
</script>

<template>
  <div class="event-meta">
    <span class="event-meta__badge event-meta__badge--epoch">
      {{ t(`epochs.${epoch}`) }}
    </span>
    <span class="event-meta__badge event-meta__badge--type">
      {{ t(`eventTypes.${eventType}`) }}
    </span>
  </div>
</template>

<style scoped>
.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0 0;
}

.event-meta__badge {
  display: inline-flex;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.event-meta__badge--epoch {
  background: rgba(91, 140, 255, 0.15);
  color: #9ec2ff;
  border: 1px solid rgba(91, 140, 255, 0.35);
}

.event-meta__badge--type {
  background: rgba(255, 210, 122, 0.12);
  color: #ffd27a;
  border: 1px solid rgba(255, 210, 122, 0.3);
}
</style>
