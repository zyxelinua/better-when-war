export const PANORAMA_EPOCHS = ['antiquity', 'medieval', 'modern'] as const
export type PanoramaEpoch = (typeof PANORAMA_EPOCHS)[number]

export const PANORAMA_EVENT_TYPES = [
  'battle',
  'science',
  'religion',
  'politics',
  'culture',
] as const
export type PanoramaEventType = (typeof PANORAMA_EVENT_TYPES)[number]
