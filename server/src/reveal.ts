import type { Panorama, RoundRevealInfo } from '../../shared/types.js'

export function toRoundRevealInfo(panorama: Panorama): RoundRevealInfo {
  return {
    title: panorama.title,
    year: panorama.year,
    date: panorama.date,
    place: panorama.place,
    location: panorama.location,
    wikipedia: panorama.wikipedia,
    epoch: panorama.epoch,
    eventType: panorama.eventType,
  }
}
