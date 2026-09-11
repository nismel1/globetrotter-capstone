import React, { useState, useRef, useEffect } from 'react'
import { API_URL } from '../config'

/**
 * MemoryModal — Modale de création/édition d'un souvenir
 * Apparaît après que l'utilisateur marque un lieu comme visité
 * ou depuis la fiche lieu si le lieu est déjà visité
 */
function MemoryModal({ place, existingMemory = null, onClose, onSaved }) {
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    memory_text: existingMemory?.memory_text || '',
    favorite_part: existingMemory?.favorite_part || '',
    rating: existingMemory?.rating || 0,
    visited_at: existingMemory?.visited_at
      ? new Date(existingMemory.visited_at).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    photo_url: existingMemory?.photo_url || null,
  })

  const [photoPreview, setPhotoPreview] = useState(existingMemory?.photo_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hoverRating, setHoverRating] = useState(0)

  const isEditing = !!existingMemory

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validation
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5 Mo.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
      setFormData(prev => ({ ...prev, photo_url: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setFormData(prev => ({ ...prev, photo_url: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const token = localStorage.getItem('auth_token')

    const payload = {
      place_id: place.id,
      place_name: place.rawName || place.name,
      place_category: place.category || place.category_name || '',
      photo_url: formData.photo_url || null,
      memory_text: formData.memory_text || null,
      favorite_part: formData.favorite_part || null,
      rating: formData.rating || null,
      visited_at: formData.visited_at ? new Date(formData.visited_at).toISOString() : new Date().toISOString(),
    }

    try {
      let response
      if (isEditing) {
        response = await fetch(`${API_URL}/memories/${existingMemory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch(`${API_URL}/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')
      const data = await response.json()
      onSaved && onSaved(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  // Empêche le scroll du body quand la modale est ouverte
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #06668C 0%, #02202E 100%)',
          border: '1px solid rgba(164, 189, 1, 0.4)',
          borderRadius: '20px',
          width: '100%', maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(212,175,55,0.15)',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#A4BD01', letterSpacing: '0.14em', marginBottom: '6px',
            }}>
              {isEditing ? '✏️ MODIFIER MON SOUVENIR' : '🏝️ NOUVEAU SOUVENIR'}
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '26px', fontWeight: 600, color: '#EBF2FA',
            }}>
              {place.rawName || place.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: '#427AA1', fontSize: '20px', cursor: 'pointer',
              padding: '4px', lineHeight: 1,
            }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 28px 28px' }}>
          {/* Photo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#427AA1', letterSpacing: '0.08em', marginBottom: '10px',
            }}>📸 AJOUTER UNE PHOTO</label>

            {photoPreview ? (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '180px' }}>
                <img
                  src={photoPreview} alt="Aperçu"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(20,35,29,0.8), transparent)',
                  display: 'flex', alignItems: 'flex-end', padding: '12px',
                  gap: '8px',
                }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'rgba(212,175,55,0.3)', border: '1px solid #A4BD01',
                      color: '#A4BD01', padding: '6px 12px', borderRadius: '6px',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', cursor: 'pointer',
                    }}
                  >↺ Changer</button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      background: 'rgba(168,71,43,0.3)', border: '1px solid #679436',
                      color: '#679436', padding: '6px 12px', borderRadius: '6px',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', cursor: 'pointer',
                    }}
                  >🗑 Supprimer</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(212,175,55,0.4)', borderRadius: '12px',
                  padding: '28px', textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.2)',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.8)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div>
                <div style={{
                  fontFamily: "'Work Sans', sans-serif", fontSize: '13px',
                  color: '#EBF2FA', fontWeight: 500, marginBottom: '4px',
                }}>Ajouter une photo de votre aventure</div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#427AA1',
                }}>JPG, PNG, WEBP — max 5 Mo</div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file" accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Note / Rating */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#427AA1', letterSpacing: '0.08em', marginBottom: '10px',
            }}>⭐ VOTRE NOTE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star} type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '28px', padding: '0 2px',
                    filter: (hoverRating || formData.rating) >= star ? 'none' : 'grayscale(100%) opacity(0.3)',
                    transition: 'filter 0.15s, transform 0.15s',
                    transform: hoverRating === star ? 'scale(1.2)' : 'scale(1)',
                  }}
                >⭐</button>
              ))}
            </div>
          </div>

          {/* Texte du souvenir */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#427AA1', letterSpacing: '0.08em', marginBottom: '8px',
            }}>📝 VOTRE SOUVENIR</label>
            <textarea
              rows="3"
              placeholder="Décrivez cette aventure... Le coucher de soleil était incroyable."
              value={formData.memory_text}
              onChange={e => setFormData(prev => ({ ...prev, memory_text: e.target.value }))}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px',
                padding: '12px', color: '#EBF2FA',
                fontFamily: "'Work Sans', sans-serif", fontSize: '14px',
                resize: 'vertical', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#A4BD01'}
              onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.3)'}
            />
          </div>

          {/* Ce que j'ai préféré */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#427AA1', letterSpacing: '0.08em', marginBottom: '8px',
            }}>❤️ CE QUE J'AI PRÉFÉRÉ</label>
            <input
              type="text"
              placeholder="La plage presque vide en fin de journée."
              value={formData.favorite_part}
              onChange={e => setFormData(prev => ({ ...prev, favorite_part: e.target.value }))}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px',
                padding: '12px', color: '#EBF2FA',
                fontFamily: "'Work Sans', sans-serif", fontSize: '14px',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#A4BD01'}
              onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.3)'}
            />
          </div>

          {/* Date & Heure */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#427AA1', letterSpacing: '0.08em', marginBottom: '8px',
            }}>📅 DATE ET HEURE DE LA VISITE</label>
            <input
              type="datetime-local"
              value={formData.visited_at}
              onChange={e => setFormData(prev => ({ ...prev, visited_at: e.target.value }))}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px',
                padding: '12px', color: '#EBF2FA',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px',
                outline: 'none',
                colorScheme: 'dark',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(168,71,43,0.2)', border: '1px solid #679436',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#E57373',
            }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '14px',
                background: 'transparent', border: '1px solid rgba(156,145,124,0.4)',
                color: '#427AA1', borderRadius: '8px', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                letterSpacing: '0.08em',
              }}
            >ANNULER</button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: '14px',
                background: loading ? 'rgba(212,175,55,0.3)' : 'linear-gradient(135deg, #A4BD01 0%, #679436 100%)',
                border: 'none', color: '#02202E',
                borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
                fontWeight: 'bold', letterSpacing: '0.1em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#02202E' }} />
                  ENREGISTREMENT...
                </>
              ) : (
                isEditing ? '✓ ENREGISTRER LES MODIFICATIONS' : '📖 GARDER MON SOUVENIR'
              )}
            </button>
          </div>

          {!isEditing && (
            <div style={{
              textAlign: 'center', marginTop: '12px',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#427AA1',
            }}>
              Tous les champs sont optionnels — vous pouvez compléter plus tard
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default MemoryModal
