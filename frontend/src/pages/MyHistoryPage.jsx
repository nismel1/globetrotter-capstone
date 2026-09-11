import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { API_URL } from '../config'

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

function StarRating({ rating, size = 16 }) {
  return (
    <span style={{ fontSize: size }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= rating ? 1 : 0.2 }}>⭐</span>
      ))}
    </span>
  )
}

function MemoryCard({ memory, adventureNumber, onClick }) {
  const visitDate = new Date(memory.visited_at)
  const dateStr = `${visitDate.getDate()} ${MONTHS_FR[visitDate.getMonth()]} ${visitDate.getFullYear()}`

  return (
    <div
      onClick={() => onClick(memory)}
      style={{
        background: 'rgba(20,35,29,0.85)',
        border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
      }}
    >
      {/* Photo */}
      <div style={{
        height: '180px', position: 'relative',
        background: memory.photo_url
          ? 'none'
          : 'linear-gradient(135deg, #06668C, #02202E)',
        overflow: 'hidden',
      }}>
        {memory.photo_url ? (
          <img
            src={memory.photo_url} alt={memory.place_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 30% 30%, rgba(212,175,55,0.15), transparent 60%), linear-gradient(135deg, #06668C 0%, #02202E 100%)',
          }}>
            <span style={{ fontSize: '40px', opacity: 0.5 }}>🌿</span>
          </div>
        )}

        {/* Adventure number stamp */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '50px', height: '50px',
          border: '1.5px dashed #A4BD01', borderRadius: '50%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-10deg)',
          background: 'rgba(14,20,17,0.7)',
          backdropFilter: 'blur(4px)',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: '#A4BD01' }}>ADV.</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', fontWeight: 'bold' }}>
            #{String(adventureNumber).padStart(2,'0')}
          </span>
        </div>

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(20,35,29,0.9) 0%, transparent 60%)',
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
          color: '#427AA1', letterSpacing: '0.1em', marginBottom: '6px',
        }}>
          {memory.place_category || 'LIBREVILLE, GABON'}
        </div>

        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '20px', fontWeight: 600, color: '#EBF2FA',
          marginBottom: '8px', lineHeight: 1.2,
        }}>
          {memory.place_name || 'Lieu visité'}
        </h3>

        {memory.rating && (
          <div style={{ marginBottom: '10px' }}>
            <StarRating rating={memory.rating} size={14} />
          </div>
        )}

        {memory.memory_text && (
          <p style={{
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '13px', color: 'rgba(239,230,211,0.75)',
            lineHeight: 1.6, marginBottom: '12px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            "{memory.memory_text}"
          </p>
        )}

        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          color: '#427AA1', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span>📅</span> {dateStr}
        </div>
      </div>
    </div>
  )
}

