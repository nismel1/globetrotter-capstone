import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import RouteMap from '../components/RouteMap'
import ShareableVisualCard from '../components/ShareableVisualCard'
import ContextualSuggestions from '../components/ContextualSuggestions'
import InlineItineraryChatbot from '../components/InlineItineraryChatbot'
import { API_URL } from '../config'
import { trackEvent } from '../api/tracking'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Les jours de DEFAULT_ITINERARY ont des ids locaux ('day-1') que le backend refuse.
const isPersisted = (id) => typeof id === 'string' && UUID_RE.test(id)

const DEFAULT_ITINERARY = {
  id: 'local-itin-1',
  title: 'Itinéraire — Libreville & Côte Gabonaise',
  start_date: '2026-09-01',
  end_date: '2026-09-03',
  days: [
    {
      id: 'day-1',
      day_number: 1,
      date: '2026-09-01',
      activities: [
        {
          id: 'act-1',
          time: '09:30',
          place_name: 'Visite de la Cathédrale Sainte-Marie',
          duration_minutes: 60,
          notes: 'Edifice historique inauguré en 1863 au bord de l’estuaire.',
          cover_image: 'https://images.unsplash.com/photo-1548625361-1858a7354964?auto=format&fit=crop&w=400&q=80',
        },
        {
          id: 'act-2',
          time: '12:30',
          place_name: 'Déjeuner Nyembwe au Quartier Louis',
          duration_minutes: 90,
          notes: 'Dégustation du Poulet Nyembwe dans un maquis réputé.',
          cover_image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        },
        {
          id: 'act-3',
          time: '15:30',
          place_name: 'Promenade au Bord de Mer de Libreville',
          duration_minutes: 120,
          notes: 'Balade relaxante le long de la baie avec vue sur l’Atlantique.',
          cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
        },
      ],
    },
    {
      id: 'day-2',
      day_number: 2,
      date: '2026-09-02',
      activities: [
        {
          id: 'act-4',
          time: '09:00',
          place_name: 'Excursion Pirogue vers la Pointe Denis',
          duration_minutes: 240,
          notes: 'Traversée en pirogue et journée plage paradisiaque.',
          cover_image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80',
        },
      ],
    },
    {
      id: 'day-3',
      day_number: 3,
      date: '2026-09-03',
      activities: [
        {
          id: 'act-5',
          time: '10:00',
          place_name: 'Visite du Musée National des Arts & Traditions',
          duration_minutes: 120,
          notes: 'Découverte des masques d’ancêtres et sculptures sacrées.',
          cover_image: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=400&q=80',
        },
      ],
    },
  ],
}

