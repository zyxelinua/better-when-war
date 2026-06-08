<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@maplibre/maplibre-gl-leaflet'
import { getPlayerColor } from '@shared/playerColors'
import { MAP_ATTRIBUTION, MAP_STYLE_URL } from '../config/mapStyle'

export interface MapGuessMarker {
  lat: number
  lng: number
  label?: string
  colorIndex?: number
}

const props = defineProps<{
  lat: number | null
  lng: number | null
  readonly?: boolean
  answer?: MapGuessMarker | null
  guesses?: MapGuessMarker[]
}>()

const emit = defineEmits<{
  select: [lat: number, lng: number]
}>()

const mapRef = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null
let answerMarker: L.Marker | null = null
const guessMarkers: L.Marker[] = []
let resizeObserver: ResizeObserver | null = null

function createIcon(main: string, contrast: string, symbol: string) {
  return L.divIcon({
    className: 'map-marker map-marker--custom',
    html: `<span style="background:${main};color:${contrast}">${symbol}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function updateSelectionMarker(lat: number | null, lng: number | null) {
  if (!map) return

  if (lat === null || lng === null) {
    marker?.remove()
    marker = null
    return
  }

  const color = getPlayerColor(0)
  if (!marker) {
    marker = L.marker([lat, lng], { icon: createIcon(color.main, color.contrast, '●') }).addTo(map)
  } else {
    marker.setLatLng([lat, lng])
  }
}

function clearGuessMarkers() {
  for (const guessMarker of guessMarkers) {
    guessMarker.remove()
  }
  guessMarkers.length = 0
}

function updateRevealMarkers() {
  if (!map) return

  answerMarker?.remove()
  answerMarker = null
  clearGuessMarkers()

  const points: L.LatLngExpression[] = []

  if (props.answer) {
    answerMarker = L.marker([props.answer.lat, props.answer.lng], {
      icon: createIcon('#7dffb2', '#0d2818', '★'),
    }).addTo(map)
    if (props.answer.label) {
      answerMarker.bindTooltip(props.answer.label, { permanent: false, direction: 'top' })
    }
    points.push([props.answer.lat, props.answer.lng])
  }

  for (const guess of props.guesses ?? []) {
    const color = getPlayerColor(guess.colorIndex ?? 0)
    const guessMarker = L.marker([guess.lat, guess.lng], {
      icon: createIcon(color.main, color.contrast, '●'),
    }).addTo(map)
    if (guess.label) {
      guessMarker.bindTooltip(guess.label, { permanent: false, direction: 'top' })
    }
    guessMarkers.push(guessMarker)
    points.push([guess.lat, guess.lng])
  }

  if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 8 })
  } else if (points.length === 1) {
    map.setView(points[0], Math.max(map.getZoom(), 4))
  }
}

onMounted(() => {
  if (!mapRef.value) return

  map = L.map(mapRef.value, {
    center: [30, 10],
    zoom: 2,
    worldCopyJump: true,
    attributionControl: true,
  })

  map.attributionControl.setPrefix(false)
  map.attributionControl.addAttribution(MAP_ATTRIBUTION)

  L.maplibreGL({
    style: MAP_STYLE_URL,
  }).addTo(map)

  if (!props.readonly) {
    map.on('click', (event: L.LeafletMouseEvent) => {
      emit('select', event.latlng.lat, event.latlng.lng)
    })
    updateSelectionMarker(props.lat, props.lng)
  } else {
    updateRevealMarkers()
  }

  resizeObserver = new ResizeObserver(() => {
    map?.invalidateSize()
  })
  resizeObserver.observe(mapRef.value)
})

watch(
  () => [props.lat, props.lng] as const,
  ([lat, lng]) => {
    if (!props.readonly) {
      updateSelectionMarker(lat, lng)
    }
  },
)

watch(
  () => [props.answer, props.guesses] as const,
  () => {
    if (props.readonly) {
      updateRevealMarkers()
    }
  },
  { deep: true },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  answerMarker?.remove()
  clearGuessMarkers()
  map?.remove()
  map = null
  marker = null
  answerMarker = null
})
</script>

<template>
  <div ref="mapRef" class="guess-map" />
</template>

<style scoped>
.guess-map {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.guess-map :deep(.map-marker--custom span) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.guess-map :deep(.leaflet-control-attribution) {
  font-size: 10px;
  background: rgba(15, 22, 38, 0.85);
  color: #9fb0d0;
}
</style>
