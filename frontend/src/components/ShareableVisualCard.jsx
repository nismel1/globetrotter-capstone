import React, { useRef, useState } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, ShareIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function ShareableVisualCard({ itinerary, place, onClose }) {
  const cardRef = useRef(null)
  const [copied, setCopied] = useState(false)

  const title = itinerary?.title || place?.name || 'Mon Voyage à Libreville, Gabon'
  const image = place?.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
  const duration = itinerary ? `${itinerary.days?.length || 1} Jours` : 'Incontournable'
  const location = place?.city || 'Libreville & Estuaire'

  const handleShareLink = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Découvrez ${title} sur Globetrotter LBV`,
          text: `Regardez mon itinéraire pour Libreville !`,
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (e) {}
  }

  const handleDownloadImage = () => {
    // Create canvas snapshot representation
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 400
    const ctx = canvas.getContext('2d')

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 600, 400)
    gradient.addColorStop(0, '#02202E')
    gradient.addColorStop(1, '#02202E')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 600, 400)

    // Border
    ctx.strokeStyle = '#A4BD01'
    ctx.lineWidth = 4
    ctx.strokeRect(12, 12, 576, 376)

    // Text Title
    ctx.fillStyle = '#A4BD01'
    ctx.font = 'bold 16px monospace'
    ctx.fillText('GLOBETROTTER LBV • GABON', 36, 50)

    ctx.fillStyle = '#EBF2FA'
    ctx.font = 'bold 26px Georgia'
    ctx.fillText(title.slice(0, 32), 36, 95)

    ctx.fillStyle = '#427AA1'
    ctx.font = '14px sans-serif'
    ctx.fillText(`📍 ${location} | ⏱️ ${duration}`, 36, 125)

    // Footer badge
    ctx.fillStyle = 'rgba(164, 189, 1, 0.2)'
    ctx.fillRect(36, 310, 528, 48)
    ctx.fillStyle = '#A4BD01'
    ctx.font = '13px monospace'
    ctx.fillText('🌍 Explorer le patrimoine & la culture du Gabon', 50, 340)

    // Trigger download
    const link = document.createElement('a')
    link.download = `globetrotter_carte_${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2200,
      }}
    >
      <div
        style={{
          background: '#02202E',
          border: '2px solid #A4BD01',
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '520px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#427AA1',
            cursor: 'pointer',
          }}
        >
          <XMarkIcon style={{ width: '24px', height: '24px' }} />
        </button>

        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#A4BD01', marginBottom: '16px' }}>
          🎴 Carte Visuelle Partageable
        </div>

        {/* Postcard Graphic Container */}
        <div
          ref={cardRef}
          style={{
            background: 'linear-gradient(135deg, #02202E 0%, #02202E 100%)',
            border: '1px solid rgba(164, 189, 1, 0.4)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            marginBottom: '20px',
          }}
        >
          <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
            <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,20,17,0.9), transparent)' }} />
            <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(164, 189, 1, 0.9)', color: '#02202E', padding: '4px 10px', borderRadius: '20px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 'bold' }}>
              🇬🇦 Globetrotter LBV
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', color: '#EBF2FA', margin: 0 }}>
              {title}
            </h3>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', marginTop: '6px' }}>
              📍 {location} • ⏱️ {duration}
            </div>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', color: '#427AA1', marginTop: '8px' }}>
              Voyage au cœur de Libreville : expérience culturelle, gourmande et naturelle d'exception.
            </p>

            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(164, 189, 1, 0.1)', borderRadius: '8px', border: '1px dashed rgba(164, 189, 1, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01' }}>
                QR CODE VÉRIFIÉ GLOBETROTTER
              </span>
              <span style={{ fontSize: '16px' }}>📱✨</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDownloadImage}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(135deg, #A4BD01 0%, #679436 100%)',
              color: '#02202E',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ArrowDownTrayIcon style={{ width: '16px', height: '16px' }} /> Télécharger Image
          </button>

          <button
            onClick={handleShareLink}
            style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(2, 32, 46, 0.8)',
              border: '1px solid rgba(164, 189, 1, 0.4)',
              color: '#EBF2FA',
              borderRadius: '8px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {copied ? <CheckIcon style={{ width: '16px', height: '16px', color: '#679436' }} /> : <ShareIcon style={{ width: '16px', height: '16px' }} />}
            {copied ? 'Lien Copié !' : 'Partager'}
          </button>
        </div>
      </div>
    </div>
  )
}
