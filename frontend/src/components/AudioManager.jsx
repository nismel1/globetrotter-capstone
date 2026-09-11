import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import './AudioManager.css'

export default function AudioManager() {
  const [audios, setAudios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAudio, setEditingAudio] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audio_url: '',
    thumbnail_url: '',
    duration_seconds: '',
    category: 'ambient',
  })

  const loadAudios = async () => {
    const token = localStorage.getItem('auth_token')
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/audios`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Impossible de charger les audios')

      const data = await response.json()
      setAudios(data.audios || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAudios()
  }, [])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_seconds' ? (value ? parseInt(value) : '') : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('auth_token')
    
    if (!formData.title || !formData.audio_url) {
      setError('Titre et URL audio requis')
      return
    }

    try {
      const method = editingAudio ? 'PUT' : 'POST'
      const endpoint = editingAudio ? `/audios/${editingAudio.id}` : '/audios'
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

      setIsFormOpen(false)
      setEditingAudio(null)
      setFormData({
        title: '',
        description: '',
        audio_url: '',
        thumbnail_url: '',
        duration_seconds: '',
        category: 'ambient',
      })
      loadAudios()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (audio) => {
    setEditingAudio(audio)
    setFormData({
      title: audio.title,
      description: audio.description || '',
      audio_url: audio.audio_url,
      thumbnail_url: audio.thumbnail_url || '',
      duration_seconds: audio.duration_seconds || '',
      category: audio.category || 'ambient',
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (audioId) => {
    if (!window.confirm('Êtes-vous sûr?')) return

    const token = localStorage.getItem('auth_token')
    try {
      const response = await fetch(`${API_URL}/audios/${audioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      loadAudios()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setEditingAudio(null)
    setFormData({
      title: '',
      description: '',
      audio_url: '',
      thumbnail_url: '',
      duration_seconds: '',
      category: 'ambient',
    })
  }

  if (loading) return <div className="audio-manager-loading">Chargement des audios...</div>

  return (
    <div className="audio-manager">
      <div className="audio-manager-header">
        <h2>🎵 Gestion des Audios</h2>
        <button className="audio-manager-btn-add" onClick={() => setIsFormOpen(true)}>
          + Ajouter un audio
        </button>
      </div>

      {error && <div className="audio-manager-error">{error}</div>}

      {isFormOpen && (
        <div className="audio-manager-form">
          <h3>{editingAudio ? 'Modifier' : 'Ajouter'} un audio</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="title"
              placeholder="Titre"
              value={formData.title}
              onChange={handleFormChange}
              required
            />
            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleFormChange}
              rows="3"
            />
            <input
              type="url"
              name="audio_url"
              placeholder="URL du fichier audio"
              value={formData.audio_url}
              onChange={handleFormChange}
              required
            />
            <input
              type="url"
              name="thumbnail_url"
              placeholder="URL de la vignette (optionnel)"
              value={formData.thumbnail_url}
              onChange={handleFormChange}
            />
            <input
              type="number"
              name="duration_seconds"
              placeholder="Durée (secondes)"
              value={formData.duration_seconds}
              onChange={handleFormChange}
            />
            <select name="category" value={formData.category} onChange={handleFormChange}>
              <option value="ambient">Ambiant</option>
              <option value="ambient_lofi">Ambiant Lo-Fi</option>
              <option value="nature">Nature</option>
              <option value="urban">Urbain</option>
              <option value="cultural">Culturel</option>
            </select>
            <div className="audio-manager-form-actions">
              <button type="submit" className="audio-manager-btn-save">
                {editingAudio ? 'Mettre à jour' : 'Créer'}
              </button>
              <button type="button" className="audio-manager-btn-cancel" onClick={handleCancel}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="audio-manager-list">
        {audios.length === 0 ? (
          <p>Aucun audio disponible</p>
        ) : (
          audios.map(audio => (
            <div key={audio.id} className="audio-manager-item">
              <div className="audio-manager-item-header">
                <h4>{audio.title}</h4>
                <span className="audio-manager-category">{audio.category}</span>
              </div>
              <p className="audio-manager-item-desc">{audio.description}</p>
              <div className="audio-manager-item-meta">
                <span>⏱️ {audio.duration_seconds ? `${audio.duration_seconds}s` : 'N/A'}</span>
                <span>🔗 <a href={audio.audio_url} target="_blank" rel="noopener noreferrer">Fichier</a></span>
              </div>
              <div className="audio-manager-item-actions">
                <button className="audio-manager-btn-edit" onClick={() => handleEdit(audio)}>
                  Modifier
                </button>
                <button className="audio-manager-btn-delete" onClick={() => handleDelete(audio.id)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
