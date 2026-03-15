'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { loadData } from '@/lib/storage'
import StatsHeader from '@/components/StatsHeader'
import MapCanvas from '@/components/MapCanvas'
import Sidebar from '@/components/Sidebar'
import TimelineBar from '@/components/TimelineBar'
import Legend from '@/components/Legend'
import UploadZone from '@/components/UploadZone'

export default function Home() {
  const uploading = useStore((s) => s.uploading)
  const setMatchIndex = useStore((s) => s.setMatchIndex)
  const setMatchDataMap = useStore((s) => s.setMatchDataMap)
  const setAllHeatmapData = useStore((s) => s.setAllHeatmapData)

  // Load persisted data from IndexedDB on mount
  useEffect(() => {
    loadData().then((data) => {
      if (data) {
        console.log('Loaded data from IndexedDB:', data.matchIndex.stats.totalMatches, 'matches')
        setMatchIndex(data.matchIndex)
        setMatchDataMap(data.matchDataMap)
        setAllHeatmapData(data.heatmapData)
      } else {
        console.log('No saved data found in IndexedDB')
      }
    }).catch((err) => console.error('Failed to load from IndexedDB:', err))
  }, [setMatchIndex, setMatchDataMap, setAllHeatmapData])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatsHeader />

      <div className="flex-1 flex overflow-hidden">
        <MapCanvas />
        <Sidebar />
      </div>

      <Legend />
      <TimelineBar />

      {/* Upload modal */}
      <UploadZone />

      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-6 py-4 text-sm">
            Parsing parquet files...
          </div>
        </div>
      )}
    </div>
  )
}
