import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import GroupOutings from '../components/GroupOutings'
import GroupDashboard from '../components/GroupDashboard'

export default function GroupPage() {
  const [activeGroup, setActiveGroup] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar />

      <div className="app-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 600, color: '#EBF2FA' }}>
            👥 Sorties de Groupe & Votes Collectifs
          </h1>
          <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', color: '#427AA1', marginTop: '4px' }}>
            Planifiez vos voyages entre amis au Gabon, soumettez les activités au vote et partagez automatiquement le budget !
          </p>
        </div>

        {activeGroup ? (
          <div>
            <button
              onClick={() => setActiveGroup(null)}
              style={{
                background: 'rgba(2, 32, 46, 0.8)',
                border: '1px solid rgba(164, 189, 1, 0.3)',
                color: '#A4BD01',
                padding: '8px 14px',
                borderRadius: '8px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
            >
              ← Retour à toutes les sorties
            </button>
            <GroupDashboard group={activeGroup} />
          </div>
        ) : (
          <div>
            <GroupOutings onSelectGroup={(g) => setActiveGroup(g)} />
            <GroupDashboard />
          </div>
        )}
      </div>
    </div>
  )
}
