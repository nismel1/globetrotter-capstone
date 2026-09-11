import React from 'react'
import { useAudio } from '../context/AudioContext'

function AudioPlayer({ title = "Ambiance sonore : Lagune & Sons de Libreville" }) {
  const { enabled, isPlaying, progress, duration, volume, track, setVolume, togglePlayback, seek } = useAudio()

  const formatTime = (percentage) => {
    const totalSeconds = duration || 135
    const currentSeconds = Math.floor((percentage / 100) * totalSeconds)
    const mins = Math.floor(currentSeconds / 60)
    const secs = currentSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e) => {
    const clickX = e.nativeEvent.offsetX
    const width = e.currentTarget.clientWidth
    const newPercent = (clickX / width) * 100
    seek(newPercent)
  }

  if (!enabled || !track) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 64px)',
      maxWidth: '1000px',
      height: '64px',
      background: 'rgba(17, 26, 22, 0.94)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(164, 189, 1, 0.3)',
      borderRadius: '32px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 900,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(164, 189, 1, 0.15)',
    }}>
      {/* Left: Play button & Track Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={togglePlayback}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#A4BD01',
            color: '#02202E',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 0 12px rgba(164, 189, 1, 0.4)',
            transition: 'transform 0.2s ease',
          }}
          title={isPlaying ? 'Mettre en pause' : 'Lancer l\'ambiance sonore'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            color: '#A4BD01',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            AMBIANCE SONORE PERSISTANTE
          </div>
          <div style={{
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            color: '#EBF2FA',
          }}>
            {track.title || title}
          </div>
        </div>
      </div>

      {/* Center: Interactive Waveform Visualizer & Seek bar */}
      <div
        onClick={handleSeek}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          flex: 1,
          maxWidth: '300px',
          margin: '0 32px',
          height: '24px',
          cursor: 'pointer',
        }}
      >
        {[40, 70, 30, 90, 50, 100, 60, 80, 45, 95, 35, 75, 55, 85, 40, 60, 90, 30, 70, 100, 50, 80].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${isPlaying ? Math.max(15, (h * (i % 2 === 0 ? 0.9 : 1.1))) : 20}%`,
              background: i / 22 < progress / 100 ? '#A4BD01' : 'rgba(239, 230, 211, 0.2)',
              borderRadius: '2px',
              transition: 'height 0.2s ease, background 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* Right: Time & Volume Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: '#427AA1',
        }}>
          {formatTime(progress)} / {formatTime(100)}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#427AA1' }}>🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              width: '70px',
              accentColor: '#A4BD01',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
