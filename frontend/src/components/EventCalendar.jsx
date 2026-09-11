import React, { useContext, useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { CalendarDaysIcon, MapPinIcon, DocumentTextIcon, TagIcon, CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../config'
import '../styles/calendar.css'

export default function EventCalendar() {
  const { token } = useContext(AuthContext)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    fetchEvents()
  }, [token])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = {}
      if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch(`${API_URL}/events`, { headers })

      if (!response.ok) {
        throw new Error(`Failed to load events: ${response.status}`)
      }

      const data = await response.json()

      // Transformer les événements au format FullCalendar
      const formattedEvents = (data.events || data || []).map((event) => ({
        id: event.id,
        title: event.name || event.title,
        start: event.date || event.start_date,
        end: event.end_date,
        extendedProps: {
          description: event.description,
          location: event.location,
          image: event.image_url || event.cover_image_url,
          category: event.category,
          price: event.price,
        },
      }))

      setEvents(formattedEvents)
    } catch (err) {
      console.error('Error loading events:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (info) => {
    setSelectedEvent(info.event)
  }

  const handleDateClick = (arg) => {
    // Optionnel: ouvrir un formulaire pour créer un événement
    console.log('Date clicked:', arg.dateStr)
  }

  if (loading) {
    return (
      <div className="calendar-loading">
        <p>Chargement du calendrier...</p>
      </div>
    )
  }

  return (
    <div className="event-calendar">
      <div className="calendar-container">
        {error && (
          <div className="calendar-error">
            ⚠️ {error}
            <button onClick={fetchEvents} className="retry-btn">
              Réessayer
            </button>
          </div>
        )}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
          }}
          events={events}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          height="auto"
          locale="fr"
        />
      </div>

      {/* Panneau de détails de l'événement */}
      {selectedEvent && (
        <div className="event-details-panel">
          <button
            className="close-btn"
            onClick={() => setSelectedEvent(null)}
            aria-label="Fermer"
          >
            <XMarkIcon width={20} height={20} />
          </button>

          <div className="event-details">
            {selectedEvent.extendedProps.image && (
              <img
                src={selectedEvent.extendedProps.image}
                alt={selectedEvent.title}
                className="event-image"
              />
            )}

            <h3>{selectedEvent.title}</h3>

            <div className="event-info">
              <p>
                <CalendarDaysIcon width={18} height={18} className="inline-icon" />
                <strong>Date:</strong>{' '}
                {new Date(selectedEvent.start).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              {selectedEvent.extendedProps.location && (
                <p>
                  <MapPinIcon width={18} height={18} className="inline-icon" />
                  <strong>Lieu:</strong> {selectedEvent.extendedProps.location}
                </p>
              )}

              {selectedEvent.extendedProps.description && (
                <p>
                  <DocumentTextIcon width={18} height={18} className="inline-icon" />
                  <strong>Description:</strong>{' '}
                  {selectedEvent.extendedProps.description}
                </p>
              )}

              {selectedEvent.extendedProps.category && (
                <p>
                  <TagIcon width={18} height={18} className="inline-icon" />
                  <strong>Catégorie:</strong>{' '}
                  {selectedEvent.extendedProps.category}
                </p>
              )}

              {selectedEvent.extendedProps.price && (
                <p>
                  <CurrencyDollarIcon width={18} height={18} className="inline-icon" />
                  <strong>Tarif:</strong> {selectedEvent.extendedProps.price}
                </p>
              )}
            </div>

            <button className="attend-btn">Participer</button>
          </div>
        </div>
      )}
    </div>
  )
}
