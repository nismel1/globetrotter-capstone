/**
 * GabonInfo.jsx
 *
 * Affiche les informations officielles sur le Gabon via :
 *   - REST Countries API v3.1 (population, devise, langues, drapeau, etc.)
 *   - Nominatim OSM       (coordonnées GPS de Libreville)
 *
 * Aucune clé API requise.
 */
import { useState, useEffect } from 'react'
import { MapPinIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { API_URL } from '../config'

// ── Constantes ─────────────────────────────────────────────────
// On passe par notre backend proxy pour éviter les erreurs CORS
// L'endpoint /api/country/GA proxifie https://restcountries.com/v3.1/alpha/GA
const NOMINATIM_URL =
  'https://nominatim.openstreetmap.org/search' +
  '?q=Libreville+Gabon&format=jsonv2&limit=1&addressdetails=1'

const NOMINATIM_HEADERS = {
  'Accept-Language': 'fr',
  'User-Agent': 'Globetrotter-LBV/1.0',
}

// ── Helpers ────────────────────────────────────────────────────
function formatPopulation(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`
  return n.toLocaleString('fr-FR')
}

// ── Composant ──────────────────────────────────────────────────
/**
 * @param {'card' | 'inline' | 'banner'} [variant='card']
 *   card   → boîte autonome (page d'accueil, aside)
 *   inline → ligne compacte (navbar, footer)
 *   banner → bande immersive pleine largeur
 */
export default function GabonInfo({ variant = 'card' }) {
  const [country, setCountry]     = useState(null)
  const [libCoords, setLibCoords] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('auth_token')

    Promise.all([
      // 1. Infos pays via notre proxy backend (évite le CORS)
      fetch(`${API_URL}/country/GA`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (!r.ok) throw new Error(`Pays ${r.status}`)
          return r.json()
          // Le proxy retourne directement l'objet pays (pas un tableau)
        }),

      // 2. Coordonnées de Libreville via Nominatim (CORS OK sur ce domaine)
      fetch(NOMINATIM_URL, { headers: NOMINATIM_HEADERS })
        .then((r) => r.json())
        .then((data) => data[0] ?? null)
        .catch(() => null),
    ])
      .then(([countryData, nominatimData]) => {
        if (cancelled) return
        setCountry(countryData)
        if (nominatimData) {
          setLibCoords({
            lat: parseFloat(nominatimData.lat),
            lon: parseFloat(nominatimData.lon),
            // Komoot format : coordinates = [lon, lat] → on inverse pour affichage
            display: `${parseFloat(nominatimData.lat).toFixed(4)}° N, ${parseFloat(nominatimData.lon).toFixed(4)}° E`,
          })
        }
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // ── Extraction currency & languages (clés dynamiques API v3.1) ──
  const currency = country?.currencies
    ? (() => {
        // currencies = { XAF: { name: "Central African CFA franc", symbol: "Fr" } }
        const key = Object.keys(country.currencies)[0]
        return { code: key, ...country.currencies[key] }
      })()
    : null

  const languages = country?.languages
    ? Object.values(country.languages).join(', ')
    : '—'

  // ── Rendu loading / error ────────────────────────────────────
  if (loading) return <GabonInfoSkeleton variant={variant} />
  if (error)   return <GabonInfoError message={error} />

  // ── Variants ─────────────────────────────────────────────────
  if (variant === 'inline') return <GabonInfoInline country={country} libCoords={libCoords} />
  if (variant === 'banner') return <GabonInfoBanner country={country} libCoords={libCoords} currency={currency} languages={languages} />
  return <GabonInfoCard   country={country} libCoords={libCoords} currency={currency} languages={languages} />
}

// ── Variant : Card ────────────────────────────────────────────
function GabonInfoCard({ country, libCoords, currency, languages }) {
  const flag = country?.flags?.svg || country?.flags?.png

  return (
    <div style={{
      background: 'rgba(20,35,29,0.85)',
      border: '1px solid rgba(212,175,55,0.25)',
      borderRadius: 16,
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {flag && (
          <img
            src={flag}
            alt={`Drapeau du ${country.name?.common}`}
            style={{ width: 56, height: 38, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }}
          />
        )}
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#427AA1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            INFORMATIONS OFFICIELLES
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#EBF2FA', lineHeight: 1.1 }}>
            {country.name?.common || 'Gabon'}
          </div>
        </div>
      </div>

      {/* Données */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        {[
          { label: 'Capitale',   value: country.capital?.[0] || 'Libreville' },
          { label: 'Population', value: formatPopulation(country.population) },
          { label: 'Région',     value: country.subregion || country.region || '—' },
          { label: 'Langues',    value: languages },
          { label: 'Devise',     value: currency ? `${currency.name} (${currency.symbol})` : '—' },
          { label: 'Code ISO',   value: country.cca2 || 'GA' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#427AA1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 13, color: '#EBF2FA' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Coordonnées Libreville */}
      {libCoords && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px',
          border: '1px solid rgba(212,175,55,0.15)',
        }}>
          <MapPinIcon style={{ width: 14, height: 14, color: '#A4BD01', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#427AA1', letterSpacing: '0.08em' }}>
              LIBREVILLE — COORDONNÉES GPS
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#A4BD01', marginTop: 2 }}>
              {libCoords.display}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#427AA1', opacity: 0.6 }}>
        Source : REST Countries v3.1 · OpenStreetMap / Nominatim
      </div>
    </div>
  )
}

// ── Variant : Inline ─────────────────────────────────────────
function GabonInfoInline({ country, libCoords }) {
  const flag = country?.flags?.svg || country?.flags?.png
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {flag && (
        <img src={flag} alt="Gabon" style={{ width: 28, height: 19, objectFit: 'cover', borderRadius: 2, border: '1px solid rgba(255,255,255,0.15)' }} />
      )}
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#EBF2FA' }}>
        {country?.name?.common || 'Gabon'}
      </span>
      {libCoords && (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#427AA1' }}>
          · {libCoords.display}
        </span>
      )}
    </div>
  )
}

// ── Variant : Banner ─────────────────────────────────────────
function GabonInfoBanner({ country, libCoords, currency, languages }) {
  const flag = country?.flags?.svg || country?.flags?.png
  const stats = [
    { label: 'Population',  value: formatPopulation(country?.population) },
    { label: 'Langues',     value: languages },
    { label: 'Devise',      value: currency ? `${currency.symbol} ${currency.code}` : '—' },
    { label: 'Capitale',    value: country?.capital?.[0] || 'Libreville' },
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(20,35,29,0.95), rgba(14,20,17,0.98))',
      border: '1px solid rgba(212,175,55,0.2)',
      borderRadius: 16,
      padding: '28px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      flexWrap: 'wrap',
    }}>
      {/* Drapeau + nom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {flag && (
          <img
            src={flag} alt="Drapeau Gabon"
            style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
          />
        )}
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#427AA1', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            GABON · AFRIQUE CENTRALE
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 600, color: '#EBF2FA', lineHeight: 1.05, marginTop: 4 }}>
            {country?.name?.common || 'Gabon'}
          </div>
          {libCoords && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <MapPinIcon style={{ width: 12, height: 12, color: '#A4BD01' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#A4BD01' }}>
                Libreville · {libCoords.display}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Séparateur vertical */}
      <div style={{ width: 1, height: 64, background: 'rgba(212,175,55,0.2)', flexShrink: 0 }} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', flex: 1 }}>
        {stats.map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#427AA1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 14, color: '#EBF2FA', fontWeight: 500 }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── États intermédiaires ──────────────────────────────────────
function GabonInfoSkeleton({ variant }) {
  const h = variant === 'inline' ? 24 : variant === 'banner' ? 80 : 180
  return (
    <div style={{
      height: h, borderRadius: 12, border: '1px solid rgba(212,175,55,0.1)',
      background: 'linear-gradient(90deg, rgba(20,35,29,0.5) 25%, rgba(20,35,29,0.8) 37%, rgba(20,35,29,0.5) 63%)',
      backgroundSize: '400% 100%',
      animation: 'gt-skeleton 1.4s ease infinite',
    }} />
  )
}

function GabonInfoError({ message }) {
  return (
    <div style={{
      background: 'rgba(168,71,43,0.12)', border: '1px solid rgba(168,71,43,0.3)',
      borderRadius: 8, padding: '10px 14px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#E57373',
    }}>
      Données pays indisponibles · {message}
    </div>
  )
}
