/**
 * Vector map style based on the OpenMapTiles schema.
 * Default: OpenFreeMap Liberty (free, no API key).
 * Override with VITE_MAP_STYLE_URL, e.g. MapTiler OpenMapTiles style:
 * https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY
 *
 * @see https://openmaptiles.org/
 */
export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty'

export const MAP_ATTRIBUTION =
  '© <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
