/**
 * photos.js — Service de recherche de photos
 *
 * Sources disponibles :
 *   1. Wikimedia Commons  → images libres de droits, aucune clé requise
 *   2. Pexels             → photos HD, clé API via notre backend (jamais exposée au frontend)
 *
 * Usage :
 *   import { searchWikimedia, searchPexels, searchPhotos } from '../api/photos'
 */

import { API_URL } from '../config'

// ─── 1. Wikimedia Commons ────────────────────────────────────
// API MediaWiki — https://commons.wikimedia.org/w/api.php
// Aucune clé, aucun compte requis.

const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php'

/**
 * Recherche des images sur Wikimedia Commons.
 * @param {string} query        - terme de recherche, ex. "Libreville Gabon"
 * @param {number} [limit=12]
 * @returns {Promise<Array<WikiPhoto>>}
 */
export async function searchWikimedia(query, limit = 12) {
  if (!query?.trim()) return []

  // Étape 1 : obtenir les titres des fichiers correspondants
  const searchParams = new URLSearchParams({
    action:      'query',
    list:        'search',
    srsearch:    `${query} filetype:bitmap`,
    srnamespace: '6',   // namespace 6 = fichiers (File:)
    srlimit:     String(limit),
    format:      'json',
    origin:      '*',   // CORS
  })

  const searchRes = await fetch(`${WIKIMEDIA_API}?${searchParams}`)
  if (!searchRes.ok) throw new Error(`Wikimedia search ${searchRes.status}`)
  const searchData = await searchRes.json()
  const titles = (searchData.query?.search || []).map((r) => r.title)
  if (!titles.length) return []

  // Étape 2 : obtenir les URLs des miniatures pour chaque fichier
  const infoParams = new URLSearchParams({
    action:       'query',
    titles:       titles.join('|'),
    prop:         'imageinfo',
    iiprop:       'url|extmetadata|size',
    iiurlwidth:   '800',
    format:       'json',
    origin:       '*',
  })

  const infoRes = await fetch(`${WIKIMEDIA_API}?${infoParams}`)
  if (!infoRes.ok) throw new Error(`Wikimedia imageinfo ${infoRes.status}`)
  const infoData = await infoRes.json()
  const pages = Object.values(infoData.query?.pages || {})

  return pages
    .filter((p) => p.imageinfo?.length > 0)
    .map((p) => {
      const info = p.imageinfo[0]
      const meta = info.extmetadata || {}
      return {
        id:          String(p.pageid),
        source:      'wikimedia',
        url:         info.thumburl || info.url,
        fullUrl:     info.url,
        width:       info.thumbwidth || info.width,
        height:      info.thumbheight || info.height,
        title:       p.title?.replace('File:', '') || '',
        author:      meta.Artist?.value?.replace(/<[^>]+>/g, '') || 'Inconnu',
        license:     meta.LicenseShortName?.value || 'CC',
        licenseUrl:  meta.LicenseUrl?.value || 'https://creativecommons.org',
        pageUrl:     `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
        attribution: buildWikimediaAttribution(p.title, meta),
      }
    })
    .filter((p) => p.url) // Exclure les fichiers sans URL
}

function buildWikimediaAttribution(title, meta) {
  const author = meta.Artist?.value?.replace(/<[^>]+>/g, '') || 'Auteur inconnu'
  const license = meta.LicenseShortName?.value || 'CC'
  return `© ${author} / Wikimedia Commons · ${license}`
}

// ─── 2. Pexels (via backend — clé jamais exposée) ───────────
// Notre API Gateway proxifie les appels Pexels avec la clé en env.
// GET /api/photos/search?q=...&per_page=...

/**
 * Recherche de photos via Pexels (proxy backend).
 * La clé API Pexels est stockée dans les variables d'environnement du backend.
 * @param {string} query
 * @param {number} [perPage=12]
 * @returns {Promise<Array<PexelsPhoto>>}
 */
export async function searchPexels(query, perPage = 12) {
  if (!query?.trim()) return []

  const token = localStorage.getItem('auth_token')
  const params = new URLSearchParams({ q: query.trim(), per_page: String(perPage) })

  const res = await fetch(`${API_URL}/photos/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`Pexels proxy ${res.status}`)
  const data = await res.json()

  return (data.photos || []).map((p) => ({
    id:          String(p.id),
    source:      'pexels',
    url:         p.src?.large || p.src?.medium,
    fullUrl:     p.src?.original,
    width:       p.width,
    height:      p.height,
    title:       p.alt || query,
    author:      p.photographer,
    pageUrl:     p.url,
    attribution: `Photo de ${p.photographer} sur Pexels`,
  }))
}

// ─── 3. Recherche combinée ──────────────────────────────────
/**
 * Cherche dans Wikimedia ET Pexels, retourne les résultats fusionnés.
 * Pexels peut échouer si la clé n'est pas configurée — on l'ignore silencieusement.
 * @param {string} query
 * @param {'wikimedia'|'pexels'|'both'} [source='both']
 */
export async function searchPhotos(query, source = 'both') {
  const results = await Promise.allSettled([
    source !== 'pexels'    ? searchWikimedia(query, 8) : Promise.resolve([]),
    source !== 'wikimedia' ? searchPexels(query, 8).catch(() => []) : Promise.resolve([]),
  ])

  const wikimedia = results[0].status === 'fulfilled' ? results[0].value : []
  const pexels    = results[1].status === 'fulfilled' ? results[1].value : []

  // Interleave : 1 Wikimedia, 1 Pexels, 1 Wikimedia...
  const combined = []
  const maxLen = Math.max(wikimedia.length, pexels.length)
  for (let i = 0; i < maxLen; i++) {
    if (wikimedia[i]) combined.push(wikimedia[i])
    if (pexels[i])    combined.push(pexels[i])
  }
  return combined
}
