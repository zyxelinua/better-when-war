const MAX_SCORE = 5000
const YEAR_PENALTY_PER_YEAR = 50
const YEAR_WEIGHT = 0.4
const LOCATION_WEIGHT = 0.6

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadius = 6_371_000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function scoreYear(guessYear: number, correctYear: number): number {
  const diff = Math.abs(guessYear - correctYear)
  return Math.max(0, MAX_SCORE - diff * YEAR_PENALTY_PER_YEAR)
}

export function scoreLocation(
  guessLat: number,
  guessLng: number,
  correctLat: number,
  correctLng: number,
): number {
  const distanceMeters = haversineDistance(guessLat, guessLng, correctLat, correctLng)
  if (distanceMeters < 25) return MAX_SCORE
  return Math.round(MAX_SCORE * Math.exp(-distanceMeters / 1_500_000))
}

export function totalRoundScore(yearScore: number, locationScore: number): number {
  return Math.round(yearScore * YEAR_WEIGHT + locationScore * LOCATION_WEIGHT)
}

export function getYearDiff(guessYear: number, correctYear: number): number {
  return Math.abs(guessYear - correctYear)
}
