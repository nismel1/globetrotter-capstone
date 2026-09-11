/**
 * SearchBar.jsx — Barre de recherche Elasticsearch
 * Doit être utilisé à l'intérieur d'un BrowserRouter.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { API_URL } from '../config'

const DEBOUNCE_MS = 350
const MIN_CHARS   = 2

export default function SearchBar({ onSelect, placeholder = 'Rechercher un lieu…', className = '' }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [open, setOpen]             = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isFallback, setIsFallback] = useState(false)

  const inputRef    = useRef(null)
  const listRef     = useRef(null)
  const debounceRef = useRef(null)
  const navigate    = useNavigate()

  // ── Recherche avec debounce ─────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (q.length < MIN_CHARS) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    const token = localStorage.getItem('auth_token')

    try {
      const params = new URLSearchParams({ q: q.trim(), limit: '8' })
      const res = await fetch(`${API_URL}/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error(`Search ${res.status}`)
      const data = await res.json()
      setResults(data.results || [])
      setIsFallback(!!data.fallback)
      setOpen(true)
      setActiveIndex(-1)
    } catch {
      setResults([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  // ── Navigation clavier ───────────────────────────────────
  function handleKeyDown(e) {
    if (!open || !results.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0) selectResult(results[activeIndex])
      else if (query.trim()) navigate(`/explorer?q=${encodeURIComponent(query.trim())}`)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  function selectResult(result) {
    setQuery(result.name)
    setOpen(false)
    if (onSelect) {
      onSelect(result)
    } else {
      navigate(`/explorer?place=${result.id}`)
    }
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  // ── Fermer la liste au clic extérieur ────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Highlight HTML (sécurisé — pas de dangerouslySetInnerHTML) ──
  function HighlightedText({ text, html }) {
    if (html) {
      // Les highlights viennent d'Elasticsearch, on leur fait confiance
      // mais on s'assure que seules les balises <mark> passent
      const safe = html.replace(/<(?!\/?(mark))[^>]+>/gi, '')
      return <span dangerouslySetInnerHTML={{ __html: safe }} />
    }
    return <span>{text}</span>
  }

  return (
    <div style={{ position: 'relative', width: '100%' }} className={className}>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(2,32,46,0.9)',
        border: `1px solid ${open ? '#A4BD01' : 'rgba(66,122,161,0.4)'}`,
        borderRadius: 10, overflow: 'hidden',
        transition: 'border-color 0.2s',
        boxShadow: open ? '0 0 0 3px rgba(164,189,1,0.12)' : 'none',
      }}>
        <div style={{ width: 42, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {loading
            ? <div style={{ width: 16, height: 16, border: '2px solid rgba(164,189,1,0.3)', borderTopColor: '#A4BD01', borderRadius: '50%', animation: 'gt-spin 0.7s linear infinite' }} />
            : <MagnifyingGlassIcon style={{ width: 17, height: 17, color: '#427AA1' }} />
          }
        </div>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= MIN_CHARS && results.length && setOpen(true)}
          placeholder={placeholder}
          aria-label="Rechercher un lieu"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            color: '#EBF2FA', fontFamily: "'Work Sans', sans-serif",
            fontSize: 14, padding: '10px 8px', outline: 'none',
          }}
        />

        {query && (
          <button
            onClick={clearSearch}
            aria-label="Effacer la recherche"
            style={{
              width: 36, height: 36, display: 'grid', placeItems: 'center',
              border: 'none', background: 'transparent',
              color: '#427AA1', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {/* Résultats */}
      {open && results.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Résultats de recherche"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'rgba(2,32,46,0.97)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(66,122,161,0.4)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            zIndex: 2000, listStyle: 'none', margin: 0, padding: 0,
          }}
        >
          {isFallback && (
            <li style={{
              padding: '6px 14px', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, color: '#427AA1', letterSpacing: '0.08em',
              borderBottom: '1px solid rgba(66,122,161,0.2)',
            }}>
              RECHERCHE LOCALE — Elasticsearch indisponible
            </li>
          )}

          {results.map((result, idx) => (
            <li
              key={result.id}
              role="option"
              aria-selected={activeIndex === idx}
              onClick={() => selectResult(result)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', cursor: 'pointer',
                background: activeIndex === idx ? 'rgba(164,189,1,0.1)' : 'transparent',
                borderBottom: idx < results.length - 1 ? '1px solid rgba(66,122,161,0.12)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              <MapPinIcon style={{ width: 16, height: 16, color: '#A4BD01', flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Work Sans', sans-serif", fontSize: 14,
                  color: '#EBF2FA', fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  <HighlightedText
                    text={result.name}
                    html={result.highlight?.name?.[0]}
                  />
                </div>

                {(result.highlight?.description?.[0] || result.description) && (
                  <div style={{
                    fontFamily: "'Work Sans', sans-serif", fontSize: 11,
                    color: '#427AA1', marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    <HighlightedText
                      text={result.description}
                      html={result.highlight?.description?.[0]}
                    />
                  </div>
                )}
              </div>

              {result.rating && (
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                  color: '#A4BD01', flexShrink: 0,
                }}>
                  ★ {parseFloat(result.rating).toFixed(1)}
                </span>
              )}
            </li>
          ))}

          {/* Footer — accéder à tous les résultats */}
          <li
            onClick={() => { navigate(`/explorer?q=${encodeURIComponent(query)}`); setOpen(false) }}
            style={{
              padding: '9px 14px', cursor: 'pointer',
              background: 'rgba(6,102,140,0.08)',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              color: '#427AA1', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 8,
              borderTop: '1px solid rgba(66,122,161,0.2)',
            }}
          >
            <MagnifyingGlassIcon style={{ width: 13, height: 13 }} />
            Voir tous les résultats pour « {query} »
          </li>
        </ul>
      )}

      {/* Aucun résultat */}
      {open && !loading && query.length >= MIN_CHARS && results.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(2,32,46,0.97)', backdropFilter: 'blur(14px)',
          border: '1px solid rgba(66,122,161,0.4)', borderRadius: 10,
          padding: '14px 16px', zIndex: 2000,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#427AA1',
        }}>
          Aucun résultat pour « {query} »
        </div>
      )}

      <style>{`mark { background: rgba(164,189,1,0.25); color: #EBF2FA; border-radius: 2px; padding: 0 2px; }`}</style>
    </div>
  )
}
