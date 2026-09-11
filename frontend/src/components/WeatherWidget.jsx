import React, { useEffect, useState } from 'react'
import {
  SunIcon,
  CloudIcon,
  BoltIcon,
  BeakerIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

// Open-Meteo WMO weather codes → label + icône Heroicon
export const WMO_CODES = {
  0:  { label: 'Ciel dégagé',       Icon: SunIcon },
  1:  { label: 'Principalement dégagé', Icon: SunIcon },
  2:  { label: 'Partiellement nuageux', Icon: CloudIcon },
  3:  { label: 'Couvert',           Icon: CloudIcon },
  45: { label: 'Brouillard',        Icon: CloudIcon },
  48: { label: 'Brouillard givrant',Icon: CloudIcon },
  51: { label: 'Bruine légère',     Icon: BeakerIcon },
  53: { label: 'Bruine modérée',    Icon: BeakerIcon },
  55: { label: 'Bruine dense',      Icon: BeakerIcon },
  61: { label: 'Pluie légère',      Icon: BeakerIcon },
  63: { label: 'Pluie modérée',     Icon: BeakerIcon },
  65: { label: 'Pluie forte',       Icon: BeakerIcon },
  80: { label: 'Averses légères',   Icon: BeakerIcon },
  81: { label: 'Averses modérées',  Icon: BeakerIcon },
  82: { label: 'Averses violentes', Icon: BeakerIcon },
  95: { label: 'Orage',             Icon: BoltIcon },
  96: { label: 'Orage avec grêle',  Icon: BoltIcon },
  99: { label: 'Orage fort',        Icon: BoltIcon },
}

export const WMO_DEFAULT = { label: 'Ensoleillé / Humide', Icon: SunIcon }

// Coordonnées de Libreville par défaut
export const LBV_LAT = 0.3924
export const LBV_LON = 9.4536

// Fallback données météo typiques de Libreville (climat équatorial)
const FALLBACK_WEATHER = {
  temp: 29,
  feelsLike: 33,
  humidity: 82,
  wind: 12,
  precipitation: 0,
  code: 2, // Partiellement nuageux
  isFallback: true,
}

/**
 * Custom Hook pour consommer les données météo en direct
 */
export function useWeather(lat = LBV_LAT, lon = LBV_LON) {
  const [weather, setWeather] = useState(FALLBACK_WEATHER)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,` +
      `wind_speed_10m,weather_code,precipitation` +
      `&forecast_days=1` +
      `&timezone=Africa%2FLibreville`

    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Météo indisponible')
        return r.json()
      })
      .then((data) => {
        if (!cancelled && data.current) {
          const c = data.current
          setWeather({
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            humidity: c.relative_humidity_2m,
            wind: Math.round(c.wind_speed_10m),
            precipitation: c.precipitation || 0,
            code: c.weather_code,
            isFallback: false,
          })
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Utilisation du fallback météo pour Libreville:', err.message)
          setWeather(FALLBACK_WEATHER)
          setError(err.message)
        }
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [lat, lon])

  return { weather, loading, error }
}

/**
 * WeatherWidget
 */
export default function WeatherWidget({
  lat = LBV_LAT,
  lon = LBV_LON,
  placeName = 'Libreville',
  size = 'compact',
}) {
  const { weather, loading } = useWeather(lat, lon)

  if (loading && !weather) {
    return (
      <div style={styles.container(size)}>
        <ArrowPathIcon style={{ width: 16, height: 16, color: '#427AA1', animation: 'gt-spin 1s linear infinite' }} />
        <span style={styles.label}>Météo…</span>
      </div>
    )
  }

  const activeWeather = weather || FALLBACK_WEATHER
  const weatherInfo = WMO_CODES[activeWeather.code] ?? WMO_DEFAULT
  const Icon = weatherInfo.Icon
  const label = weatherInfo.label

  if (size === 'compact') {
    return (
      <div style={styles.container('compact')} title={`${placeName} — ${label} (${activeWeather.temp}°C)`}>
        <Icon style={{ width: 16, height: 16, color: '#A4BD01', flexShrink: 0 }} />
        <span style={styles.temp}>{activeWeather.temp}°C</span>
        <span style={styles.label}>{label}</span>
      </div>
    )
  }

  // full
  return (
    <div style={styles.fullCard}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={styles.mono}>MÉTÉO ACTUELLE (EN DIRECT)</div>
          <div style={styles.placeName}>{placeName}</div>
        </div>
        <Icon style={{ width: 36, height: 36, color: '#A4BD01' }} />
      </div>

      {/* Température principale */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
        <span style={styles.bigTemp}>{activeWeather.temp}°</span>
        <span style={{ ...styles.label, marginBottom: 6, fontSize: 14 }}>C</span>
      </div>

      <div style={{ ...styles.label, marginBottom: 16, fontSize: 12, color: '#EBF2FA' }}>{label}</div>

      {/* Grille de détails */}
      <div style={styles.grid}>
        {[
          { k: 'Ressenti',    v: `${activeWeather.feelsLike}°C` },
          { k: 'Humidité',    v: `${activeWeather.humidity} %` },
          { k: 'Vent',        v: `${activeWeather.wind} km/h` },
          { k: 'Précip.',     v: `${activeWeather.precipitation} mm` },
        ].map(({ k, v }) => (
          <div key={k} style={styles.gridItem}>
            <span style={styles.mono}>{k}</span>
            <span style={styles.gridVal}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ ...styles.mono, marginTop: 10, opacity: 0.5, display: 'flex', justifyContent: 'space-between' }}>
        <span>Source : Open-Meteo</span>
        <span>{activeWeather.isFallback ? 'Mode Hors Ligne' : 'Connecté'}</span>
      </div>
    </div>
  )
}

const styles = {
  container: (size) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(6,102,140,0.15)',
    border: '1px solid rgba(66,122,161,0.3)',
    borderRadius: size === 'compact' ? 20 : 12,
    padding: size === 'compact' ? '5px 12px' : '12px 16px',
  }),
  label: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: '#427AA1',
    letterSpacing: '0.06em',
  },
  temp: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    color: '#EBF2FA',
    fontWeight: 600,
  },
  fullCard: {
    background: 'rgba(2,32,46,0.9)',
    border: '1px solid rgba(66,122,161,0.35)',
    borderRadius: 14,
    padding: '20px 22px',
  },
  mono: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    color: '#427AA1',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  placeName: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    fontWeight: 600,
    color: '#EBF2FA',
    marginTop: 2,
  },
  bigTemp: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 52,
    fontWeight: 600,
    color: '#EBF2FA',
    lineHeight: 1,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 16px',
  },
  gridItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  gridVal: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    color: '#EBF2FA',
    fontWeight: 600,
  },
}
