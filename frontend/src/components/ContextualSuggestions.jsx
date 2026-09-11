import React from 'react'
import { useWeather, WMO_CODES, WMO_DEFAULT } from './WeatherWidget'
import { SunIcon, ClockIcon, MapPinIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function ContextualSuggestions({ onSelectActivity }) {
  const { weather } = useWeather()

  // Get current hour in Libreville
  const currentHour = new Date().getHours()

  let timePeriod = 'Matin'
  let timeIcon = '🌅'
  if (currentHour >= 12 && currentHour < 18) {
    timePeriod = 'Après-midi'
    timeIcon = '☀️'
  } else if (currentHour >= 18 || currentHour < 6) {
    timePeriod = 'Soirée'
    timeIcon = '🌙'
  }

  const isRainy = weather?.code >= 50
  const isSunny = weather?.temp >= 27 && !isRainy

  // Generate smart recommendations based on weather + time
  let suggestions = []

  if (isRainy) {
    suggestions = [
      {
        title: '🏛️ Visite à l\'abri au Musée National',
        reason: '🌧️ Pluie détectée : privilégiez une visite couverte culturelle.',
        duration: '120 min',
        category: 'Patrimoine',
        place: 'Musée National de Libreville',
      },
      {
        title: '☕ Pause gourmande dans un café d\'Akanda',
        reason: '🌧️ Temps pluvieux : idéal pour déguster un café ou chocolat chaud local.',
        duration: '60 min',
        category: 'Gastronomie',
        place: 'Quartier Akanda / Sablière',
      },
    ]
  } else if (timePeriod === 'Matin') {
    suggestions = [
      {
        title: '🚤 Pirogue du matin pour la Pointe Denis',
        reason: '🌅 Matinée fraîche (28°C) : créneau idéal pour traverser l\'Estuaire.',
        duration: '240 min',
        category: 'Aventure',
        place: 'Embarcadère Michel Marine',
      },
      {
        title: '🛍️ Marché coloré de Mont-Bouët',
        reason: '🛍️ Moins de foule le matin pour flâner parmi les étals artisanaux.',
        duration: '90 min',
        category: 'Culture',
        place: 'Grand Marché Mont-Bouët',
      },
    ]
  } else if (timePeriod === 'Après-midi') {
    suggestions = [
      {
        title: '🏖️ Détente & baignade à la Sablière',
        reason: `☀️ Ciel dégagé (${weather?.temp || 30}°C) : moment parfait pour la plage !`,
        duration: '180 min',
        category: 'Détente',
        place: 'Plage de la Sablière',
      },
      {
        title: '🌿 Promenade ombragée à Raponda-Walker',
        reason: '🌿 La forêt côtière offre une fraîcheur agréable l\'après-midi.',
        duration: '120 min',
        category: 'Nature',
        place: 'Forêt d\'Mondah',
      },
    ]
  } else {
    // Soirée
    suggestions = [
      {
        title: '🍲 Poulet Nyembwe braisé au Quartier Louis',
        reason: '🌙 Soirée animée : découvrez les maquis réputés du centre-ville.',
        duration: '90 min',
        category: 'Gastronomie',
        place: 'Quartier Louis',
      },
      {
        title: '🎶 Ambiance musicale & bar au Bord de Mer',
        reason: '🍹 Brise marine nocturne agrémentée de musique gabonaise live.',
        duration: '120 min',
        category: 'Nocturne',
        place: 'Bord de Mer de Libreville',
      },
    ]
  }

  return (
    <div
      style={{
        background: 'rgba(2, 32, 46, 0.85)',
        border: '1px solid rgba(164, 189, 1, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SparklesIcon style={{ width: '20px', height: '20px', color: '#A4BD01' }} />
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 'bold', color: '#EBF2FA', margin: 0 }}>
            Suggestions Contextuelles
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1' }}>
          <span>{timeIcon} {timePeriod} ({currentHour}h)</span>
          <span>•</span>
          <span>🌡️ {weather?.temp || 29}°C</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {suggestions.map((s, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(164, 189, 1, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#A4BD01', background: 'rgba(164, 189, 1, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {s.category}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#427AA1' }}>
                  ⏱️ {s.duration}
                </span>
              </div>

              <h4 style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', fontWeight: 'bold', color: '#EBF2FA', margin: '4px 0' }}>
                {s.title}
              </h4>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '11px', color: '#427AA1', margin: '4px 0 8px 0' }}>
                {s.reason}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1' }}>
                📍 {s.place}
              </span>
              {onSelectActivity && (
                <button
                  onClick={() => onSelectActivity(s)}
                  style={{
                    background: 'rgba(164, 189, 1, 0.2)',
                    border: '1px solid #A4BD01',
                    color: '#A4BD01',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    cursor: 'pointer',
                  }}
                >
                  ➕ Prévu
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
