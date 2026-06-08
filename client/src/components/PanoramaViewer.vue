<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps<{
  imageUrl: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let panoramaMesh: THREE.Mesh | null = null
let animationId = 0
let currentTexture: THREE.Texture | null = null
let resizeObserver: ResizeObserver | null = null
let loadGeneration = 0

function removeRendererCanvas() {
  const container = containerRef.value
  if (!container || !renderer) return
  if (renderer.domElement.parentElement === container) {
    container.removeChild(renderer.domElement)
  }
}

function dispose() {
  cancelAnimationFrame(animationId)
  loadGeneration += 1

  resizeObserver?.disconnect()
  resizeObserver = null

  controls?.dispose()
  controls = null

  if (panoramaMesh) {
    panoramaMesh.geometry.dispose()
    const material = panoramaMesh.material
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose())
    } else {
      material.dispose()
    }
    panoramaMesh = null
  }

  currentTexture?.dispose()
  currentTexture = null

  removeRendererCanvas()
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
}

function resize() {
  const container = containerRef.value
  if (!container || !camera || !renderer) return

  const width = container.clientWidth
  const height = container.clientHeight
  if (width <= 0 || height <= 0) return

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function init() {
  const container = containerRef.value
  if (!container) return

  dispose()

  const generation = loadGeneration

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
  camera.position.set(0, 0, 0.1)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)
  resize()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.enablePan = false
  controls.rotateSpeed = -0.25
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  const loader = new THREE.TextureLoader()
  loader.load(
    props.imageUrl,
    (texture) => {
      if (generation !== loadGeneration || !scene) return

      currentTexture?.dispose()
      currentTexture = texture
      texture.colorSpace = THREE.SRGBColorSpace

      if (panoramaMesh) {
        scene.remove(panoramaMesh)
        panoramaMesh.geometry.dispose()
        ;(panoramaMesh.material as THREE.Material).dispose()
        panoramaMesh = null
      }

      const geometry = new THREE.SphereGeometry(500, 64, 32)
      geometry.scale(-1, 1, 1)
      const material = new THREE.MeshBasicMaterial({ map: texture })
      panoramaMesh = new THREE.Mesh(geometry, material)
      scene.add(panoramaMesh)
    },
    undefined,
    () => {
      console.error('Failed to load panorama:', props.imageUrl)
    },
  )

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls?.update()
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }
  animate()

  resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(container)
}

watch(
  () => props.imageUrl,
  () => init(),
)

onMounted(() => init())
onUnmounted(() => dispose())
</script>

<template>
  <div ref="containerRef" class="panorama-viewer" />
</template>

<style scoped>
.panorama-viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0b1020;
}

.panorama-viewer :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