function ItineraryPage() {
  const navigate = useNavigate()
  const [activeDay, setActiveDay] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingActivityId, setEditingActivityId] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [showShareVisualModal, setShowShareVisualModal] = useState(false)
  const [dbItineraries, setDbItineraries] = useState([])
  const [places, setPlaces] = useState([])

  const [activeItinerary, setActiveItinerary] = useState(() => {
    const saved = localStorage.getItem('globetrotter_active_itin')
    return saved ? JSON.parse(saved) : DEFAULT_ITINERARY
  })
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Carte OSRM
  const [showMap, setShowMap] = useState(true)
  const [routeMode, setRouteMode] = useState('route') // 'route' | 'trip'
  const [routeProfile, setRouteProfile] = useState('driving') // 'driving' | 'walking' | 'cycling'
  const [routeSummary, setRouteSummary] = useState(null)

  // Coordonnées GPS intelligentes par défaut pour les lieux de Libreville
  const getGPSForActivity = (title = '', place = null, index = 0) => {
    if (place?.latitude && place?.longitude) {
      return { lat: parseFloat(place.latitude), lon: parseFloat(place.longitude) }
    }

    const t = title.toLowerCase()
    if (t.includes('pointe denis')) return { lat: 0.3100, lon: 9.3600 }
    if (t.includes('cathédrale') || t.includes('sainte-marie')) return { lat: 0.3950, lon: 9.4480 }
    if (t.includes('louis') || t.includes('maquis') || t.includes('carre')) return { lat: 0.4050, lon: 9.4400 }
    if (t.includes('musée') || t.includes('arts')) return { lat: 0.3920, lon: 9.4530 }
    if (t.includes('mont-bouët') || t.includes('marché')) return { lat: 0.3900, lon: 9.4580 }
    if (t.includes('cap estérias') || t.includes('mondah') || t.includes('raponda')) return { lat: 0.6200, lon: 9.3300 }
    if (t.includes('sablière') || t.includes('akanda') || t.includes('okala')) return { lat: 0.4500, lon: 9.4200 }
    if (t.includes('palais') || t.includes('boulevard') || t.includes('triomphal')) return { lat: 0.4000, lon: 9.4450 }
    if (t.includes('bord de mer') || t.includes('corniche')) return { lat: 0.3930, lon: 9.4470 }

    return {
      lat: 0.3924 + (index * 0.012),
      lon: 9.4536 + (index * 0.015),
    }
  }

  const fetchItineraryDetails = async (itinId) => {
    const token = localStorage.getItem('auth_token')
    if (!itinId || !token) return
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/itineraries/${itinId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.days) {
          setActiveItinerary(data)
          localStorage.setItem('globetrotter_active_itin', JSON.stringify(data))
        }
        trackEvent('itinerary_viewed', { itinerary_id: itinId })
      }
    } catch (e) {
      console.error('Failed to fetch itinerary:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const activeId = localStorage.getItem('active_itinerary_id')

    fetch(`${API_URL}/places`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : { places: [] })
      .then((data) => setPlaces(data.places || []))
      .catch(() => setPlaces([]))

    if (token) {
      fetch(`${API_URL}/users/me/itineraries`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setDbItineraries(data)
            const targetId = activeId || data[0].id
            fetchItineraryDetails(targetId)
          }
        })
        .catch(() => {})
    }
  }, [])

  const handleAddSuggestedFromChatbot = (suggestion) => {
    const newActObj = {
      id: `act-${Date.now()}`,
      time: suggestion.time || '14:00',
      place_name: suggestion.label || suggestion.title || 'Activité Suggérée',
      duration_minutes: parseInt(suggestion.duration) || 60,
      notes: suggestion.desc || suggestion.reason || 'Suggéré par l’Assistant IA Globetrotter',
      cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    }

    setActiveItinerary((prev) => {
      const base = prev || DEFAULT_ITINERARY
      const updatedDays = (base.days || []).map((d, i) => {
        if ((d.day_number || i + 1) === activeDay) {
          return { ...d, activities: [...(d.activities || []), newActObj] }
        }
        return d
      })
      const updated = { ...base, days: updatedDays }
      localStorage.setItem('globetrotter_active_itin', JSON.stringify(updated))
      return updated
    })

    // Optionally call backend if authenticated
    const token = localStorage.getItem('auth_token')
    const currentDayObj = activeItinerary?.days?.find((d, i) => (d.day_number || i + 1) === activeDay)
    const placeId = places[0]?.id
    if (token && isPersisted(currentDayObj?.id) && placeId) {
      fetch(`${API_URL}/days/${currentDayObj.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          place_id: placeId,
          time: newActObj.time,
          duration_minutes: newActObj.duration_minutes,
          notes: `${newActObj.place_name} - ${newActObj.notes}`,
        }),
      }).catch(() => {})
    }
  }

  useEffect(() => {
    if (!activeItinerary || places.length === 0) return
    const pendingPlace = localStorage.getItem('pending_itinerary_place')
    if (!pendingPlace) return
    try {
      const { id, name } = JSON.parse(pendingPlace)
      setNewAct((current) => ({ ...current, placeId: id, title: name }))
      setShowAddModal(true)
      localStorage.removeItem('pending_itinerary_place')
    } catch (error) {
      localStorage.removeItem('pending_itinerary_place')
    }
  }, [activeItinerary, places])

  const days = activeItinerary?.days && activeItinerary.days.length > 0
    ? activeItinerary.days.map((d, i) => ({
        id: d.id,
        day: d.day_number || i + 1,
        location: d.date ? `Jour ${d.day_number}` : 'Libreville',
      }))
    : []

  const currentDayObject = activeItinerary?.days?.find((d, i) => (d.day_number || i + 1) === activeDay)

  const currentActivities = (currentDayObject?.activities || []).map((a) => ({
    id: a.id,
    time: a.time ? a.time.substring(0, 5) : '10:00',
    title: a.place_name || a.notes || 'Activité d’exploration',
    duration: `${a.duration_minutes || 60}min`,
    description: a.notes || 'Visite enregistrée dans votre itinéraire.',
    image: a.cover_image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    transfer: null,
  }))

  // Dynamic statistics calculations
  const totalDaysCount = days.length || 1
  const totalActivitiesCount = activeItinerary?.days?.reduce((total, day) => total + (day.activities?.length || 0), 0) || 0
  const totalTrajetsCount = routeSummary?.legs?.length || 0
  const uniquePlacesCount = new Set(
    (activeItinerary?.days || []).flatMap(d => (d.activities || []).map(a => a.place_id)).filter(Boolean)
  ).size || (totalActivitiesCount > 0 ? Math.min(totalActivitiesCount, 4) : 0)

  const [newAct, setNewAct] = useState({
    time: '14:30',
    placeId: '',
    title: '',
    duration: '60',
    description: '',
  })

  const handleAddActivity = async (e) => {
    e.preventDefault()
    setFormError('')

    const newActObj = {
      id: editingActivityId || `act-${Date.now()}`,
      time: newAct.time || '10:00',
      place_name: newAct.title || 'Nouvelle activité',
      duration_minutes: parseInt(newAct.duration) || 60,
      notes: newAct.description || 'Visite enregistrée',
      cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    }

    setActiveItinerary((prev) => {
      const base = prev || DEFAULT_ITINERARY
      const updatedDays = (base.days || []).map((d, i) => {
        if ((d.day_number || i + 1) === activeDay) {
          const acts = editingActivityId
            ? (d.activities || []).map((a) => (a.id === editingActivityId ? { ...a, ...newActObj } : a))
            : [...(d.activities || []), newActObj]
          return { ...d, activities: acts }
        }
        return d
      })
      const updated = { ...base, days: updatedDays }
      localStorage.setItem('globetrotter_active_itin', JSON.stringify(updated))
      return updated
    })

    let placeIdToUse = newAct.placeId || places[0]?.id
    const token = localStorage.getItem('auth_token')
    const dayId = currentDayObject?.id
    const canSync = token && placeIdToUse && (editingActivityId ? isPersisted(editingActivityId) : isPersisted(dayId))

    if (canSync) {
      try {
        await fetch(editingActivityId
          ? `${API_URL}/activities/${editingActivityId}`
          : `${API_URL}/days/${dayId}/activities`, {
          method: editingActivityId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            place_id: placeIdToUse,
            time: newAct.time || '10:00',
            duration_minutes: parseInt(newAct.duration) || 60,
            notes: `${newAct.title || 'Nouvelle activité'} - ${newAct.description || ''}`,
          }),
        })
      } catch (err) {}
    }

    setNewAct({ time: '14:30', placeId: '', title: '', duration: '60', description: '' })
    setEditingActivityId(null)
    setShowAddModal(false)
  }

  const handleEditActivity = (activity) => {
    setEditingActivityId(activity.id)
    setNewAct({
      time: activity.time,
      placeId: '',
      title: activity.title,
      duration: String(parseInt(activity.duration, 10) || 60),
      description: activity.description,
    })
    setFormError('')
    setShowAddModal(true)
  }

  const handleDeleteActivity = async (id) => {
    setActiveItinerary((prev) => {
      if (!prev) return prev
      const updatedDays = (prev.days || []).map((d) => ({
        ...d,
        activities: (d.activities || []).filter((a) => a.id !== id),
      }))
      const updated = { ...prev, days: updatedDays }
      localStorage.setItem('globetrotter_active_itin', JSON.stringify(updated))
      return updated
    })

    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        await fetch(`${API_URL}/activities/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {}
    }
  }

  const handleShare = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token || !activeItinerary?.id || activeItinerary.id === DEFAULT_ITINERARY.id) {
      alert('Enregistrez d’abord cet itinéraire pour créer un lien de partage.')
      return
    }
    const response = await fetch(`${API_URL}/itineraries/${activeItinerary.id}/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      alert('Le lien de partage n’a pas pu être créé.')
      return
    }
    const { share_token: shareToken } = await response.json()
    const url = `${window.location.origin}/itineraire/${shareToken}`
    const shareData = { title: activeItinerary?.title || 'Mon itinéraire', url }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }
      await navigator.clipboard.writeText(url)
      alert('Lien de votre itinéraire copié dans le presse-papier !')
    } catch (error) {
      if (error.name !== 'AbortError') alert(`Lien d'itinéraire : ${url}`)
    }
  }

  const handleExport = (format = 'json') => {
    if (!activeItinerary) {
      alert('Aucun itinéraire à exporter.')
      return
    }
    if (format === 'print') {
      setShowExportMenu(false)
      window.print()
      return
    }
    const data = format === 'ics'
      ? ['BEGIN:VCALENDAR', 'VERSION:2.0', `X-WR-CALNAME:${activeItinerary.title || 'Itinéraire'}`,
        ...(activeItinerary.days || []).flatMap((day) => (day.activities || []).map((activity) => [
          'BEGIN:VEVENT', `SUMMARY:${activity.place_name || activity.notes || 'Activité'}`,
          `DTSTART:${String(day.date || '').replaceAll('-', '')}T${String(activity.time || '10:00:00').replaceAll(':', '').slice(0, 6)}`,
          `DURATION:PT${activity.duration_minutes || 60}M`, 'END:VEVENT',
        ])), 'END:VCALENDAR'].join('\r\n')
      : JSON.stringify(activeItinerary, null, 2)
    const mimeType = format === 'ics' ? 'text/calendar' : 'application/json'
    const extension = format === 'ics' ? 'ics' : 'json'
    const dataStr = `data:${mimeType};charset=utf-8,` + encodeURIComponent(data)
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `itineraire_${activeItinerary.title || 'globetrotter'}.${extension}`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    setShowExportMenu(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar audioActive={true} onToggleAudio={() => {}} />

      <div className="app-container">
        {/* Header Title Section (Wireframe 5) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 600, color: '#EBF2FA' }}>
                {activeItinerary?.title || 'Itinéraire — Libreville & Côte Gabonaise'} ✏️
              </h1>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1', marginTop: '4px' }}>
              {activeItinerary?.start_date && activeItinerary?.end_date
                ? `${new Date(activeItinerary.start_date).toLocaleDateString('fr-FR')} - ${new Date(activeItinerary.end_date).toLocaleDateString('fr-FR')}`
                : 'Dates non définies'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowShareVisualModal(true)}
              style={{ background: 'linear-gradient(135deg, #A4BD01 0%, #679436 100%)', color: '#02202E', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}
            >
              🎴 Carte Visuelle
            </button>
            <button
              onClick={handleShare}
              style={{ background: 'rgba(2, 32, 46, 0.8)', border: '1px solid rgba(164, 189, 1, 0.4)', color: '#EBF2FA', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}
            >
              🔗 Partager
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu((open) => !open)}
                style={{ background: 'rgba(2, 32, 46, 0.8)', border: '1px solid rgba(164, 189, 1, 0.4)', color: '#EBF2FA', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}
              >
                📥 Exporter ⌄
              </button>
              {showExportMenu && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 5, minWidth: '150px', background: '#02202E', border: '1px solid rgba(212,175,55,0.5)', borderRadius: '6px', padding: '6px' }}>
                  <button onClick={() => handleExport('json')} style={{ display: 'block', width: '100%', padding: '8px', background: 'transparent', border: 0, color: '#EBF2FA', textAlign: 'left', cursor: 'pointer' }}>📄 JSON</button>
                  <button onClick={() => handleExport('ics')} style={{ display: 'block', width: '100%', padding: '8px', background: 'transparent', border: 0, color: '#EBF2FA', textAlign: 'left', cursor: 'pointer' }}>📅 Calendrier</button>
                  <button onClick={() => handleExport('print')} style={{ display: 'block', width: '100%', padding: '8px', background: 'transparent', border: 0, color: '#EBF2FA', textAlign: 'left', cursor: 'pointer' }}>🖨️ Impression</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Contextual Suggestions Banner */}
        <ContextualSuggestions onSelectActivity={handleAddSuggestedFromChatbot} />

        {/* Horizontal Day Selector Bar (Wireframe 5) */}
        <div
          style={{
            background: 'rgba(2, 32, 46, 0.8)',
            border: '1px solid rgba(164, 189, 1, 0.25)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setActiveDay((prev) => Math.max(1, prev - 1))}
            style={{ background: 'transparent', border: 'none', color: '#427AA1', cursor: 'pointer', fontSize: '16px' }}
          >
            ‹
          </button>

          <div style={{ display: 'flex', gap: '12px', flex: 1, overflowX: 'auto' }}>
            {days.map((d) => {
              const isActive = activeDay === d.day
              return (
                <div
                  key={d.day}
                  onClick={() => setActiveDay(d.day)}
                  style={{
                    background: isActive ? 'rgba(164, 189, 1, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    border: isActive ? '1px solid #A4BD01' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    minWidth: '120px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: isActive ? '#A4BD01' : '#EBF2FA' }}>
                    Jour {d.day}
                  </div>
                  <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '10px', color: '#427AA1' }}>
                    {d.location}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => setActiveDay((prev) => Math.min(days.length || 1, prev + 1))}
            style={{ background: 'transparent', border: 'none', color: '#427AA1', cursor: 'pointer', fontSize: '16px' }}
          >
            ›
          </button>
        </div>

        {/* Main Grid Layout: Vertical Timeline (Left) + Summary Sidebar (Right) */}
        <div className="wireframe-grid-itinerary">
          {/* Vertical Chronological Timeline Column */}
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.12em', marginBottom: '16px' }}>
              📅 TIMELINE CHRONOLOGIQUE — JOUR {activeDay} ({days.find(d => d.day === activeDay)?.location || 'Libreville'})
            </div>

            {loading ? (
              <div style={{ background: 'rgba(2, 32, 46, 0.5)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#A4BD01' }}>
                Chargement de la timeline...
              </div>
            ) : currentActivities.length === 0 ? (
              <div style={{ background: 'rgba(2, 32, 46, 0.5)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#427AA1' }}>
                Aucune activité prévue pour ce jour. Ajoutez-en une ci-dessous !
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                {currentActivities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                    {/* Time Node */}
                    <div style={{ width: '60px', flexShrink: 0, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#A4BD01', fontWeight: 'bold', paddingTop: '4px' }}>
                      {act.time}
                    </div>

                    {/* Timeline Circle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#A4BD01', border: '2px solid #02202E', boxShadow: '0 0 8px #A4BD01', zIndex: 2 }} />
                      <div style={{ flex: 1, width: '2px', background: 'rgba(164, 189, 1, 0.3)', marginTop: '4px' }} />
                    </div>

                    {/* Activity Card */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          background: 'rgba(2, 32, 46, 0.85)',
                          border: '1px solid rgba(164, 189, 1, 0.25)',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          gap: '16px',
                          alignItems: 'center',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        <img
                          src={act.image}
                          alt={act.title}
                          style={{ width: '100px', height: '70px', borderRadius: '8px', objectFit: 'cover' }}
                        />

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#EBF2FA' }}>
                              {act.title}
                            </h3>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01', background: 'rgba(164, 189, 1, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                              ⏱️ {act.duration}
                            </span>
                          </div>

                          <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', color: '#427AA1', marginTop: '4px', margin: 0 }}>
                            {act.description}
                          </p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEditActivity(act)}
                            style={{ background: 'transparent', border: '1px solid rgba(164, 189, 1, 0.4)', color: '#A4BD01', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Modifier l'activité"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(act.id)}
                            style={{ background: 'transparent', border: '1px solid rgba(103, 148, 54, 0.4)', color: '#679436', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Supprimer l'activité"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Carte OSRM ── */}
            {currentActivities.length >= 2 && (
              <div style={{ marginTop: '28px' }}>
                {/* Barre de contrôle carte */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  flexWrap: 'wrap', marginBottom: '12px',
                }}>
                  <button
                    onClick={() => setShowMap((v) => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', borderRadius: '8px',
                      background: showMap ? 'rgba(164,189,1,0.15)' : 'rgba(2,32,46,0.6)',
                      border: `1px solid ${showMap ? '#A4BD01' : 'rgba(66,122,161,0.4)'}`,
                      color: showMap ? '#A4BD01' : '#427AA1',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                      cursor: 'pointer', letterSpacing: '0.06em',
                    }}
                  >
                    🗺 {showMap ? 'Masquer la carte' : 'Voir sur la carte'}
                  </button>

                  {showMap && (
                    <>
                      {/* Mode */}
                      <select
                        value={routeMode}
                        onChange={(e) => setRouteMode(e.target.value)}
                        style={{
                          background: 'rgba(2,32,46,0.8)',
                          border: '1px solid rgba(66,122,161,0.4)',
                          color: '#EBF2FA', padding: '7px 10px', borderRadius: '6px',
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', cursor: 'pointer',
                        }}
                      >
                        <option value="route">→ Ordre séquentiel</option>
                        <option value="trip">✦ Ordre optimisé</option>
                      </select>

                      {/* Profil */}
                      <select
                        value={routeProfile}
                        onChange={(e) => setRouteProfile(e.target.value)}
                        style={{
                          background: 'rgba(2,32,46,0.8)',
                          border: '1px solid rgba(66,122,161,0.4)',
                          color: '#EBF2FA', padding: '7px 10px', borderRadius: '6px',
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', cursor: 'pointer',
                        }}
                      >
                        <option value="driving">🚗 Voiture</option>
                        <option value="walking">🚶 À pied</option>
                        <option value="cycling">🚲 Vélo</option>
                      </select>
                    </>
                  )}
                </div>

                {/* Composant RouteMap */}
                {showMap && (() => {
                  const placesById = Object.fromEntries(
                    places.map((p) => [p.id, p])
                  )
                  const waypoints = currentActivities.map((act, idx) => {
                    const rawAct = currentDayObject?.activities?.find((a) => a.id === act.id)
                    const place = placesById[rawAct?.place_id]
                    const coords = getGPSForActivity(act.title, place, idx)
                    return {
                      id: act.id,
                      name: act.title,
                      lat: coords.lat,
                      lon: coords.lon,
                    }
                  })

                  if (waypoints.length < 2) {
                    return (
                      <div style={{
                        padding: '16px', borderRadius: '10px',
                        background: 'rgba(66,122,161,0.08)',
                        border: '1px solid rgba(66,122,161,0.2)',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                        color: '#427AA1',
                      }}>
                        Les coordonnées GPS de ces lieux ne sont pas encore renseignées dans le catalogue.
                      </div>
                    )
                  }

                  return (
                    <RouteMap
                      waypoints={waypoints}
                      mode={routeMode}
                      profile={routeProfile}
                      height="380px"
                      onResult={(result) => setRouteSummary(result.summary)}
                    />
                  )
                })()}
              </div>
            )}

            {/* "+ AJOUTER UNE ACTIVITÉ" Dashed Button */}
            <button
              onClick={() => { setFormError(''); setShowAddModal(true); }}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                background: 'rgba(164, 189, 1, 0.05)',
                border: '2px dashed #A4BD01',
                borderRadius: '12px',
                color: '#A4BD01',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <span>➕</span> AJOUTER UNE ACTIVITÉ
            </button>
          </div>

          {/* Right Sidebar Summary & Budget Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Résumé de l'itinéraire Card */}
            <div
              style={{
                background: 'rgba(2, 32, 46, 0.85)',
                border: '1px solid rgba(164, 189, 1, 0.25)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.12em', marginBottom: '16px' }}>
                📊 RÉSUMÉ DE L'ITINÉRAIRE
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#427AA1' }}>⏱️ Durée totale :</span>
                  <span style={{ color: '#EBF2FA', fontWeight: 'bold' }}>{totalDaysCount} jours</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#427AA1' }}>🎯 Activités :</span>
                  <span style={{ color: '#EBF2FA', fontWeight: 'bold' }}>{totalActivitiesCount} activités</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#427AA1' }}>🚘 Transports :</span>
                  <span style={{ color: '#EBF2FA', fontWeight: 'bold' }}>{totalTrajetsCount ? `${totalTrajetsCount} tronçons` : 'Calculer sur la carte'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#427AA1' }}>📍 Destinations :</span>
                  <span style={{ color: '#EBF2FA', fontWeight: 'bold' }}>{uniquePlacesCount} lieux</span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(164, 189, 1, 0.2)', margin: '20px 0' }} />

              {/* Budget Estimé Section */}
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.12em', marginBottom: '12px' }}>
                💶 BUDGET
              </div>

              <div style={{ fontSize: '28px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 'bold', color: '#EBF2FA' }}>
                Non disponible
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '16px' }}>
                Ajoutez des tarifs aux lieux et aux services pour obtenir un budget fiable.
              </div>
            </div>

            {/* Integrated Embedded AI Assistant Chatbot */}
            <InlineItineraryChatbot
              activeDay={activeDay}
              onAddSuggestedActivity={handleAddSuggestedFromChatbot}
            />

            <button
              onClick={() => setShowTipsModal(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(2, 32, 46, 0.8)',
                border: '1px solid rgba(164, 189, 1, 0.3)',
                color: '#EBF2FA',
                borderRadius: '10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              💡 Conseils pour ce jour
            </button>
          </div>
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#02202E',
              border: '1px solid #A4BD01',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '480px',
            }}
          >
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#A4BD01', marginBottom: '16px' }}>
              {editingActivityId ? 'Modifier l’activité' : `Ajouter une activité au Jour ${activeDay}`}
            </h3>

            {formError && (
              <div style={{ background: 'rgba(168,71,43,0.3)', border: '1px solid #679436', color: '#E57373', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddActivity}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Lieu</label>
                <select
                  value={newAct.placeId}
                  onChange={(e) => {
                    const selectedPlace = places.find((place) => place.id === e.target.value)
                    setNewAct({ ...newAct, placeId: e.target.value, title: selectedPlace?.rawName || newAct.title })
                  }}
                  required
                  style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }}
                >
                  <option value="">Sélectionnez un lieu</option>
                  {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Heure</label>
                <input
                  type="time"
                  value={newAct.time}
                  onChange={(e) => setNewAct({ ...newAct, time: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Titre de l'activité</label>
                <input
                  type="text"
                  placeholder="Ex. : Visite de la Baie des Tortues"
                  value={newAct.title}
                  onChange={(e) => setNewAct({ ...newAct, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Durée (minutes)</label>
                <input
                  type="number"
                  placeholder="Ex. : 60"
                  value={newAct.duration}
                  onChange={(e) => setNewAct({ ...newAct, duration: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginBottom: '4px' }}>Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Notes ou détails..."
                  value={newAct.description}
                  onChange={(e) => setNewAct({ ...newAct, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setEditingActivityId(null); setShowAddModal(false) }}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #427AA1', color: '#427AA1', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#A4BD01', color: '#02202E', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {editingActivityId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tips Modal */}
      {showTipsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#02202E',
              border: '1px solid #A4BD01',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '480px',
            }}
          >
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: '#A4BD01', marginBottom: '16px' }}>
              💡 Conseils pour le Jour {activeDay}
            </h3>

            <ul style={{ paddingLeft: '20px', fontFamily: "'Work Sans', sans-serif", fontSize: '14px', lineHeight: '1.6', color: '#EBF2FA' }}>
              <li style={{ marginBottom: '8px' }}>Prenez des vêtements légers et anti-UV pour la pirogue.</li>
              <li style={{ marginBottom: '8px' }}>Prévoyez de la monnaie locale (FCFA) pour le marché et les pourboires.</li>
              <li style={{ marginBottom: '8px' }}>Respectez la faune marine (ne pas approcher les tortues à moins de 5 mètres).</li>
            </ul>

            <button
              onClick={() => setShowTipsModal(false)}
              style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#A4BD01', color: '#02202E', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Shareable Visual Card Modal */}
      {showShareVisualModal && (
        <ShareableVisualCard
          itinerary={activeItinerary}
          onClose={() => setShowShareVisualModal(false)}
        />
      )}
    </div>
  )
}

export default ItineraryPage
