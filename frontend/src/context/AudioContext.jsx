import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { API_URL } from '../config'

const AudioContext = createContext(null)

export function AudioProvider({ children }) {
  const audioRef = useRef(null)
  const [enabled, setEnabled] = useState(() => localStorage.getItem('ambient_audio_enabled') !== 'false')
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(135)
  const [volume, setVolume] = useState(80)
  const [track, setTrack] = useState(null)

  useEffect(() => {
    const loadCatalogAudio = async () => {
      try {
        const response = await fetch(`${API_URL}/audios`)
        if (!response.ok) throw new Error('Audio catalogue unavailable')
        const { audios = [] } = await response.json()
        if (!audios.length) return
        const selectedId = localStorage.getItem('ambient_audio_id')
        const selectedTrack = audios.find(audio => audio.id === selectedId) || audios[0]
        setTrack(selectedTrack)
      } catch {
        setTrack(null)
      }
    }
    loadCatalogAudio()
  }, [])

  useEffect(() => {
    if (!track?.audio_url) return undefined
    localStorage.setItem('ambient_audio_id', track.id)
    const audio = new Audio(track.audio_url)
    audio.loop = true
    audio.volume = volume / 100
    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setDuration(audio.duration)
      }
    }
    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)
    audio.onended = () => setIsPlaying(false)
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [track])

  useEffect(() => {
    localStorage.setItem('ambient_audio_enabled', String(enabled))
    const audio = audioRef.current
    if (!audio) return
    if (!enabled) audio.pause()
    else if (isPlaying) audio.play().catch(() => {})
  }, [enabled, isPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  const toggle = () => setEnabled((current) => !current)
  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio || !enabled) return
    if (audio.paused) {
      audio.play().then(() => {
        const token = localStorage.getItem('auth_token')
        if (token && track?.id) fetch(`${API_URL}/audios/${track.id}/play`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
      }).catch(() => {})
    }
    else audio.pause()
  }
  const seek = (percentage) => {
    setProgress(percentage)
    if (audioRef.current?.duration) audioRef.current.currentTime = (percentage / 100) * audioRef.current.duration
  }

  return (
    <AudioContext.Provider value={{ enabled, isPlaying, progress, duration, volume, track, setVolume, toggle, togglePlayback, seek }}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) throw new Error('useAudio must be used inside AudioProvider')
  return context
}
