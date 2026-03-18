'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { worldToPixel } from '@/lib/coords'
import {
  MAP_IMAGES,
  PLAYER_COLORS,
  BOT_PATH_COLOR,
  BOT_PATH_WIDTH,
  HUMAN_PATH_WIDTH,
  EVENT_COLORS,
  CANVAS_SIZE,
  HEATMAP_COLORS,
} from '@/lib/constants'
import type { Player, PlayerEvent, HeatmapData } from '@/lib/types'

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const pathCanvasRef = useRef<HTMLCanvasElement>(null)
  const eventCanvasRef = useRef<HTMLCanvasElement>(null)
  const heatCanvasRef = useRef<HTMLCanvasElement>(null)

  const matchIndex = useStore((s) => s.matchIndex)
  const currentMatch = useStore((s) => s.currentMatch)
  const visiblePlayerIds = useStore((s) => s.visiblePlayerIds)
  const showBots = useStore((s) => s.showBots)
  const currentTime = useStore((s) => s.currentTime)
  const heatmapMode = useStore((s) => s.heatmapMode)
  const heatmapData = useStore((s) => s.heatmapData)
  const selectedMap = useStore((s) => s.selectedMap)
  const visibleEventTypes = useStore((s) => s.visibleEventTypes)
  const setSelectedEvent = useStore((s) => s.setSelectedEvent)

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const offsetStart = useRef({ x: 0, y: 0 })
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)

  // Determine which map to show
  const mapId = currentMatch?.map || (selectedMap !== 'all' ? selectedMap : null)

  // Load minimap background image
  useEffect(() => {
    if (!mapId) { setBgImage(null); return }
    const img = new Image()
    img.src = MAP_IMAGES[mapId] || MAP_IMAGES['AmbroseValley']
    img.onload = () => setBgImage(img)
  }, [mapId])

  // Draw background
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas || !bgImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.drawImage(bgImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }, [bgImage])

  // Draw paths and events
  useEffect(() => {
    const pathCanvas = pathCanvasRef.current
    const eventCanvas = eventCanvasRef.current
    if (!pathCanvas || !eventCanvas || !currentMatch || !mapId) return

    const pCtx = pathCanvas.getContext('2d')
    const eCtx = eventCanvas.getContext('2d')
    if (!pCtx || !eCtx) return

    pCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    eCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    let humanIdx = 0

    currentMatch.players.forEach((player: Player) => {
      const isHuman = player.human
      if (!isHuman && !showBots) return
      if (!visiblePlayerIds.has(player.id) && isHuman) return
      if (!isHuman && !visiblePlayerIds.has(player.id) && showBots) return

      // Filter events up to current time
      const visibleEvents = player.events.filter(
        (e: PlayerEvent) => e.t <= currentTime
      )
      if (visibleEvents.length === 0) return

      // Get path color
      const pathColor = isHuman
        ? PLAYER_COLORS[humanIdx % PLAYER_COLORS.length]
        : BOT_PATH_COLOR
      const pathWidth = isHuman ? HUMAN_PATH_WIDTH : BOT_PATH_WIDTH

      if (isHuman) humanIdx++

      // Draw movement path
      const posEvents = visibleEvents.filter(
        (e: PlayerEvent) => e.e === 'P' || e.e === 'BP'
      )
      if (posEvents.length > 1) {
        pCtx.beginPath()
        pCtx.strokeStyle = pathColor
        pCtx.lineWidth = pathWidth
        pCtx.lineJoin = 'round'
        pCtx.lineCap = 'round'

        const [sx, sy] = worldToPixel(posEvents[0].x, posEvents[0].z, mapId)
        pCtx.moveTo(sx, sy)

        for (let i = 1; i < posEvents.length; i++) {
          const [px, py] = worldToPixel(posEvents[i].x, posEvents[i].z, mapId)
          pCtx.lineTo(px, py)
        }
        pCtx.stroke()
      }

      // Draw current position dot for humans
      if (isHuman && posEvents.length > 0) {
        const last = posEvents[posEvents.length - 1]
        const [lx, ly] = worldToPixel(last.x, last.z, mapId)
        pCtx.beginPath()
        pCtx.arc(lx, ly, 4, 0, Math.PI * 2)
        pCtx.fillStyle = pathColor
        pCtx.fill()
        pCtx.strokeStyle = '#ffffff'
        pCtx.lineWidth = 1.5
        pCtx.stroke()
      }

      // Draw event markers
      visibleEvents.forEach((evt: PlayerEvent) => {
        if (evt.e === 'P' || evt.e === 'BP') return // skip movement
        if (!visibleEventTypes.has(evt.e)) return
        const color = EVENT_COLORS[evt.e]
        if (!color) return

        const [ex, ey] = worldToPixel(evt.x, evt.z, mapId)

        eCtx.beginPath()

        if (evt.e === 'K' || evt.e === 'BK') {
          // Kill: crosshair
          drawCrosshair(eCtx, ex, ey, 6, color)
        } else if (evt.e === 'D' || evt.e === 'BD') {
          // Death: skull/X
          drawX(eCtx, ex, ey, 5, color)
        } else if (evt.e === 'S') {
          // Storm death: diamond
          drawDiamond(eCtx, ex, ey, 6, color)
        } else if (evt.e === 'L') {
          // Loot: small square
          drawSquare(eCtx, ex, ey, 3, color)
        }
      })
    })
  }, [currentMatch, visiblePlayerIds, showBots, currentTime, mapId, visibleEventTypes])

  // Draw heatmap
  useEffect(() => {
    const canvas = heatCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    if (heatmapMode === 'off') return

    const mapKey = currentMatch?.map || (selectedMap !== 'all' ? selectedMap : null)
    if (!mapKey) return

    const data: HeatmapData | undefined = heatmapData[mapKey]
    if (!data) return

    const grid =
      heatmapMode === 'kills'
        ? data.kills
        : heatmapMode === 'deaths'
        ? data.deaths
        : heatmapMode === 'traffic'
        ? data.traffic
        : heatmapMode === 'storm'
        ? data.storm
        : data.loot

    // Find max value for normalization
    let maxVal = 0
    for (let y = 0; y < data.gridSize; y++) {
      for (let x = 0; x < data.gridSize; x++) {
        if (grid[y][x] > maxVal) maxVal = grid[y][x]
      }
    }
    if (maxVal === 0) return

    const cellSize = CANVAS_SIZE / data.gridSize
    const hue =
      heatmapMode === 'kills'
        ? 0
        : heatmapMode === 'deaths'
        ? 30
        : heatmapMode === 'traffic'
        ? 220
        : heatmapMode === 'storm'
        ? 270
        : 120

    for (let y = 0; y < data.gridSize; y++) {
      for (let x = 0; x < data.gridSize; x++) {
        const val = grid[y][x]
        if (val === 0) continue

        const intensity = Math.pow(val / maxVal, 0.4)
        const alpha = intensity * 0.85

        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }
  }, [heatmapMode, heatmapData, currentMatch, selectedMap])

  // Pan and zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((prev) => {
      const next = prev - e.deltaY * 0.001
      return Math.max(0.5, Math.min(4, next))
    })
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY }
      offsetStart.current = { ...offset }
    },
    [offset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setOffset({
          x: offsetStart.current.x + (e.clientX - panStart.current.x),
          y: offsetStart.current.y + (e.clientY - panStart.current.y),
        })
        setTooltip(null)
        return
      }

      // Hit-test player paths
      if (!currentMatch || !mapId || !containerRef.current) {
        setTooltip(null)
        return
      }

      const canvasWrapper = containerRef.current.querySelector('div')
      if (!canvasWrapper) { setTooltip(null); return }
      const rect = canvasWrapper.getBoundingClientRect()
      const mx = (e.clientX - rect.left) / scale
      const my = (e.clientY - rect.top) / scale

      const HIT_RADIUS = 8
      let found: string | null = null
      let humanIdx = 0

      for (const player of currentMatch.players) {
        const isHuman = player.human
        if (!isHuman && !showBots) continue
        if (isHuman && !visiblePlayerIds.has(player.id)) continue
        if (!isHuman && !visiblePlayerIds.has(player.id) && showBots) continue

        if (isHuman) humanIdx++

        const posEvents = player.events.filter(
          (ev: PlayerEvent) => ev.t <= currentTime && (ev.e === 'P' || ev.e === 'BP')
        )

        for (let i = 0; i < posEvents.length; i++) {
          const [px, py] = worldToPixel(posEvents[i].x, posEvents[i].z, mapId)
          const dx = mx - px
          const dy = my - py
          if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
            found = player.id
            break
          }
        }
        if (found) break
      }

      if (found) {
        const player = currentMatch.players.find((p) => p.id === found)
        const label = player ? `${player.human ? 'Human' : 'Bot'}: ${found}` : found
        setTooltip({ x: e.clientX, y: e.clientY, label })
      } else {
        setTooltip(null)
      }
    },
    [isPanning, currentMatch, mapId, scale, showBots, visiblePlayerIds, currentTime]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!currentMatch || !mapId || !containerRef.current) return

      const canvasWrapper = containerRef.current.querySelector('div')
      if (!canvasWrapper) return
      const rect = canvasWrapper.getBoundingClientRect()
      const mx = (e.clientX - rect.left) / scale
      const my = (e.clientY - rect.top) / scale

      const HIT_RADIUS = 10

      for (const player of currentMatch.players) {
        const isHuman = player.human
        if (!isHuman && !showBots) continue
        if (isHuman && !visiblePlayerIds.has(player.id)) continue
        if (!isHuman && !visiblePlayerIds.has(player.id) && showBots) continue

        const eventMarkers = player.events.filter(
          (ev: PlayerEvent) =>
            ev.t <= currentTime &&
            ev.e !== 'P' &&
            ev.e !== 'BP' &&
            visibleEventTypes.has(ev.e)
        )

        for (const evt of eventMarkers) {
          const [px, py] = worldToPixel(evt.x, evt.z, mapId)
          const dx = mx - px
          const dy = my - py
          if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
            setSelectedEvent({
              playerId: player.id,
              human: player.human,
              event: evt.e,
              x: evt.x,
              z: evt.z,
            })
            return
          }
        }
      }

      setSelectedEvent(null)
    },
    [currentMatch, mapId, scale, showBots, visiblePlayerIds, currentTime, visibleEventTypes, setSelectedEvent]
  )

  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  return (
    <div className="relative flex-1 overflow-hidden bg-[var(--bg-secondary)] rounded-lg">
      {/* Controls overlay */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button
          onClick={resetView}
          className="px-2 py-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:bg-[var(--border)] transition-colors"
        >
          Reset View
        </button>
        <span className="px-2 py-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-secondary)]">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Map name overlay */}
      {mapId && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1.5 bg-[var(--bg-primary)]/80 border border-[var(--border)] rounded text-sm font-medium">
          {mapId}
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      >
        <div
          className="relative"
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={bgCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="absolute inset-0"
          />
          <canvas
            ref={heatCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="absolute inset-0"
          />
          <canvas
            ref={pathCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="absolute inset-0"
          />
          <canvas
            ref={eventCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="absolute inset-0"
          />
        </div>
      </div>

      {/* Empty / no match state */}
      {!matchIndex && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-[var(--bg-secondary)]">
          <div className="text-center text-[var(--text-secondary)]">
            <p className="text-lg mb-1">No dataset loaded</p>
            <p className="text-sm">Upload parquet files to get started</p>
          </div>
        </div>
      )}
      {matchIndex && !currentMatch && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center text-[var(--text-secondary)]">
            <p className="text-lg mb-1">Select a match from the sidebar</p>
            <p className="text-sm">or use heatmaps to explore map-wide patterns</p>
          </div>
        </div>
      )}

      {/* Player path tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded shadow-lg text-[var(--text-primary)] pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  )
}

// --- Drawing helpers ---

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - size, y)
  ctx.lineTo(x + size, y)
  ctx.moveTo(x, y - size)
  ctx.lineTo(x, y + size)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
  ctx.stroke()
}

function drawX(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - size, y - size)
  ctx.lineTo(x + size, y + size)
  ctx.moveTo(x + size, y - size)
  ctx.lineTo(x - size, y + size)
  ctx.stroke()
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x + size, y)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x - size, y)
  ctx.closePath()
  ctx.fill()
}

function drawSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color
  ctx.globalAlpha = 0.7
  ctx.fillRect(x - size, y - size, size * 2, size * 2)
  ctx.globalAlpha = 1
}
