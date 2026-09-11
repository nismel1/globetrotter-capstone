import React, { useState, useContext, useEffect } from 'react'
import { ChatBubbleBottomCenterTextIcon, PlusIcon, HandThumbUpIcon, UserIcon } from '@heroicons/react/24/outline'
import { NotificationContext } from '../context/NotificationContext'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../config'

const INITIAL_CONTRIBUTIONS = [
  {
    id: 'c1',
    author: 'Yannick M.',
    role: 'Habitant de Louis (Libreville)',
    place: 'Bord de Mer - Sainte-Marie',
    category: 'Gourmandise & Culture',
    title: 'Régate de Pirogues du Samedi',
    content: 'Venez vers 16h au bord de mer près de la cathédrale. Les équipes de piroguiers traditionnels s\'entraînent et l\'ambiance avec les vendeurs de cocos frais est magique !',
    votes: 42,
    date: 'Hier',
  },
  {
    id: 'c2',
    author: 'Nadège B.',
    role: 'Guide Locale & Native d\'Akanda',
    place: 'Forêt de Raponda-Walker',
    category: 'Nature & Randonnée',
    title: 'Meilleure heure pour observer les singes à tête du Gabon',
    content: 'Partez vers 7h30 le matin avec un guide local. La brume se lève sur la mangrove et c\'est là qu\'on aperçoit la faune sauvage en toute quiétude.',
    votes: 38,
    date: 'Il y a 3 jours',
  },
  {
    id: 'c3',
    author: 'Brice O.',
    role: 'Chef Maquisard',
    place: 'Okala Plage',
    category: 'Gastronomie',
    title: 'Astuce pour choisir son poisson braisé',
    content: 'Demandez toujours le Capitaine ou la Daurade fraîche du jour pêchée au large de Cap Estérias. Accompagnez avec des bâtons de manioc faits maison !',
    votes: 55,
    date: 'Il y a 5 jours',
  },
]

export default function LocalContributions() {
  const { addNotification } = useContext(NotificationContext)
  const { token } = useContext(AuthContext)
  const [tips, setTips] = useState(INITIAL_CONTRIBUTIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [newTip, setNewTip] = useState({
    title: '',
    place: '',
    category: 'Gastronomie',
    content: '',
    author: '',
  })

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const response = await fetch(`${API_URL}/contributions`)
        if (!response.ok) throw new Error('Erreur lors du chargement')
        const data = await response.json()
        setTips(data.contributions || data || INITIAL_CONTRIBUTIONS)
        setError('')
      } catch (err) {
        setTips(INITIAL_CONTRIBUTIONS)
        setError('Chargement des contributions locales non disponible, affichage de secours.')
      } finally {
        setLoading(false)
      }
    }

    fetchContributions()
  }, [])

  const handleVote = (id) => {
    setTips((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, votes: t.votes + 1 } : t))
      localStorage.setItem('globetrotter_local_tips', JSON.stringify(updated))
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newTip.title || !newTip.content) return

    try {
      const payload = {
        place_name: newTip.place || 'Libreville',
        category: newTip.category,
        tip_text: `${newTip.title}\n${newTip.content}`,
        author_name: newTip.author || 'Habitant Anonyme',
      }

      const response = await fetch(`${API_URL}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('La publication n’a pas pu être enregistrée')
      }

      const created = {
        id: `c-${Date.now()}`,
        author: payload.author,
        role: 'Habitant de Libreville',
        place: payload.place,
        category: payload.category,
        title: payload.title,
        content: payload.content,
        votes: 1,
        date: 'À l’instant',
      }

      const updated = [created, ...tips]
      setTips(updated)
      localStorage.setItem('globetrotter_local_tips', JSON.stringify(updated))
      addNotification('💡 Contribution Publiée !', 'Merci pour votre bon plan Gaboma partagé avec la communauté !', 'success')
      setShowModal(false)
      setNewTip({ title: '', place: '', category: 'Gastronomie', content: '', author: '' })
      setError('')
    } catch (err) {
      setError(err.message)
      addNotification('Erreur', 'La contribution n’a pas pu être enregistrée', 'error')
    }
  }

  return (
    <div
      style={{
        background: 'rgba(2, 32, 46, 0.85)',
        border: '1px solid rgba(164, 189, 1, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.1em' }}>
            🇬ABOMA SECRETS • VOIX LOCALES
          </div>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 'bold', color: '#EBF2FA', marginTop: '2px' }}>
            Contributions & Bons Plans d'Habitants
          </h3>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'linear-gradient(135deg, #A4BD01 0%, #679436 100%)',
            color: '#02202E',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <PlusIcon style={{ width: '16px', height: '16px' }} /> Partager un Bon Plan
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', background: 'rgba(255, 180, 180, 0.08)', border: '1px solid rgba(255, 180, 180, 0.25)', color: '#ffb4b4', borderRadius: '10px', padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{ padding: '16px', color: '#EBF2FA', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>
            Chargement des contributions locales…
          </div>
        ) : (
          tips.map((t) => (
            <div
              key={t.id}
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(164, 189, 1, 0.2)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(164, 189, 1, 0.2)',
                    border: '1px solid #A4BD01',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#A4BD01',
                  }}
                >
                  <UserIcon style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '13px', fontWeight: 'bold', color: '#EBF2FA' }}>
                    {t.author} <span style={{ fontSize: '11px', color: '#427AA1', fontWeight: 'normal' }}>({t.role})</span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01' }}>
                    📍 {t.place} • {t.category}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleVote(t.id)}
                style={{
                  background: 'rgba(164, 189, 1, 0.1)',
                  border: '1px solid rgba(164, 189, 1, 0.3)',
                  color: '#A4BD01',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <HandThumbUpIcon style={{ width: '14px', height: '14px' }} /> {t.votes}
              </button>
            </div>

            <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 'bold', color: '#EBF2FA', margin: '12px 0 4px 0' }}>
              {t.title}
            </h4>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', color: '#427AA1', lineHeight: '1.5', margin: 0 }}>
                "{t.content}"
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal Add Tip */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }}>
          <div style={{ background: '#02202E', border: '1px solid #A4BD01', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '480px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#A4BD01', marginBottom: '16px' }}>
              💡 Proposer un Bon Plan Gaboma
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Votre Nom / Pseudo</label>
                <input type="text" placeholder="Ex: Marc L." value={newTip.author} onChange={(e) => setNewTip({ ...newTip, author: e.target.value })} required style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Titre du bon plan</label>
                <input type="text" placeholder="Ex: Coucher de soleil aux Sablières" value={newTip.title} onChange={(e) => setNewTip({ ...newTip, title: e.target.value })} required style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Lieu concerné</label>
                <input type="text" placeholder="Ex: Quartier Louis / Akanda" value={newTip.place} onChange={(e) => setNewTip({ ...newTip, place: e.target.value })} style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Description & Conseils</label>
                <textarea rows="3" placeholder="Expliquez ce qui fait le charme de ce lieu ou moment..." value={newTip.content} onChange={(e) => setNewTip({ ...newTip, content: e.target.value })} required style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #427AA1', color: '#427AA1', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#A4BD01', color: '#02202E', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Publier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
