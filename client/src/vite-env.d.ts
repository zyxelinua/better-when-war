/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string
  readonly VITE_PANORAMAS_URL: string
  readonly VITE_ASSETS_BASE_URL: string
  readonly VITE_MAP_STYLE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@maplibre/maplibre-gl-leaflet' {
  import type { Map, MapOptions } from 'leaflet'

  interface MapLibreGLOptions {
    style: string
  }

  function maplibreGL(options: MapLibreGLOptions): Map

  export default maplibreGL
}

declare namespace L {
  function maplibreGL(options: { style: string }): L.Layer
}
