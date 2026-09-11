import React, { useState, useContext } from 'react'
import { UserGroupIcon, PlusIcon, ShareIcon, CheckIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { NotificationContext } from '../context/NotificationContext'

const INITIAL_GROUPS = [
  {
    id: 'g1',
    title: 'Pirogue & Week-end Pointe Denis',
    date: 'Samedi 12 Septembre 2026',
    destination: 'Pointe Denis',
    organizer: 'Marc L.',
    members: ['Marc L.', 'Sarah K.', 'Alexandre T.', 'Vous'],
    maxMembers: 8,
    description: 'Sortie en groupe pour réserver un bungalow et partager la pirogue privatisée vers la Pointe Denis.',
  },
  {
    id: 'g2',
    title: 'Circuit Maquis & Grillades du Samedi Soir',
    date: 'Vendredi 18 Septembre 2026',
    destination: 'Quartier Louis & Okala',
    organizer: 'Sandrine N.',
    members: ['Sandrine N.', 'Paul B.'],
    maxMembers: 6,
    description: 'Tournée des meilleurs maquis de la capitale pour déguster capitaines braisés et nyembwe.',
  },
]

export default function GroupOutings({ onSelectGroup }) {
  const { addNotification } = useContext(NotificationContext)
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('globetrotter_groups')
    return saved ? JSON.parse(saved) : INITIAL_GROUPS
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroup, setNewGroup] = useState({
    title: '',
    date: '',
    destination: 'Libreville',
    maxMembers: 6,
    description: '',
  })

  const handleJoin = (id) => {
    setGroups((prev) => {
      const updated = prev.map((g) => {
        if (g.id === id) {
          const isMember = g.members.includes('Vous')
          let newMembers = isMember
            ? g.members.filter((m) => m !== 'Vous')
            : [...g.members, 'Vous']

          addNotification(
            isMember ? 'Sortie quittée' : '👥 Sortie Rejointe !',
            isMember ? `Vous avez quitté "${g.title}"` : `Vous avez rejoint "${g.title}" !`,
            isMember ? 'info' : 'success'
          )
          return { ...g, members: newMembers }
        }
        return g
      })
      localStorage.setItem('globetrotter_groups', JSON.stringify(updated))
      return updated
    })
  }

  const handleCreateGroup = (e) => {
    e.preventDefault()
    if (!newGroup.title || !newGroup.date) return

    const created = {
      id: `g-${Date.now()}`,
      title: newGroup.title,
      date: newGroup.date,
      destination: newGroup.destination,
      organizer: 'Vous',
      members: ['Vous'],
      maxMembers: parseInt(newGroup.maxMembers) || 6,
      description: newGroup.description,
    }

    const updated = [created, ...groups]
    setGroups(updated)
    localStorage.setItem('globetrotter_groups', JSON.stringify(updated))
    addNotification('⭐ Sortie de Groupe Créée !', `La sortie "${created.title}" a été publiée avec succès.`, 'success')
    setShowCreateModal(false)
    setNewGroup({ title: '', date: '', destination: 'Libreville', maxMembers: 6, description: '' })
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
            👥 VOYAGER ENSEMBLE • OFFRES PREMIUM
          </div>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 'bold', color: '#EBF2FA', marginTop: '2px' }}>
            Sorties & Excursions de Groupe
          </h3>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
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
          <PlusIcon style={{ width: '16px', height: '16px' }} /> Créer une Sortie
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {groups.map((g) => {
          const isMember = g.members.includes('Vous')
          const isFull = g.members.length >= g.maxMembers

          return (
            <div
              key={g.id}
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: isMember ? '1px solid #A4BD01' : '1px solid rgba(164, 189, 1, 0.2)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01', background: 'rgba(164, 189, 1, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    📍 {g.destination}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1' }}>
                    📅 {g.date}
                  </span>
                </div>

                <h4 style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#EBF2FA', margin: '4px 0' }}>
                  {g.title}
                </h4>
                <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', color: '#427AA1', margin: '6px 0 12px 0', lineHeight: '1.4' }}>
                  {g.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#EBF2FA' }}>
                    👥 Participants : <strong>{g.members.length} / {g.maxMembers}</strong>
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1' }}>
                    Organisé par {g.organizer}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleJoin(g.id)}
                  disabled={isFull && !isMember}
                  style={{
                    flex: 1,
                    background: isMember ? 'rgba(103, 148, 54, 0.2)' : isFull ? 'rgba(255,255,255,0.05)' : '#A4BD01',
                    color: isMember ? '#E57373' : isFull ? '#427AA1' : '#02202E',
                    border: isMember ? '1px solid #679436' : 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: isFull && !isMember ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isMember ? 'Quitter le groupe' : isFull ? 'Groupe Complet' : 'Rejoindre ➔'}
                </button>

                {onSelectGroup && (
                  <button
                    onClick={() => onSelectGroup(g)}
                    style={{
                      background: 'rgba(2, 32, 46, 0.8)',
                      border: '1px solid rgba(164, 189, 1, 0.4)',
                      color: '#A4BD01',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Dashboard 📊
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }}>
          <div style={{ background: '#02202E', border: '1px solid #A4BD01', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '480px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#A4BD01', marginBottom: '16px' }}>
              👥 Organiser une Sortie de Groupe
            </h3>
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Titre de la sortie</label>
                <input type="text" placeholder="Ex: Excursion Akanda Pirogue" value={newGroup.title} onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })} required style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Date prévue</label>
                <input type="text" placeholder="Ex: Samedi 20 Septembre 2026" value={newGroup.date} onChange={(e) => setNewGroup({ ...newGroup, date: e.target.value })} required style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Nombre max de personnes</label>
                <input type="number" min="2" max="20" value={newGroup.maxMembers} onChange={(e) => setNewGroup({ ...newGroup, maxMembers: e.target.value })} style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Description du projet</label>
                <textarea rows="3" placeholder="Programme, point de ralliement..." value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #427AA1', color: '#427AA1', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#A4BD01', color: '#02202E', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
