import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_URL } from '../config'

export default function SharedItineraryPage() {
  const { shareToken } = useParams()
  const [itinerary, setItinerary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/public/itineraries/${shareToken}`)
      .then(async response => {
        if (!response.ok) throw new Error('Cet itinéraire partagé est introuvable ou n’est plus public.')
        return response.json()
      })
      .then(setItinerary)
      .catch(requestError => setError(requestError.message))
  }, [shareToken])

  return <main style={{ minHeight: '100vh', padding: '48px 24px', background: '#02202E', color: '#EBF2FA', fontFamily: "'Work Sans', sans-serif" }}>
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <Link to="/login" style={{ color: '#A4BD01' }}>Globetrotter</Link>
      {error && <p role="alert" style={{ marginTop: '48px', color: '#E57373' }}>{error}</p>}
      {!error && !itinerary && <p style={{ marginTop: '48px', color: '#427AA1' }}>Chargement de l’itinéraire...</p>}
      {itinerary && <><header style={{ margin: '36px 0' }}><p style={{ color: '#A4BD01', fontSize: '12px', letterSpacing: '0.1em' }}>ITINERAIRE PARTAGE</p><h1 style={{ margin: '8px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: '42px' }}>{itinerary.title}</h1><p style={{ color: '#427AA1' }}>{itinerary.description}</p><p>{new Date(itinerary.start_date).toLocaleDateString('fr-FR')} - {new Date(itinerary.end_date).toLocaleDateString('fr-FR')}</p></header>{itinerary.days.map(day => <section key={day.id} style={{ borderTop: '1px solid rgba(164, 189, 1, 0.25)', padding: '22px 0' }}><h2 style={{ fontSize: '20px', color: '#A4BD01' }}>Jour {day.day_number}</h2>{day.activities.length === 0 ? <p style={{ color: '#427AA1' }}>Aucune activité prévue.</p> : day.activities.map(activity => <article key={activity.id} style={{ margin: '14px 0', padding: '14px', background: 'rgba(2, 32, 46, 0.85)', borderRadius: '6px' }}><strong>{activity.place_name || 'Activité'}</strong><p style={{ marginBottom: 0, color: '#427AA1' }}>{activity.notes}</p></article>)}</section>)}</>}
    </div>
  </main>
}
