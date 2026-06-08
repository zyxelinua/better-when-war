<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchWikipediaSummary } from '@shared/wikipedia'
import type { AppLocale } from '@shared/types'

const props = defineProps<{
  urls?: Partial<Record<AppLocale, string>>
}>()

const { locale, t } = useI18n()
const loading = ref(false)
const summary = ref<Awaited<ReturnType<typeof fetchWikipediaSummary>>>(null)

const articleUrl = computed(() => {
  const urls = props.urls ?? {}
  const current = urls[locale.value as AppLocale]
  if (current?.trim()) return current
  if (urls.en?.trim()) return urls.en
  if (urls.ru?.trim()) return urls.ru
  return null
})

watch(
  articleUrl,
  async (url) => {
    summary.value = null
    if (!url?.trim()) return

    loading.value = true
    try {
      summary.value = await fetchWikipediaSummary(url, locale.value as AppLocale)
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="articleUrl" class="wiki-preview">
    <a
      class="wiki-preview__link"
      :href="summary?.articleUrl ?? articleUrl"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div v-if="loading" class="wiki-preview__loading">{{ t('reveal.wikiLoading') }}</div>
      <template v-else-if="summary">
        <img
          v-if="summary.thumbnailUrl"
          class="wiki-preview__image"
          :src="summary.thumbnailUrl"
          :alt="summary.title"
          loading="lazy"
        />
        <div class="wiki-preview__content">
          <p class="wiki-preview__title">{{ summary.title }}</p>
          <p v-if="summary.description" class="wiki-preview__description">{{ summary.description }}</p>
        </div>
      </template>
      <p v-else class="wiki-preview__fallback">{{ t('reveal.wikiOpen') }}</p>
    </a>
  </div>
</template>

<style scoped>
.wiki-preview {
  margin-top: 1rem;
}

.wiki-preview__link {
  display: flex;
  gap: 0.875rem;
  padding: 0.875rem;
  border-radius: 12px;
  border: 1px solid #24304d;
  background: #11182a;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.wiki-preview__link:hover {
  border-color: #5b8cff;
  transform: translateY(-1px);
}

.wiki-preview__image {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.wiki-preview__content {
  min-width: 0;
}

.wiki-preview__title {
  margin: 0 0 0.35rem;
  font-weight: 700;
  color: #dce6ff;
}

.wiki-preview__description {
  margin: 0;
  font-size: 0.875rem;
  color: #9fb0d0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wiki-preview__loading,
.wiki-preview__fallback {
  margin: 0;
  color: #9fb0d0;
  font-size: 0.875rem;
}
</style>
