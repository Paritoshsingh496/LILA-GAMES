'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'

export function usePlayback() {
  const isPlaying = useStore((s) => s.isPlaying)
  const playbackSpeed = useStore((s) => s.playbackSpeed)
  const maxTime = useStore((s) => s.maxTime)
  const currentTime = useStore((s) => s.currentTime)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const setIsPlaying = useStore((s) => s.setIsPlaying)

  const lastFrameTime = useRef<number>(0)
  const animRef = useRef<number>(0)
  const currentTimeRef = useRef(currentTime)

  // Keep ref in sync
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const tick = useCallback(
    (now: number) => {
      if (lastFrameTime.current === 0) {
        lastFrameTime.current = now
      }

      const delta = now - lastFrameTime.current
      lastFrameTime.current = now

      const advance = delta * playbackSpeed * 3
      const next = currentTimeRef.current + advance

      if (next >= maxTime) {
        setCurrentTime(maxTime)
        setIsPlaying(false)
        return
      }

      setCurrentTime(next)
      animRef.current = requestAnimationFrame(tick)
    },
    [playbackSpeed, maxTime, setCurrentTime, setIsPlaying]
  )

  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = 0
      animRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(animRef.current)
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, tick])
}
