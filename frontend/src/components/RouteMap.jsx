/**
 * RouteMap.jsx
 *
 * Carte interactive Leaflet + OSRM pour afficher et calculer
 * un itinéraire entre plusieurs étapes.
 *
 * Conventions importantes :
 *  - OSRM reçoit les coords au format [lon, lat] dans l'URL
 *  - Leaflet affiche les coords au format [lat, lon] pour ses composants
 *  - Ce composant gère l'inversion automatiquement
 *
 * Props :
 *   waypoints   : [{id, name, lat, lon}, ...]   étapes de l'itinéraire
 *   mode        : 'route' | 'trip'
 *                  route → ordre imposé (A→B→C)
 *                  trip  → ordre optimisé (OSRM choisit le meilleur ordre)
 *   profile     : 'driving' | 'walking' | 'cycling'
 *   height      : hauteur CSS de la carte (défaut '420px')
 *   onResult    : callback(result) appelé après calcul réussi
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL } from '../config'
import {
  MapPinIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

// Palette Globetrotter
const COLORS = {
  route:    '#A4BD01',  // vert-or — tracé principal
  waypoint: '#06668C',  // bleu profond — marqueurs
  start:    '#679436',  // vert savane — départ
  end:      '#427AA1',  // bleu lagune — arrivée
}

// Formatage de la durée en minutes → "Xh Ymin"
function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return `${h}h ${m > 0 ? m + ' min' : ''}`.trim()
}

// Formatage de la distance en mètres → "X,X km" ou "X m"
function formatDistance(meters) {
  if (!meters) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export default function RouteMap({
  waypoints = [],
  mode = 'route',
  profile = 'driving',
  height = '420px',
  onResult,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({ route: null, markers: [] })

  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [summary, setSummary] = useState(null) // { distance, duration }

  // ── Initialise Leaflet une seule fois ──────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let cancelled = false

    async function init() {
      const L = (await import('leaflet')).default

      // Fix icône Leaflet (bug connu Vite)
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (cancelled) return

      const map = L.map(mapContainerRef.current, {
        center: [0.3924, 9.4536], // Libreville
        zoom: 12,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    }

    init()
    return () => { cancelled = true }
  }, [])

  // ── Appel au proxy OSRM et dessin du tracé ─────────────────
  const calculateRoute = useCallback(async () => {
    if (!mapRef.current || waypoints.length < 2) return

    const L = (await import('leaflet')).default
    const map = mapRef.current
    const layers = layersRef.current
    const token = localStorage.getItem('auth_token')

    setLoading(true)
    setError(null)
    setSummary(null)

    // Nettoyer les anciens calques
    if (layers.route) { map.removeLayer(layers.route); layers.route = null }
    layers.markers.forEach((m) => map.removeLayer(m))
    layers.markers = []

    try {
      const endpoint = mode === 'trip' ? '/routing/trip' : '/routing/route'

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ waypoints, profile }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      const data = await res.json()

      // Récupérer la géométrie GeoJSON du tracé
      const geometry = mode === 'trip'
        ? data.trips?.[0]?.geometry
        : data.routes?.[0]?.geometry

      const legs = mode === 'trip'
        ? data.trips?.[0]?.legs || []
        : data.routes?.[0]?.legs || []

      if (!geometry) throw new Error('Aucun tracé reçu du serveur de routage.')

      // Résumé distance + durée (somme de tous les tronçons)
      const totalDistance = legs.reduce((s, l) => s + (l.distance || 0), 0)
      const totalDuration = legs.reduce((s, l) => s + (l.duration || 0), 0)
      const newSummary = { distance: totalDistance, duration: totalDuration }
      setSummary(newSummary)
      onResult?.({ geometry, legs, summary: newSummary, orderedWaypoints: data.waypoints })

      // Dessin du tracé GeoJSON
      // GeoJSON coords = [lon, lat] → Leaflet inverse automatiquement avec coordsToLatLng
      const routeLayer = L.geoJSON(geometry, {
        style: {
          color: COLORS.route,
          weight: 5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        },
      }).addTo(map)
      layers.route = routeLayer

      // Placement des marqueurs ordonnés (ordre OSRM retourné)
      const osrmWaypoints = data.waypoints || []
      waypoints.forEach((wp, idx) => {
        // Récupère les coords réelles snappées par OSRM si disponibles
        // OSRM retourne [lon, lat] → on inverse pour Leaflet [lat, lon]
        const snapped = osrmWaypoints[idx]?.location
        const latlng = snapped
          ? [snapped[1], snapped[0]]         // [lat, lon]
          : [parseFloat(wp.lat), parseFloat(wp.lon)]

        const isFirst = idx === 0
        const isLast  = idx === waypoints.length - 1

        const dotColor = isFirst ? COLORS.start : isLast ? COLORS.end : COLORS.waypoint

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width:32px; height:32px; border-radius:50%;
              background:${dotColor}; border:3px solid #EBF2FA;
              box-shadow:0 2px 8px rgba(0,0,0,0.35);
              display:flex; align-items:center; justify-content:center;
              font-family:'IBM Plex Mono',monospace;
              font-size:11px; font-weight:700; color:#fff;
            ">${idx + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const marker = L.marker(latlng, { icon })
          .bindPopup(`
            <div style="
              font-family:'IBM Plex Mono',monospace; font-size:11px;
              color:#02202E; line-height:1.5; min-width:120px;
            ">
              <strong style="
                font-family:'Cormorant Garamond',serif;
                font-size:15px; display:block; margin-bottom:4px;
              ">${wp.name || `Étape ${idx + 1}`}</strong>
              <span style="color:#427AA1;">
                ${isFirst ? '🟢 Départ' : isLast ? '🔵 Arrivée' : `Étape ${idx + 1}`}
              </span>
            </div>`)
          .addTo(map)

        layers.markers.push(marker)
      })

      // Zoom sur le tracé
      const bounds = routeLayer.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [waypoints, mode, profile, onResult])

  // Recalcule l'itinéraire dès que les props changent
  useEffect(() => {
    if (mapRef.current && waypoints.length >= 2) {
      calculateRoute()
    }
  }, [calculateRoute])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Barre de résumé */}
      {(summary || loading || error) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '10px 16px',
          background: error ? 'rgba(168,71,43,0.12)' : 'rgba(2,32,46,0.85)',
          border: `1px solid ${error ? '#679436' : 'rgba(66,122,161,0.35)'}`,
          borderRadius: 10,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
        }}>
          {loading && (
            <>
              <ArrowPathIcon style={{ width: 16, height: 16, color: '#A4BD01', animation: 'gt-spin 1s linear infinite' }} />
              <span style={{ color: '#427AA1' }}>Calcul de l'itinéraire…</span>
            </>
          )}
          {!loading && error && (
            <>
              <ExclamationTriangleIcon style={{ width: 16, height: 16, color: '#E57373' }} />
              <span style={{ color: '#E57373' }}>{error}</span>
            </>
          )}
          {!loading && !error && summary && (
            <>
              <span style={{ color: '#A4BD01' }}>📍 {waypoints.length} étapes</span>
              <span style={{ color: '#9C9C9C' }}>·</span>
              <span style={{ color: '#EBF2FA' }}>🛣 {formatDistance(summary.distance)}</span>
              <span style={{ color: '#9C9C9C' }}>·</span>
              <span style={{ color: '#EBF2FA' }}>⏱ {formatDuration(summary.duration)}</span>
              {mode === 'trip' && (
                <span style={{ color: '#679436', marginLeft: 4 }}>✦ Ordre optimisé</span>
              )}
            </>
          )}
          {!loading && !error && summary && (
            <button
              onClick={calculateRoute}
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: '1px solid rgba(66,122,161,0.4)',
                color: '#427AA1', padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              }}
            >
              <ArrowPathIcon style={{ width: 12, height: 12 }} />
              Recalculer
            </button>
          )}
        </div>
      )}

      {/* Légende des étapes */}
      {waypoints.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {waypoints.map((wp, i) => (
            <div key={wp.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(6,102,140,0.12)',
              border: '1px solid rgba(66,122,161,0.25)',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: i === 0 ? COLORS.start : i === waypoints.length - 1 ? COLORS.end : COLORS.waypoint,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#fff', fontWeight: 700,
              }}>{i + 1}</div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#EBF2FA' }}>
                {wp.name || `Étape ${i + 1}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Carte Leaflet */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height }}>
        <style>{`
          @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
          @keyframes gt-spin { to { transform: rotate(360deg); } }
          .gt-route-popup .leaflet-popup-content-wrapper {
            background: #EBF2FA; border: 1px solid #427AA1;
            border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          }
          .gt-route-popup .leaflet-popup-tip { background: #EBF2FA; }
        `}</style>

        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%' }}
          role="region"
          aria-label="Carte de l'itinéraire"
        />

        {/* Overlay de chargement sur la carte */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2000,
            background: 'rgba(2,32,46,0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'rgba(2,32,46,0.95)', border: '1px solid rgba(164,189,1,0.4)',
              borderRadius: 12, padding: '16px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#EBF2FA',
            }}>
              <ArrowPathIcon style={{ width: 18, height: 18, color: '#A4BD01', animation: 'gt-spin 1s linear infinite' }} />
              Calcul en cours…
            </div>
          </div>
        )}

        {/* Vide — invite */}
        {!loading && waypoints.length < 2 && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1500,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'rgba(2,32,46,0.6)', backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
          }}>
            <MapPinIcon style={{ width: 36, height: 36, color: '#427AA1', opacity: 0.6 }} />
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              color: '#427AA1', letterSpacing: '0.08em',
            }}>
              AJOUTEZ AU MOINS 2 ÉTAPES
            </span>
          </div>
        )}

        {/* Badge mode */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1000,
          background: 'rgba(2,32,46,0.88)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(66,122,161,0.4)', borderRadius: 6,
          padding: '4px 10px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
          color: mode === 'trip' ? '#679436' : '#427AA1',
          letterSpacing: '0.1em',
          pointerEvents: 'none',
        }}>
          {mode === 'trip' ? '✦ MODE OPTIMISÉ' : '→ MODE SÉQUENTIEL'}
        </div>
      </div>
    </div>
  )
}
