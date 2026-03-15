'use client'

import { EVENT_COLORS } from '@/lib/constants'

const legendItems = [
  { label: 'Kill', color: EVENT_COLORS.K, shape: 'crosshair' },
  { label: 'Death', color: EVENT_COLORS.D, shape: 'x' },
  { label: 'Bot Kill', color: EVENT_COLORS.BK, shape: 'crosshair' },
  { label: 'Bot Death', color: EVENT_COLORS.BD, shape: 'x' },
  { label: 'Storm Death', color: EVENT_COLORS.S, shape: 'diamond' },
  { label: 'Loot', color: EVENT_COLORS.L, shape: 'square' },
]

export default function Legend() {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
      <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wide">
        Legend:
      </span>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <ShapeIcon shape={item.shape} color={item.color} />
          <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-2">
        <div className="w-6 h-0.5 bg-cyan-400 rounded" />
        <span className="text-xs text-[var(--text-secondary)]">Human Path</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-0.5 bg-gray-500 rounded opacity-50" />
        <span className="text-xs text-[var(--text-secondary)]">Bot Path</span>
      </div>
    </div>
  )
}

function ShapeIcon({ shape, color }: { shape: string; color: string }) {
  const size = 12
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {shape === 'crosshair' && (
        <>
          <line x1={2} y1={6} x2={10} y2={6} stroke={color} strokeWidth={1.5} />
          <line x1={6} y1={2} x2={6} y2={10} stroke={color} strokeWidth={1.5} />
          <circle cx={6} cy={6} r={3} stroke={color} fill="none" strokeWidth={1} />
        </>
      )}
      {shape === 'x' && (
        <>
          <line x1={2} y1={2} x2={10} y2={10} stroke={color} strokeWidth={1.5} />
          <line x1={10} y1={2} x2={2} y2={10} stroke={color} strokeWidth={1.5} />
        </>
      )}
      {shape === 'diamond' && (
        <polygon points="6,1 11,6 6,11 1,6" fill={color} />
      )}
      {shape === 'square' && <rect x={2} y={2} width={8} height={8} fill={color} opacity={0.7} />}
    </svg>
  )
}
