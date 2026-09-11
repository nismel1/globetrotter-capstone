import React, { useState } from 'react'

const HERITAGE_SPOTS = [
  {
    id: 'spot-1',
    name: 'Cathédrale Sainte-Marie de Libreville',
    yearBefore: '1950',
    yearAfter: '2026',
    imgBefore: 'https://images.unsplash.com/photo-1548625361-1858a7354964?auto=format&fit=crop&w=800&q=80', // Archival feel
    imgAfter: 'https://images.unsplash.com/photo-1548625110-85f20387ff5f?auto=format&fit=crop&w=800&q=80', // Modern view
    history: 'Inaugurée au XIXe siècle, la cathédrale Sainte-Marie est un joyau du patrimoine architectural de l\'Estuaire.',
  },
  {
    id: 'spot-2',
    name: 'Boulevard Triomphal Omar Bongo',
    yearBefore: '1975',
    yearAfter: '2026',
    imgBefore: 'https://images.unsplash.com/photo-1477959858617-67f30ac4ce78?auto=format&fit=crop&w=800&q=80',
    imgAfter: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    history: 'Axe majeur de Libreville reliant les grands ministères et l\'Assemblée Nationale.',
  },
  {
    id: 'spot-3',
    name: 'Le Bord de Mer & Sainte-Marie',
    yearBefore: '1960',
    yearAfter: '2026',
    imgBefore: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    imgAfter: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
    history: 'La corniche de Libreville autrefois bordée de cocotiers sauvages, devenue une esplanade prisée.',
  },
]

export default function BeforeAfterSlider() {
  const [selectedSpot, setSelectedSpot] = useState(HERITAGE_SPOTS[0])
  const [sliderPos, setSliderPos] = useState(50) // percentage 0 to 100

  return (
    <div
      style={{
        background: 'rgba(2, 32, 46, 0.85)',
        border: '1px solid rgba(164, 189, 1, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        marginBottom: '28px',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.1em' }}>
          🏛️ PATRIMOINE HISTORIQUE DU GABON
        </div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 'bold', color: '#EBF2FA', marginTop: '2px' }}>
          Curseur Avant / Après Patrimoine
        </h3>
        <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '13px', color: '#427AA1', marginTop: '4px' }}>
          Faites glisser le curseur pour explorer l'évolution urbaine et historique des lieux emblématiques de Libreville.
        </p>
      </div>

      {/* Spot Selector Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
        {HERITAGE_SPOTS.map((spot) => (
          <button
            key={spot.id}
            onClick={() => { setSelectedSpot(spot); setSliderPos(50); }}
            style={{
              background: selectedSpot.id === spot.id ? '#A4BD01' : 'rgba(0, 0, 0, 0.4)',
              color: selectedSpot.id === spot.id ? '#02202E' : '#EBF2FA',
              border: selectedSpot.id === spot.id ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {spot.name}
          </button>
        ))}
      </div>

      {/* Interactive Slider Frame */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '380px',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(164, 189, 1, 0.4)',
          userSelect: 'none',
        }}
      >
        {/* Modern Image (After - Base) */}
        <img
          src={selectedSpot.imgAfter}
          alt={selectedSpot.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Historical Image Overlay (Before - Clipped) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${sliderPos}%`,
            overflow: 'hidden',
            filter: 'sepia(0.6) contrast(1.1)',
          }}
        >
          <img
            src={selectedSpot.imgBefore}
            alt={selectedSpot.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none' }}
          />
        </div>

        {/* Labels */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0, 0, 0, 0.75)', color: '#A4BD01', border: '1px solid #A4BD01', padding: '4px 10px', borderRadius: '6px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 'bold' }}>
          📷 AVANT ({selectedSpot.yearBefore})
        </div>

        <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0, 0, 0, 0.75)', color: '#679436', border: '1px solid #679436', padding: '4px 10px', borderRadius: '6px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 'bold' }}>
          📸 APRÈS ({selectedSpot.yearAfter})
        </div>

        {/* Vertical Divider Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${sliderPos}%`,
            width: '3px',
            background: '#A4BD01',
            boxShadow: '0 0 10px #A4BD01',
            transform: 'translateX(-50%)',
          }}
        >
          {/* Handle knob */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#A4BD01',
              color: '#02202E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: '0 0 12px rgba(0,0,0,0.5)',
            }}
          >
            ↔
          </div>
        </div>

        {/* Native Range Input over image for drag control */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'ew-resize',
            width: '100%',
            height: '100%',
            margin: 0,
          }}
        />
      </div>

      <div style={{ marginTop: '16px', fontFamily: "'Work Sans', sans-serif", fontSize: '13px', color: '#EBF2FA', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #A4BD01' }}>
        <strong>{selectedSpot.name} :</strong> {selectedSpot.history}
      </div>
    </div>
  )
}
