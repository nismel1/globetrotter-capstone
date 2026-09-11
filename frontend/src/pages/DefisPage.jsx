import React from 'react'
import { TrophyIcon } from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import DefisLibreville from '../components/DefisLibreville'

export default function DefisPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar />

      <div className="app-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '52px 16px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 600, color: '#EBF2FA', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrophyIcon style={{ width: '36px', height: '36px', strokeWidth: 1.5, flexShrink: 0 }} />
            <span>Défis Libreville & Missions Voyageur</span>
          </h1>
          <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', color: '#427AA1', marginTop: '6px' }}>
            Relevez des défis culturels, gourmands et d'aventure à Libreville, gagnez de l'XP et débloquez des badges exclusifs du Gabon !
          </p>
        </div>

        <DefisLibreville />
      </div>
    </div>
  )
}
