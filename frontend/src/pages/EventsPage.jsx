import React, { useContext } from 'react'
import { SparklesIcon, GlobeAltIcon, FireIcon, PaintBrushIcon } from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import EventCalendar from '../components/EventCalendar'
import { AuthContext } from '../context/AuthContext'
import './events-page.css'

export default function EventsPage() {
  const { user, isAuthenticated } = useContext(AuthContext)

  if (!isAuthenticated) {
    return (
      <div className="events-page-login">
        <div className="login-message">
          <h2>📅 Événements et Activités</h2>
          <p>Connectez-vous pour découvrir les événements à Libreville</p>
        </div>
      </div>
    )
  }

  return (
    <div className="events-page">
      <Navbar />

      <main className="events-main">
        {/* En-tête */}
        <section className="events-header">
          <div className="events-header-content">
            <h1>Calendrier des Événements</h1>
            <p>Découvrez et participez aux événements à Libreville</p>
          </div>
        </section>

        {/* Calendrier */}
        <section className="events-section">
          <div className="events-container">
            <EventCalendar />
          </div>
        </section>

        {/* Info supplémentaire */}
        <section className="events-info">
          <div className="info-grid">
            <div className="info-card">
              <SparklesIcon width={48} height={48} className="info-icon" />
              <h3>Spectacles</h3>
              <p>Concerts, pièces de théâtre et performances culturelles</p>
            </div>

            <div className="info-card">
              <GlobeAltIcon width={48} height={48} className="info-icon" />
              <h3>Gastronomie</h3>
              <p>Événements culinaires et dégustations</p>
            </div>

            <div className="info-card">
              <FireIcon width={48} height={48} className="info-icon" />
              <h3>Sports</h3>
              <p>Activités sportives et événements athlétiques</p>
            </div>

            <div className="info-card">
              <PaintBrushIcon width={48} height={48} className="info-icon" />
              <h3>Culture</h3>
              <p>Expositions, festivals et événements culturels</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="events-footer">
        <p>Globetrotter — Découvrez Libreville à votre rythme</p>
      </footer>
    </div>
  )
}
