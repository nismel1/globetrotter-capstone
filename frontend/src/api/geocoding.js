/**
 * geocoding.js — Service Nominatim (OpenStreetMap)
 *
 * Utilisé pour :
 *  - search()         : recherche d'adresse → coordonnées (geocoding direct)
 *  - reverse()        : coordonnées → adresse lisible (geocoding inverse)
 *  - searchGabon()    : search pré-filtré sur le Gabon / Libreville
 *  - fromProposal()   : geocoder automatiquement une adresse saisie dans ProposePage
 *
 * Aucune clé API requise.
 * Rate limit Nominatim : 1 req/s — on throttle automatiquement.
 *
 * Doc : https://nominatim.org/release-docs/develop/api/Search/
 */

const BASE = 'https://nominatim.openstreetmap.org'

// User-Agent requis par les CGU Nominatim
const HEADERS = {
  'Accept-Language': 'fr',
  'User-Agent': 'Globetrotter-LBV/1.0 (contact@globetrotter.ga)',
}

// Throttle simple : on garantit 1 requête par seconde
let lastCallAt = 0
async function throttledFetch(url) {
  const now = Date.now()
  const wait = Math.max(0, 1050 - (now - lastCallAt))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCallAt = Date.now()
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Nominatim ${res.status}: ${res.statusText}`)
  return res.json()
}

/**
 * Recherche d'adresse (geocoding direct).
 * @param {string} query       - texte libre, ex. "Marché Mont-Bouët Libreville"
 * @param {Object} [opts]
 * @param {number} [opts.limit=5]
 * @param {string} [opts.countrycodes='ga'] - code ISO pays (défaut: Gabon)
 * @returns {Promise<Array<NominatimResult>>}
 */
export async function search(query, { limit = 5, countrycodes = 'ga' } = {}) {
  if (!query?.trim()) return []

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    limit: String(limit),
    addressdetails: '1',
    namedetails: '1',
    extratags: '1',
    countrycodes,
  })

  const data = await throttledFetch(`${BASE}/search?${params}`)
  return Array.isArray(data) ? data.map(normalizeResult) : []
}

/**
 * Recherche filtrée sur Libreville / Gabon.
 * @param {string} query
 * @param {number} [limit=8]
 */
export async function searchGabon(query, limit = 8) {
  return search(`${query} Gabon`, { limit, countrycodes: 'ga' })
}

/**
 * Géocodage inverse : coordonnées → adresse.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<NominatimResult|null>}
 */
export async function reverse(lat, lon) {
  if (lat == null || lon == null) return null

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  })

  const data = await throttledFetch(`${BASE}/reverse?${params}`)
  return data?.display_name ? normalizeResult(data) : null
}

/**
 * Geocoder une adresse saisie dans ProposePage.
 * Si l'adresse contient déjà des coordonnées au format "lat, lon",
 * elles sont retournées directement sans appel réseau.
 *
 * @param {string} address
 * @returns {Promise<{lat: number, lon: number, display: string} | null>}
 */
export async function fromProposal(address) {
  if (!address?.trim()) return null

  // Détection "0.3920, 9.4530" ou "-1.234, 12.567"
  const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
  const coordMatch = address.trim().match(coordPattern)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1])
    const lon = parseFloat(coordMatch[2])
    if (!isNaN(lat) && !isNaN(lon)) {
      const rev = await reverse(lat, lon).catch(() => null)
      return {
        lat,
        lon,
        display: rev?.display_name || address,
      }
    }
  }

  // Sinon recherche textuelle
  const results = await searchGabon(address, 1)
  if (!results.length) return null

  const first = results[0]
  return {
    lat: first.lat,
    lon: first.lon,
    display: first.display_name,
  }
}

/**
 * Suggère des adresses en temps réel (autocomplete).
 * Appeler avec un debounce de 500ms côté composant.
 * @param {string} query
 * @returns {Promise<Array<{label: string, lat: number, lon: number}>>}
 */
export async function autocomplete(query) {
  if (!query || query.length < 3) return []
  const results = await searchGabon(query, 6)
  return results.map((r) => ({
    label: r.display_name,
    shortLabel: buildShortLabel(r),
    lat: r.lat,
    lon: r.lon,
    type: r.type,
    category: r.category,
  }))
}

// ── Helpers internes ──────────────────────────────────────────

function normalizeResult(raw) {
  return {
    place_id:     raw.place_id,
    display_name: raw.display_name,
    lat:          parseFloat(raw.lat),
    lon:          parseFloat(raw.lon),
    type:         raw.type,
    category:     raw.category,
    address:      raw.address || {},
    importance:   raw.importance,
  }
}

function buildShortLabel(result) {
  const a = result.address
  const parts = [
    a.amenity || a.shop || a.leisure || a.tourism,
    a.road || a.pedestrian,
    a.suburb || a.quarter || a.neighbourhood,
    a.city || a.town || a.village,
  ].filter(Boolean)

  return parts.slice(0, 3).join(', ') || result.display_name
}
