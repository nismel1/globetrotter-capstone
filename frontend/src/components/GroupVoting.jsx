import React, { useState } from 'react'
import { HandThumbUpIcon, HandThumbDownIcon, StarIcon } from '@heroicons/react/24/outline'

const PROPOSED_ACTIVITIES = [
  {
    id: 'v1',
    title: 'Déjeuner Poisson Braisé à Okala',
    proposer: 'Marc L.',
    upvotes: 5,
    downvotes: 0,
    stars: 3,
    voted: null,
  },
  {
    id: 'v2',
    title: 'Location Pirogue Privative (Pointe Denis)',
    proposer: 'Sarah K.',
    upvotes: 6,
    downvotes: 1,
    stars: 4,
    voted: null,
  },
  {
    id: 'v3',
    title: 'Randonnée Forêt d\'Mondah & Mangroves',
    proposer: 'Alexandre T.',
    upvotes: 3,
    downvotes: 2,
    stars: 1,
    voted: null,
  },
]

export default function GroupVoting() {
  const [proposals, setProposals] = useState(PROPOSED_ACTIVITIES)

  const handleVote = (id, type) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const currentVote = p.voted
          let newUp = p.upvotes
          let newDown = p.downvotes
          let newStars = p.stars

          if (currentVote === type) {
            // Undo vote
            if (type === 'up') newUp -= 1
            if (type === 'down') newDown -= 1
            if (type === 'star') newStars -= 1
            return { ...p, upvotes: newUp, downvotes: newDown, stars: newStars, voted: null }
          } else {
            // Apply vote
            if (type === 'up') newUp += 1
            if (type === 'down') newDown += 1
            if (type === 'star') newStars += 1
            return { ...p, upvotes: newUp, downvotes: newDown, stars: newStars, voted: type }
          }
        }
        return p
      })
    )
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
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.1em' }}>
          🗳️ VOTES COLLECTIFS • CONSENSUS GROUPE
        </div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 'bold', color: '#EBF2FA', marginTop: '2px' }}>
          Votez pour les activités proposées par les membres
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {proposals.map((p) => (
          <div
            key={p.id}
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(164, 189, 1, 0.2)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', fontWeight: 'bold', color: '#EBF2FA' }}>
                {p.title}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginTop: '2px' }}>
                Proposé par {p.proposer} • Score consensus: <strong style={{ color: '#A4BD01' }}>{p.upvotes - p.downvotes + p.stars * 2} pts</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleVote(p.id, 'up')}
                style={{
                  background: p.voted === 'up' ? '#679436' : 'rgba(103, 148, 54, 0.15)',
                  border: '1px solid #679436',
                  color: p.voted === 'up' ? '#FFF' : '#679436',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <HandThumbUpIcon style={{ width: '14px', height: '14px' }} /> {p.upvotes}
              </button>

              <button
                onClick={() => handleVote(p.id, 'star')}
                style={{
                  background: p.voted === 'star' ? '#A4BD01' : 'rgba(164, 189, 1, 0.15)',
                  border: '1px solid #A4BD01',
                  color: p.voted === 'star' ? '#02202E' : '#A4BD01',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <StarIcon style={{ width: '14px', height: '14px' }} /> {p.stars}
              </button>

              <button
                onClick={() => handleVote(p.id, 'down')}
                style={{
                  background: p.voted === 'down' ? '#679436' : 'rgba(103, 148, 54, 0.15)',
                  border: '1px solid #679436',
                  color: p.voted === 'down' ? '#FFF' : '#679436',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <HandThumbDownIcon style={{ width: '14px', height: '14px' }} /> {p.downvotes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
