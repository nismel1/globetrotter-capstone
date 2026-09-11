import React from 'react'
import Navbar from '../components/Navbar'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import LocalContributions from '../components/LocalContributions'

export default function PatrimoinePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar />

      <div className="app-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 600, color: '#EBF2FA' }}>
            🏛️ Patrimoine & Histoire du Gabon
          </h1>
          <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', color: '#427AA1', marginTop: '4px' }}>
            Découvrez la mémoire vivante de Libreville à travers l'évolution de son architecture et les récits authentiques de ses habitants.
          </p>
        </div>

        <BeforeAfterSlider />
        <LocalContributions />
      </div>
    </div>
  )
}