function TimelineView({ memoriesByYear, adventureNumbers, onClickMemory }) {
  return (
    <div style={{ paddingLeft: '20px' }}>
      {Object.entries(memoriesByYear).sort((a,b) => b[0]-a[0]).map(([year, byMonth]) => (
        <div key={year} style={{ marginBottom: '40px' }}>
          {/* Year */}
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '36px', fontWeight: 600, color: '#A4BD01',
            marginBottom: '24px',
          }}>{year}</div>

          {Object.entries(byMonth).sort((a,b) => b[0]-a[0]).map(([monthIdx, memories]) => (
            <div key={monthIdx} style={{ marginBottom: '28px', display: 'flex', gap: '20px' }}>
              {/* Month label */}
              <div style={{ width: '80px', flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                  color: '#427AA1', letterSpacing: '0.1em',
                  paddingTop: '4px',
                }}>{MONTHS_FR[parseInt(monthIdx)].toUpperCase()}</div>
              </div>

              {/* Timeline line */}
              <div style={{ position: 'relative', width: '2px', background: 'rgba(212,175,55,0.2)', flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', top: '8px', left: '-4px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: '#A4BD01', border: '2px solid #02202E',
                }} />
              </div>

              {/* Memories in that month */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
                {memories.map(memory => {
                  const visitDate = new Date(memory.visited_at)
                  const dayStr = `${visitDate.getDate()} ${MONTHS_FR[visitDate.getMonth()]}`
                  return (
                    <div
                      key={memory.id}
                      onClick={() => onClickMemory(memory)}
                      style={{
                        display: 'flex', gap: '14px', alignItems: 'center',
                        background: 'rgba(20,35,29,0.6)',
                        border: '1px solid rgba(212,175,55,0.15)',
                        borderRadius: '12px', padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'
                        e.currentTarget.style.background = 'rgba(20,35,29,0.85)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'
                        e.currentTarget.style.background = 'rgba(20,35,29,0.6)'
                      }}
                    >
                      {memory.photo_url ? (
                        <img src={memory.photo_url} alt="" style={{
                          width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: '50px', height: '50px', borderRadius: '8px',
                          background: 'rgba(212,175,55,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '20px', flexShrink: 0,
                        }}>🌿</div>
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: '16px', fontWeight: 600, color: '#EBF2FA',
                        }}>{memory.place_name}</div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '2px' }}>
                          {memory.rating && <StarRating rating={memory.rating} size={12} />}
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#427AA1',
                          }}>📅 {dayStr}</span>
                        </div>
                      </div>

                      <div style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#A4BD01',
                        flexShrink: 0,
                      }}>
                        ADV.#{String(adventureNumbers[memory.id] || 1).padStart(2,'0')} →
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function MyHistoryPage() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()

  const [memories, setMemories] = useState([])
  const [stats, setStats] = useState({ total_memories: 0, memories_with_photo: 0, avg_rating: null })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid') // 'grid' | 'timeline'
  const [filters, setFilters] = useState({ sort: 'visited_at', rating: '', category: '' })
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  const fetchMemories = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.sort) params.append('sort', filters.sort)
      if (filters.rating) params.append('rating', filters.rating)
      if (filters.category) params.append('category', filters.category)

      const res = await fetch(`${API_URL}/memories?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMemories(data.memories || [])
      setStats(data.stats || { total_memories: 0, memories_with_photo: 0, avg_rating: null })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMemories() }, [filters])

  const handleDelete = async (memoryId) => {
    const token = localStorage.getItem('auth_token')
    try {
      await fetch(`${API_URL}/memories/${memoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setMemories(prev => prev.filter(m => m.id !== memoryId))
      setSelectedMemory(null)
      setShowDeleteConfirm(null)
    } catch (e) {
      console.error(e)
    }
  }

  // Assign adventure numbers (chronological order)
  const sortedForNumbering = [...memories].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
  const adventureNumbers = {}
  sortedForNumbering.forEach((m, i) => { adventureNumbers[m.id] = i + 1 })

  // Group by year/month for timeline
  const memoriesByYear = {}
  memories.forEach(m => {
    const d = new Date(m.visited_at)
    const year = d.getFullYear()
    const month = d.getMonth()
    if (!memoriesByYear[year]) memoriesByYear[year] = {}
    if (!memoriesByYear[year][month]) memoriesByYear[year][month] = []
    memoriesByYear[year][month].push(m)
  })

  // Unique categories for filter
  const categories = [...new Set(memories.map(m => m.place_category).filter(Boolean))]

  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar audioActive={false} onToggleAudio={() => {}} />

      <div className="app-container">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>📖</span>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '42px', fontWeight: 600, color: '#EBF2FA',
            }}>Mon Histoire</h1>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontSize: '16px', color: '#427AA1',
          }}>
            Chaque lieu devient un souvenir. Chaque souvenir, une page de votre aventure.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '32px',
        }}>
          {[
            { icon: '🌍', value: stats.total_memories || 0, label: 'Lieux visités' },
            { icon: '📸', value: stats.memories_with_photo || 0, label: 'Souvenirs avec photo' },
            { icon: '⭐', value: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : '—', label: 'Note moyenne' },
            { icon: '📖', value: memories.length, label: 'Aventures' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(20,35,29,0.8)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '12px', padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '32px', fontWeight: 600, color: '#A4BD01',
              }}>{s.value}</div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '9px', color: '#427AA1', letterSpacing: '0.08em',
              }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Controls bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* View toggle */}
            {['grid', 'timeline'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? 'rgba(212,175,55,0.2)' : 'rgba(20,35,29,0.6)',
                border: view === v ? '1px solid #A4BD01' : '1px solid rgba(255,255,255,0.1)',
                color: view === v ? '#A4BD01' : '#427AA1',
                padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.06em',
              }}>
                {v === 'grid' ? '▦ GRILLE' : '│ TIMELINE'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Sort */}
            <select
              value={filters.sort}
              onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
              style={{
                background: 'rgba(20,35,29,0.9)', border: '1px solid rgba(212,175,55,0.3)',
                color: '#A4BD01', padding: '7px 12px', borderRadius: '6px',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', cursor: 'pointer',
              }}
            >
              <option value="visited_at">Plus récent</option>
              <option value="rating">Meilleure note</option>
              <option value="created_at">Date d'ajout</option>
            </select>

            {/* Rating filter */}
            <select
              value={filters.rating}
              onChange={e => setFilters(f => ({ ...f, rating: e.target.value }))}
              style={{
                background: 'rgba(20,35,29,0.9)', border: '1px solid rgba(212,175,55,0.3)',
                color: '#A4BD01', padding: '7px 12px', borderRadius: '6px',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', cursor: 'pointer',
              }}
            >
              <option value="">Toutes les notes</option>
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} étoile{r>1?'s':''}</option>)}
            </select>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                style={{
                  background: 'rgba(20,35,29,0.9)', border: '1px solid rgba(212,175,55,0.3)',
                  color: '#A4BD01', padding: '7px 12px', borderRadius: '6px',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', cursor: 'pointer',
                }}
              >
                <option value="">Toutes catégories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#427AA1' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>
              Chargement de vos aventures...
            </div>
          </div>
        ) : memories.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            background: 'rgba(20,35,29,0.5)', border: '1px dashed rgba(212,175,55,0.3)',
            borderRadius: '20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌿</div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '28px', color: '#EBF2FA', marginBottom: '12px',
            }}>Votre histoire commence ici</h3>
            <p style={{
              fontFamily: "'Work Sans', sans-serif", fontSize: '15px',
              color: '#427AA1', maxWidth: '400px', margin: '0 auto 24px',
            }}>
              Visitez des lieux, marquez-les comme visités et créez vos premiers souvenirs.
            </p>
            <button
              onClick={() => navigate('/explorer')}
              style={{
                background: 'linear-gradient(135deg, #A4BD01, #679436)',
                border: 'none', color: '#02202E', padding: '12px 28px',
                borderRadius: '8px', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                fontWeight: 'bold', letterSpacing: '0.08em',
              }}
            >🧭 EXPLORER LIBREVILLE</button>
          </div>
        ) : view === 'grid' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {memories.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                adventureNumber={adventureNumbers[memory.id]}
                onClick={setSelectedMemory}
              />
            ))}
          </div>
        ) : (
          <TimelineView
            memoriesByYear={memoriesByYear}
            adventureNumbers={adventureNumbers}
            onClickMemory={setSelectedMemory}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          adventureNumber={adventureNumbers[selectedMemory.id]}
          onClose={() => setSelectedMemory(null)}
          onDelete={(id) => setShowDeleteConfirm(id)}
          onEdit={(memory) => navigate(`/my-history/edit/${memory.id}`)}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#02202E', border: '1px solid #679436',
            borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🗑️</div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '22px', color: '#EBF2FA', marginBottom: '12px',
            }}>Supprimer ce souvenir ?</h3>
            <p style={{
              fontFamily: "'Work Sans', sans-serif", fontSize: '14px',
              color: '#427AA1', marginBottom: '24px', lineHeight: 1.6,
            }}>
              Cette action supprimera définitivement cette page de votre histoire.
              Le lieu restera dans vos visites.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '12px',
                  background: 'transparent', border: '1px solid rgba(156,145,124,0.4)',
                  color: '#427AA1', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                }}
              >ANNULER</button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                style={{
                  flex: 1, padding: '12px',
                  background: 'rgba(168,71,43,0.8)', border: '1px solid #679436',
                  color: '#EBF2FA', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >SUPPRIMER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================
// Memory Detail Modal
// =====================
function MemoryDetailModal({ memory, adventureNumber, onClose, onDelete, onEdit }) {
  const [placeInfo, setPlaceInfo] = useState(null)
  const visitDate = new Date(memory.visited_at)
  const dateStr = `${visitDate.getDate()} ${MONTHS_FR[visitDate.getMonth()]} ${visitDate.getFullYear()}`
  const timeStr = `${String(visitDate.getHours()).padStart(2,'0')}:${String(visitDate.getMinutes()).padStart(2,'0')}`

  // Try to fetch place official info
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token || !memory.place_id) return
    fetch(`${API_URL}/places/${memory.place_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setPlaceInfo(data))
      .catch(() => {})
  }, [memory.place_id])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'linear-gradient(160deg, #06668C 0%, #02202E 100%)',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '20px', width: '100%', maxWidth: '640px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        {/* Hero photo */}
        <div style={{ position: 'relative', height: '280px' }}>
          {memory.photo_url ? (
            <img src={memory.photo_url} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              borderRadius: '20px 20px 0 0',
            }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', borderRadius: '20px 20px 0 0',
              background: 'radial-gradient(circle at 30% 50%, rgba(212,175,55,0.2), transparent 60%), linear-gradient(135deg, #06668C, #02202E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '60px', opacity: 0.6,
            }}>🌿</div>
          )}

          <div style={{
            position: 'absolute', inset: 0, borderRadius: '20px 20px 0 0',
            background: 'linear-gradient(to top, rgba(20,35,29,0.95) 0%, transparent 50%)',
          }} />

          {/* Close button */}
          <button onClick={onClose} style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(14,20,17,0.8)', border: '1px solid rgba(212,175,55,0.3)',
            color: '#EBF2FA', fontSize: '16px', cursor: 'pointer',
            width: '36px', height: '36px', borderRadius: '50%',
          }}>✕</button>

          {/* Adventure number */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '20px',
          }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#A4BD01', letterSpacing: '0.14em',
            }}>
              📖 MON AVENTURE #{String(adventureNumber).padStart(2,'0')}
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '28px', fontWeight: 600, color: '#EBF2FA',
            }}>{memory.place_name}</h2>
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Rating + date */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            {memory.rating ? (
              <StarRating rating={memory.rating} size={20} />
            ) : (
              <div />
            )}
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1',
            }}>
              📅 {dateStr} &nbsp; 🕐 {timeStr}
            </div>
          </div>

          {/* Memory text */}
          {memory.memory_text && (
            <div style={{
              background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.15)',
              borderRadius: '10px', padding: '16px 18px', marginBottom: '16px',
            }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                color: '#427AA1', letterSpacing: '0.1em', marginBottom: '8px',
              }}>MON SOUVENIR</div>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic', fontSize: '18px',
                color: '#EBF2FA', lineHeight: 1.5, margin: 0,
              }}>"{memory.memory_text}"</p>
            </div>
          )}

          {/* Favorite part */}
          {memory.favorite_part && (
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              marginBottom: '20px',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>❤️</span>
              <div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                  color: '#427AA1', letterSpacing: '0.1em', marginBottom: '4px',
                }}>CE QUE J'AI PRÉFÉRÉ</div>
                <p style={{
                  fontFamily: "'Work Sans', sans-serif", fontSize: '14px',
                  color: 'rgba(239,230,211,0.85)', margin: 0, lineHeight: 1.5,
                }}>{memory.favorite_part}</p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(212,175,55,0.15)', margin: '20px 0' }} />

          {/* Official place info */}
          {placeInfo && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                color: '#A4BD01', letterSpacing: '0.1em', marginBottom: '10px',
              }}>📍 À PROPOS DU LIEU</div>
              <p style={{
                fontFamily: "'Work Sans', sans-serif", fontSize: '13px',
                color: 'rgba(239,230,211,0.7)', lineHeight: 1.6, margin: 0,
              }}>
                {placeInfo.long_description || placeInfo.description || ''}
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onEdit(memory)}
              style={{
                flex: 1, minWidth: '120px', padding: '11px',
                background: 'rgba(212,175,55,0.15)', border: '1px solid #A4BD01',
                color: '#A4BD01', borderRadius: '8px', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                letterSpacing: '0.06em',
              }}
            >✏️ MODIFIER</button>
            <button
              onClick={() => onDelete(memory.id)}
              style={{
                flex: 1, minWidth: '120px', padding: '11px',
                background: 'rgba(168,71,43,0.15)', border: '1px solid #679436',
                color: '#679436', borderRadius: '8px', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                letterSpacing: '0.06em',
              }}
            >🗑️ SUPPRIMER</button>
            <button
              onClick={onClose}
              style={{
                flex: 1, minWidth: '120px', padding: '11px',
                background: 'transparent', border: '1px solid rgba(156,145,124,0.3)',
                color: '#427AA1', borderRadius: '8px', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
              }}
            >FERMER</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyHistoryPage
