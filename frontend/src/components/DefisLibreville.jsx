import React, { useState, useContext, useEffect } from 'react'
import {
  AcademicCapIcon,
  BoltIcon,
  BuildingLibraryIcon,
  CameraIcon,
  CheckCircleIcon,
  ChartBarIcon,
  FireIcon,
  MapPinIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { NotificationContext } from '../context/NotificationContext'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../config'

const INITIAL_MISSIONS = [
  {
    id: 'm1',
    category: 'Gastronomie',
    title: 'Déguster le Poulet Nyembwe',
    description: 'Rendez-vous dans un maquis du Quartier Louis et savourez le plat national gabonais.',
    xp: 150,
    badge: 'Gourmet Gaboma',
    completed: false,
  },
  {
    id: 'm2',
    category: 'Patrimoine',
    title: 'Visite de la Cathédrale Sainte-Marie',
    description: 'Admirez la façade historique et le vitrail d\'ébène sculpté de la cathédrale.',
    xp: 200,
    badge: 'Historien LBV',
    completed: true,
  },
  {
    id: 'm3',
    category: 'Nature',
    title: 'Traversée vers la Pointe Denis',
    description: 'Embarquez en pirogue à Michel Marine et passez une journée sur les plages de sable blanc.',
    xp: 250,
    badge: 'Navigateur de l\'Estuaire',
    completed: false,
  },
  {
    id: 'm4',
    category: 'Photo',
    title: 'Selfie devant la Statue de la Liberté',
    description: 'Prenez une photo souvenir devant le monument du Bord de Mer de Libreville.',
    xp: 100,
    badge: 'Photographe Côtier',
    completed: false,
  },
  {
    id: 'm5',
    category: 'Artisanat',
    title: 'Visite du Musée National des Arts',
    description: 'Découvrez les masques d\'ancêtres de la vallée de l\'Ogooué au Musée National.',
    xp: 180,
    badge: 'Gardien du Patrimoine',
    completed: false,
  },
]

const CATEGORY_ICONS = {
  Gastronomie: FireIcon,
  Patrimoine: BuildingLibraryIcon,
  Nature: MapPinIcon,
  Photo: CameraIcon,
  Artisanat: PaintBrushIcon,
}

export default function DefisLibreville() {
  const { addNotification } = useContext(NotificationContext)
  const { token } = useContext(AuthContext)
  const [missions, setMissions] = useState(() => {
    const saved = localStorage.getItem('globetrotter_defis')
    return saved ? JSON.parse(saved) : INITIAL_MISSIONS
  })
  const [selectedCat, setSelectedCat] = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch(`${API_URL}/missions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!response.ok) throw new Error('Impossible de charger les missions')

        const data = await response.json()
        const list = Array.isArray(data) ? data : (data.missions || [])
        if (list.length > 0) {
          setMissions(list)
          localStorage.setItem('globetrotter_defis', JSON.stringify(list))
          setError('')
        }
      } catch (err) {
        setError('Service missions indisponible, affichage de secours.')
      } finally {
        setLoading(false)
      }
    }

    fetchMissions()
  }, [token])

  const totalXP = missions.filter((m) => m.completed).reduce((acc, m) => acc + Number(m.xp || 0), 0)
  const userLevel = Math.floor(totalXP / 200) + 1
  const xpToNext = (userLevel * 200) - totalXP

  const toggleMission = (id) => {
    setMissions((prev) => {
      const updated = prev.map((m) => {
        if (m.id === id) {
          const nextState = !m.completed
          if (nextState) {
            addNotification(
              'Défi accompli !',
              `Vous avez réussi "${m.title}" et gagné +${m.xp} XP. Badge ${m.badge} débloqué.`,
              'success'
            )
          }
          return { ...m, completed: nextState }
        }
        return m
      })
      localStorage.setItem('globetrotter_defis', JSON.stringify(updated))
      return updated
    })
  }

  const categories = ['Tous', 'Gastronomie', 'Patrimoine', 'Nature', 'Photo', 'Artisanat']

  const filteredMissions = selectedCat === 'Tous'
    ? missions
    : missions.filter((m) => m.category === selectedCat)

  return (
    <div
      style={{
        background: 'rgba(2, 32, 46, 0.85)',
        border: '1px solid rgba(164, 189, 1, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(164, 189, 1, 0.15) 0%, rgba(103, 148, 54, 0.15) 100%)',
          border: '1px solid #A4BD01',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.1em' }}>
            <ShieldCheckIcon style={{ width: '16px', height: '16px' }} />
            <span>DÉFIS LIBREVILLE • XP VOYAGEUR</span>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 'bold', color: '#EBF2FA', marginTop: '2px' }}>
            Niveau {userLevel} — Explorer Gaboma
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginTop: '4px' }}>
            {totalXP} XP accumulés • encore {xpToNext} XP pour le niveau suivant
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <TrophyIcon style={{ width: '36px', height: '36px', color: '#A4BD01', margin: '0 auto' }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 'bold', color: '#679436', marginTop: '4px' }}>
            {missions.filter((m) => m.completed).length} / {missions.length} accomplis
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            style={{
              background: selectedCat === cat ? '#A4BD01' : 'rgba(0, 0, 0, 0.4)',
              color: selectedCat === cat ? '#02202E' : '#EBF2FA',
              border: selectedCat === cat ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: '16px', background: 'rgba(255, 180, 180, 0.08)', border: '1px solid rgba(255, 180, 180, 0.25)', color: '#ffb4b4', borderRadius: '10px', padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ padding: '12px', color: '#EBF2FA', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>
            Chargement des défis…
          </div>
        ) : (
          filteredMissions.map((m) => {
            const CategoryIcon = CATEGORY_ICONS[m.category] || SparklesIcon

            return (
              <div
                key={m.id}
                style={{
                  background: m.completed ? 'rgba(103, 148, 54, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                  border: m.completed ? '1px solid #679436' : '1px solid rgba(164, 189, 1, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01', background: 'rgba(164, 189, 1, 0.15)', padding: '4px 8px', borderRadius: '4px' }}>
                    <CategoryIcon style={{ width: '12px', height: '12px' }} />
                    {m.category}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#679436' }}>
                    <BoltIcon style={{ width: '12px', height: '12px' }} />
                    +{m.xp} XP
                  </span>
                </div>

                <h4 style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '15px', fontWeight: 'bold', color: '#EBF2FA', margin: '6px 0 2px 0' }}>
                  {m.title}
                </h4>
                <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', color: '#427AA1', margin: 0 }}>
                  {m.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01', marginTop: '6px' }}>
                  <AcademicCapIcon style={{ width: '12px', height: '12px' }} />
                  {m.badge}
                </div>
              </div>

              <button
                onClick={() => toggleMission(m.id)}
                style={{
                  background: m.completed ? '#679436' : 'rgba(164, 189, 1, 0.2)',
                  color: m.completed ? '#FFF' : '#A4BD01',
                  border: m.completed ? 'none' : '1px solid #A4BD01',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.completed ? <CheckCircleIcon style={{ width: '16px', height: '16px' }} /> : <SparklesIcon style={{ width: '16px', height: '16px' }} />}
                {m.completed ? 'Accompli !' : 'Valider'}
              </button>
            </div>
          )
          })
        )}
      </div>
    </div>
  )
}
