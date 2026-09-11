import React, { useEffect, useRef } from 'react'

// Leaflet est importé dynamiquement pour éviter les erreurs SSR
// et pour ne charger la lib qu'au montage du composant.

const LBV_DEFAULT = { lat: 0.3924, lon: 9.4536 }

/**
 * PlaceMap — Carte Leaflet + OpenStreetMap
 * @param {number}  lat       - latitude du lieu
 * @param {number}  lon       - longitude du lieu
 * @param {string}  name      - nom du lieu (popup)
 * @param {string}  address   - adresse (popup secondaire)
 * @param {number}  zoom      - zoom initial (défaut: 14)
 * @param {string}  height    - hauteur CSS (défaut: '280px')
 */
export default function PlaceMap({
  lat,
  lon,
  name = 'Lieu',
  address = '',
  zoom = 14,
  height = '280px',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  // Coordonnées utilisées (fallback sur Libreville si non fourni)
  const mapLat = (lat != null && !isNaN(lat)) ? parseFloat(lat) : LBV_DEFAULT.lat
  const mapLon = (lon != null && !isNaN(lon)) ? parseFloat(lon) : LBV_DEFAULT.lon

  useEffect(() => {
    if (!containerRef.current) return

    // Import dynamique de Leaflet (évite les problèmes avec SSR/Vite)
    let L
    let map
    let cancelled = false

    async function initMap() {
      try {
        L = (await import('leaflet')).default

        // Fix l'icône par défaut de Leaflet (bug connu avec Vite/Webpack)
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        if (cancelled) return

        // Si une carte existe déjà sur ce container, on la détruit
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }

        map = L.map(containerRef.current, {
          center: [mapLat, mapLon],
          zoom,
          zoomControl: true,
          scrollWheelZoom: false, // évite le zoom accidentel en scrollant la page
          attributionControl: true,
        })

        // Tuiles OpenStreetMap — pas de clé requise
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)

        // Marqueur avec popup
        const popup = L.popup({
          className: 'gt-map-popup',
          maxWidth: 220,
        }).setContent(
          `<div style="
            font-family:'IBM Plex Mono',monospace;
            font-size:11px;
            line-height:1.5;
            color:#02202E;
          ">
            <strong style="
              font-family:'Cormorant Garamond',serif;
              font-size:15px;
              display:block;
              margin-bottom:4px;
            ">${name}</strong>
            ${address ? `<span style="color:#427AA1;">${address}</span>` : ''}
          </div>`
        )

        L.marker([mapLat, mapLon])
          .addTo(map)
          .bindPopup(popup)
          .openPopup()

        mapRef.current = map
      } catch (err) {
        console.error('[PlaceMap] Leaflet init error:', err)
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [mapLat, mapLon, name, address, zoom])

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height }}>
      {/* Injection du CSS Leaflet via link dynamique */}
      <style>{`
        @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        .gt-map-popup .leaflet-popup-content-wrapper {
          background: #EBF2FA;
          border: 1px solid #427AA1;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .gt-map-popup .leaflet-popup-tip {
          background: #EBF2FA;
        }
        .gt-map-popup .leaflet-popup-close-button {
          color: #06668C !important;
        }
      `}</style>

      {/* Container de la carte */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        aria-label={`Carte de localisation : ${name}`}
        role="region"
      />

      {/* Badge discret en bas à gauche */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8, zIndex: 1000,
        background: 'rgba(2,32,46,0.85)', backdropFilter: 'blur(6px)',
        border: '1px solid rgba(66,122,161,0.4)',
        borderRadius: 6, padding: '4px 8px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, color: '#427AA1',
        letterSpacing: '0.08em',
        pointerEvents: 'none',
      }}>
        OSM · {mapLat.toFixed(4)}°N, {mapLon.toFixed(4)}°E
      </div>
    </div>
  )
}
