export interface PlayerColor {
  main: string
  contrast: string
}

export const PLAYER_COLORS: readonly PlayerColor[] = [
  { main: '#5B8CFF', contrast: '#FFFFFF' },
  { main: '#FF7B7B', contrast: '#FFFFFF' },
  { main: '#7DFFB2', contrast: '#0D2818' },
  { main: '#FFD27A', contrast: '#1D2B48' },
] as const

export function getPlayerColor(colorIndex: number): PlayerColor {
  return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length] ?? PLAYER_COLORS[0]
}
