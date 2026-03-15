import { MAP_CONFIG, CANVAS_SIZE } from './constants'

export function worldToPixel(
  x: number,
  z: number,
  mapId: string
): [number, number] {
  const cfg = MAP_CONFIG[mapId]
  if (!cfg) return [0, 0]

  const u = (x - cfg.originX) / cfg.scale
  const v = (z - cfg.originZ) / cfg.scale

  const px = u * CANVAS_SIZE
  const py = (1 - v) * CANVAS_SIZE

  return [px, py]
}
