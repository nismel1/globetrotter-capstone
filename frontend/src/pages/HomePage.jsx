import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  MusicalNoteIcon,
  PlayCircleIcon,
  SparklesIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline'

import { AuthContext } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import GabonInfo from '../components/GabonInfo'
import DestinationChatbot from '../components/DestinationChatbot'
import { API_URL } from '../config'

import './HomePage.css'

function HomePage() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()

  const [places, setPlaces] = useState([])
  const [events, setEvents] = useState([])

  const [loadingPlaces, setLoadingPlaces] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)

  const [placesError, setPlacesError] = useState('')
  const [eventsError, setEventsError] = useState('')

  const [activePlace, setActivePlace] = useState(0)
  const [audioActive, setAudioActive] = useState(true)

  const token =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')

  const authHeaders = useMemo(
    () => ({
      Authorization: token ? `Bearer ${token}` : '',
    }),
    [token]
  )

  useEffect(() => {
    let cancelled = false

    async function loadPlaces() {
      setLoadingPlaces(true)
      setPlacesError('')

      try {
        const response = await fetch(
          `${API_URL}/places?limit=12&offset=0`,
          {
            headers: authHeaders,
          }
        )

        if (!response.ok) {
          throw new Error('Impossible de charger les destinations.')
        }

        const data = await response.json()

        const receivedPlaces = Array.isArray(data)
          ? data
          : Array.isArray(data.places)
            ? data.places
            : []

        if (!cancelled) {
          setPlaces(receivedPlaces)
        }
      } catch (error) {
        if (!cancelled) {
          setPlacesError(error.message)
          setPlaces([])
        }
      } finally {
        if (!cancelled) {
          setLoadingPlaces(false)
        }
      }
    }

    loadPlaces()

    return () => {
      cancelled = true
    }
  }, [authHeaders])

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      setLoadingEvents(true)
      setEventsError('')

      try {
        const response = await fetch(`${API_URL}/events`, {
          headers: authHeaders,
        })

        if (!response.ok) {
          throw new Error('Impossible de charger les événements.')
        }

        const data = await response.json()

        const receivedEvents = Array.isArray(data)
          ? data
          : Array.isArray(data.events)
            ? data.events
            : []

        if (!cancelled) {
          setEvents(receivedEvents)
        }
      } catch (error) {
        if (!cancelled) {
          setEventsError(error.message)
          setEvents([])
        }
      } finally {
        if (!cancelled) {
          setLoadingEvents(false)
        }
      }
    }

    loadEvents()

    return () => {
      cancelled = true
    }
  }, [authHeaders])

  const publishedPlaces = useMemo(
    () =>
      places.filter(
        (place) =>
          place &&
          (place.is_published === true ||
            place.status === 'published' ||
            place.is_published === undefined)
      ),
    [places]
  )

  const publishedEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event &&
          (event.is_published === true ||
            event.status === 'published' ||
            event.is_published === undefined)
      ),
    [events]
  )

  const featuredPlaces = publishedPlaces.slice(0, 6)

  const heroPlace =
    featuredPlaces[activePlace] ||
    featuredPlaces[0] ||
    null

  useEffect(() => {
    if (activePlace >= featuredPlaces.length && featuredPlaces.length > 0) {
      setActivePlace(0)
    }
  }, [activePlace, featuredPlaces.length])

  const goToPreviousPlace = () => {
    if (!featuredPlaces.length) return

    setActivePlace((current) =>
      current === 0 ? featuredPlaces.length - 1 : current - 1
    )
  }

  const goToNextPlace = () => {
    if (!featuredPlaces.length) return

    setActivePlace((current) =>
      current === featuredPlaces.length - 1 ? 0 : current + 1
    )
  }

  const openPlace = (place) => {
    if (!place?.id) return

    navigate(`/explorer?place=${place.id}`)
  }

  const formatEventDate = (event) => {
    const rawDate = event?.start_date || event?.date

    if (!rawDate) {
      return 'Date à venir'
    }

    const date = new Date(rawDate)

    if (Number.isNaN(date.getTime())) {
      return rawDate
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const formatEventTime = (event) => {
    if (!event?.start_time) return ''

    return String(event.start_time).slice(0, 5)
  }

  const getEventLocation = (event) => {
    if (event?.place?.name) return event.place.name
    if (event?.place_name) return event.place_name

    return event?.address || 'Libreville'
  }

  return (
    <div className="home-page">
      <Navbar
        audioActive={audioActive}
        onToggleAudio={() => setAudioActive((value) => !value)}
      />

      <main>
        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="home-hero">
          {heroPlace?.cover_image_url ? (
            <img
              className="home-hero-image"
              src={heroPlace.cover_image_url}
              alt={heroPlace.name}
            />
          ) : (
            <div className="home-hero-placeholder" />
          )}

          <div className="home-hero-overlay" />

          <div className="home-hero-content">
            <div className="home-eyebrow">
              <SparklesIcon />
              <span>Bienvenue à Libreville</span>
            </div>

            <h1>
              Une ville.
              <br />
              <em>Mille histoires.</em>
            </h1>

            <p>
              Découvrez Libreville à travers les lieux, les
              cultures, les rencontres et les événements qui
              font vivre la ville.
            </p>

            <button
              type="button"
              className="home-primary-button"
              onClick={() => navigate('/explorer')}
            >
              <span>Explorer la ville</span>
              <ArrowRightIcon />
            </button>
          </div>

          {featuredPlaces.length > 1 && (
            <div className="home-hero-navigation">
              <button
                type="button"
                onClick={goToPreviousPlace}
                aria-label="Lieu précédent"
              >
                <ChevronLeftIcon />
              </button>

              <div className="home-hero-indicators">
                {featuredPlaces.map((place, index) => (
                  <button
                    type="button"
                    key={place.id || index}
                    className={
                      index === activePlace
                        ? 'active'
                        : ''
                    }
                    onClick={() => setActivePlace(index)}
                    aria-label={`Afficher ${place.name}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goToNextPlace}
                aria-label="Lieu suivant"
              >
                <ChevronRightIcon />
              </button>
            </div>
          )}

          {heroPlace && (
            <button
              type="button"
              className="home-hero-place"
              onClick={() => openPlace(heroPlace)}
            >
              <MapPinIcon />

              <span>
                <small>À découvrir</small>
                <strong>{heroPlace.name}</strong>
              </span>

              <ArrowRightIcon />
            </button>
          )}
        </section>

        {/* =====================================================
            INTRODUCTION
        ====================================================== */}

        <section className="home-introduction section-container">
          <div className="home-section-kicker">
            <span />
            L'histoire commence ici
          </div>

          <div className="home-introduction-grid">
            <h2>
              Libreville ne se visite pas.
              <br />
              <em>Elle se raconte.</em>
            </h2>

            <div>
              <p>
                Chaque quartier, chaque plage, chaque marché
                possède une histoire. Globetrotter vous invite
                à découvrir la ville autrement, en prenant le
                temps de regarder, d'écouter et de vivre chaque
                endroit.
              </p>

              <button
                type="button"
                className="home-text-button"
                onClick={() => navigate('/explorer')}
              >
                Commencer l'exploration
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            GABON INFO — REST Countries + Nominatim
        ====================================================== */}
        <section className="section-container" style={{ paddingBottom: '60px' }}>
          <GabonInfo variant="banner" />
        </section>

        {/* =====================================================
            CHAPTERS / PLACES
        ====================================================== */}

        <section className="home-story section-container">
          <div className="home-section-heading">
            <div>
              <div className="home-section-kicker">
                <span />
                Les histoires de la ville
              </div>

              <h2>
                Découvrez les lieux
                <br />
                <em>qui racontent Libreville.</em>
              </h2>
            </div>

            <button
              type="button"
              className="home-outline-button"
              onClick={() => navigate('/explorer')}
            >
              Voir tous les lieux
              <ArrowRightIcon />
            </button>
          </div>

          {loadingPlaces && (
            <div className="home-loading-grid">
              {[1, 2, 3].map((item) => (
                <div
                  className="home-skeleton-card"
                  key={item}
                />
              ))}
            </div>
          )}

          {!loadingPlaces && placesError && (
            <div className="home-empty-state home-error-state">
              <h3>Les histoires sont momentanément indisponibles.</h3>
              <p>{placesError}</p>
            </div>
          )}

          {!loadingPlaces &&
            !placesError &&
            featuredPlaces.length === 0 && (
              <div className="home-empty-state">
                <MapPinIcon />
                <h3>Les premières histoires arrivent bientôt.</h3>
                <p>
                  Aucun lieu publié n'est encore disponible.
                </p>
              </div>
            )}

          {!loadingPlaces &&
            !placesError &&
            featuredPlaces.length > 0 && (
              <div className="home-story-grid">
                {featuredPlaces.map((place, index) => (
                  <article
                    className={`home-story-card ${
                      index === 0
                        ? 'home-story-card--large'
                        : ''
                    }`}
                    key={place.id}
                    onClick={() => openPlace(place)}
                  >
                    <div className="home-story-image-wrapper">
                      {place.cover_image_url ? (
                        <img
                          src={place.cover_image_url}
                          alt={place.name}
                          className="home-story-image"
                          loading={
                            index > 1 ? 'lazy' : 'eager'
                          }
                        />
                      ) : (
                        <div className="home-story-image-placeholder">
                          <MapPinIcon />
                        </div>
                      )}

                      <div className="home-story-image-overlay" />

                      <span className="home-story-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <span className="home-story-open">
                        <ArrowRightIcon />
                      </span>
                    </div>

                    <div className="home-story-card-content">
                      <span className="home-story-category">
                        {place.category_name ||
                          place.category?.name ||
                          'Destination'}
                      </span>

                      <h3>{place.name}</h3>

                      <p>
                        {place.long_description ||
                          place.description ||
                          'Découvrez ce lieu et son histoire.'}
                      </p>

                      {place.address && (
                        <div className="home-story-location">
                          <MapPinIcon />
                          {place.address}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
        </section>

        {/* =====================================================
            IMMERSIVE MEDIA
        ====================================================== */}

        {heroPlace && (
          <section className="home-media">
            <div className="home-media-background">
              {heroPlace.cover_image_url && (
                <img
                  src={heroPlace.cover_image_url}
                  alt=""
                />
              )}
            </div>

            <div className="home-media-overlay" />

            <div className="home-media-content section-container">
              <div className="home-media-copy">
                <span className="home-media-label">
                  <SpeakerWaveIcon />
                  Vivez le lieu autrement
                </span>

                <h2>
                  Regardez.
                  <br />
                  Écoutez.
                  <br />
                  <em>Ressentez.</em>
                </h2>

                <p>
                  Chaque destination peut devenir une
                  expérience. Retrouvez les médias associés
                  aux lieux lorsque leur contenu est disponible.
                </p>

                <button
                  type="button"
                  className="home-light-button"
                  onClick={() => openPlace(heroPlace)}
                >
                  Découvrir {heroPlace.name}
                  <ArrowRightIcon />
                </button>
              </div>

              <div className="home-media-card">
                <div className="home-media-card-icon">
                  <PlayCircleIcon />
                </div>

                <div>
                  <span>Expérience immersive</span>
                  <strong>{heroPlace.name}</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            EVENTS
        ====================================================== */}

        <section className="home-events section-container">
          <div className="home-section-heading">
            <div>
              <div className="home-section-kicker">
                <span />
                Agenda culturel
              </div>

              <h2>
                Ce qui se passe
                <br />
                <em>à Libreville.</em>
              </h2>
            </div>

            <div className="home-events-description">
              Concerts, festivals, expositions et rencontres :
              découvrez les événements qui font vibrer la ville.
            </div>
          </div>

          {loadingEvents && (
            <div className="home-events-grid">
              {[1, 2, 3].map((item) => (
                <div
                  className="home-event-skeleton"
                  key={item}
                />
              ))}
            </div>
          )}

          {!loadingEvents && eventsError && (
            <div className="home-empty-state home-error-state">
              <CalendarDaysIcon />
              <h3>Impossible de charger l'agenda.</h3>
              <p>{eventsError}</p>
            </div>
          )}

          {!loadingEvents &&
            !eventsError &&
            publishedEvents.length === 0 && (
              <div className="home-empty-state">
                <CalendarDaysIcon />
                <h3>Aucun événement publié pour le moment.</h3>
                <p>
                  Revenez bientôt pour découvrir les prochains
                  rendez-vous culturels.
                </p>
              </div>
            )}

          {!loadingEvents &&
            !eventsError &&
            publishedEvents.length > 0 && (
              <>
                <div className="home-events-grid">
                  {publishedEvents.slice(0, 6).map((event) => (
                    <article
                      className="home-event-card"
                      key={event.id}
                    >
                      <div className="home-event-image-wrapper">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.name}
                            className="home-event-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="home-event-image-placeholder">
                            <CalendarDaysIcon />
                          </div>
                        )}

                        <div className="home-event-date">
                          <span>
                            {formatEventDate(event)}
                          </span>
                        </div>
                      </div>

                      <div className="home-event-content">
                        <span className="home-event-type">
                          Événement culturel
                        </span>

                        <h3>{event.name}</h3>

                        <p>
                          {event.description ||
                            'Découvrez cet événement à Libreville.'}
                        </p>

                        <div className="home-event-meta">
                          <span>
                            <MapPinIcon />
                            {getEventLocation(event)}
                          </span>

                          {formatEventTime(event) && (
                            <span>
                              <CalendarDaysIcon />
                              {formatEventTime(event)}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {publishedEvents.length > 6 && (
                  <div className="home-events-footer">
                    <button
                      type="button"
                      className="home-outline-button"
                      onClick={() => navigate('/explorer')}
                    >
                      Voir tous les événements
                      <ArrowRightIcon />
                    </button>
                  </div>
                )}
              </>
            )}
        </section>

        {/* =====================================================
            FINAL CTA
        ====================================================== */}

        <section className="home-final">
          <div className="home-final-inner">
            <span className="home-section-kicker">
              <span />
              Votre histoire commence maintenant
            </span>

            <h2>
              Et vous,
              <br />
              <em>quelle histoire allez-vous vivre ?</em>
            </h2>

            <p>
              Explorez les lieux, découvrez les événements et
              créez vos propres souvenirs à Libreville.
            </p>

            <button
              type="button"
              className="home-primary-button home-primary-button--dark"
              onClick={() => navigate('/explorer')}
            >
              Explorer Libreville
              <ArrowRightIcon />
            </button>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div>
          <strong>Globetrotter</strong>
          <span>
            Découvrir les villes. Vivre les histoires.
          </span>
        </div>

        <div className="home-footer-user">
          {user?.full_name || user?.name || user?.email || ''}
        </div>
      </footer>

      <DestinationChatbot />
    </div>
  )
}

export default HomePage