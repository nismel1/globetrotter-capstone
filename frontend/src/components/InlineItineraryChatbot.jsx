import React, { useState, useRef, useEffect } from 'react'
import { SparklesIcon, PaperAirplaneIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: "Bonjour ! Je suis votre assistant virtuel Globetrotter. Comment puis-je vous aider à personnaliser ou générer votre itinéraire pour Libreville & le Gabon ?",
    suggestions: [
      { label: '🏖️ Journée Plage & Détente', place: 'Pointe Denis', time: '09:00', duration: '240', desc: 'Traversée en pirogue et journée détente sur le sable blanc de la Pointe Denis.' },
      { label: '🏛️ Parcours Culture & Histoire', place: 'Musée National des Arts & Traditions', time: '10:00', duration: '120', desc: 'Découverte des masques sacrés et traditions des peuples du Gabon.' },
      { label: '🍲 Déjeuner Gastronomie Gabonaise', place: 'Maquis du Quartier Louis', time: '13:00', duration: '90', desc: 'Dégustation de Poulet Nyembwe et Poisson Capitaine braisé.' },
      { label: '🌿 Excursion Réserve de Raponda-Walker', place: 'Forêt d\'Mondah / Cap Estérias', time: '15:30', duration: '180', desc: 'Randonnée guidée au cœur de la forêt côtière et mangroves.' },
    ],
  },
]

export default function InlineItineraryChatbot({ activeDay = 1, onAddSuggestedActivity }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput('')

    const updated = [...messages, { role: 'user', content: userText }]
    setMessages(updated)
    setLoading(true)

    // Simulate AI response customized for Libreville
    setTimeout(() => {
      let aiContent = "Voici une suggestion sur mesure pour votre itinéraire à Libreville :"
      let suggestions = []

      const lower = userText.toLowerCase()
      if (lower.includes('plage') || lower.includes('mer') || lower.includes('détente')) {
        aiContent = "Pour une journée plage inoubliable, la Pointe Denis et le Bord de Mer de Libreville sont d'excellents choix !"
        suggestions = [
          { label: '🏖️ Traversée & Plage Pointe Denis', place: 'Pointe Denis', time: '09:00', duration: '240', desc: 'Départ embarcadère Michel Marine vers les plages paradisiaques.' },
          { label: '🌅 Coucher de Soleil au Bord de Mer', place: 'Bord de Mer de Libreville', time: '17:30', duration: '90', desc: 'Balade relaxante le long de la corniche avec vue sur l\'Atlantique.' },
        ]
      } else if (lower.includes('culture') || lower.includes('histoire') || lower.includes('patrimoine')) {
        aiContent = "Libreville possède un riche patrimoine culturel entre la Cathédrale Sainte-Marie et le Musée National."
        suggestions = [
          { label: '⛪ visite Cathédrale Sainte-Marie', place: 'Cathédrale Sainte-Marie de Libreville', time: '09:30', duration: '60', desc: 'Édifice historique majeur inauguré au XIXe siècle.' },
          { label: '🏛️ Musée des Arts & Traditions', place: 'Musée National de Libreville', time: '11:00', duration: '120', desc: 'Collection d\'artisanat et sculptures en bois d\'ébène.' },
        ]
      } else if (lower.includes('manger') || lower.includes('restaurant') || lower.includes('repas') || lower.includes('maquis')) {
        aiContent = "Ne manquez pas la gastronomie local gabonaise ! Voici nos suggestions de maquis et restaurants :"
        suggestions = [
          { label: '🍲 Dégustation Nyembwe à Louis', place: 'Restaurant Le Carre', time: '12:30', duration: '90', desc: 'Savourez le Poulet Nyembwe aux noix de palme.' },
          { label: '🐟 Grillades Poisson Braisé Okala', place: 'Okala Plage Maquis', time: '19:30', duration: '120', desc: 'Poisson braisé frais servi avec aloko et manioc.' },
        ]
      } else {
        aiContent = `J'ai analysé votre demande "${userText}". Voici deux activités recommandées pour le Jour ${activeDay} :`
        suggestions = [
          { label: '📸 Photo devant le Palais Léonn Mba', place: 'Boulevard Triomphal', time: '10:00', duration: '45', desc: 'Visite de la zone institutionnelle et architecture emblématique.' },
          { label: '🛍️ Shopping de Souvenirs à Mont-Bouët', place: 'Grand Marché de Mont-Bouët', time: '14:00', duration: '120', desc: 'Exploration du plus grand marché coloré de Libreville.' },
        ]
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: aiContent, suggestions },
      ])
      setLoading(false)
    }, 1000)
  }

  const handleQuickPrompt = (promptText) => {
    setInput(promptText)
  }

  return (
    <div
      style={{
        background: 'rgba(2, 32, 46, 0.9)',
        border: '1px solid #A4BD01',
        borderRadius: '16px',
        padding: '18px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        height: '480px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(164, 189, 1, 0.2)',
          paddingBottom: '12px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SparklesIcon style={{ width: '20px', height: '20px', color: '#A4BD01' }} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 'bold', color: '#EBF2FA' }}>
              Assistant Itinéraire IA
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#427AA1' }}>
              Posez une question pour enrichir le Jour {activeDay}
            </div>
          </div>
        </div>

        <button
          onClick={() => setMessages(INITIAL_MESSAGES)}
          style={{ background: 'transparent', border: 'none', color: '#427AA1', cursor: 'pointer' }}
          title="Réinitialiser le chat"
        >
          <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              background: m.role === 'user' ? 'rgba(164, 189, 1, 0.2)' : 'rgba(0, 0, 0, 0.3)',
              border: m.role === 'user' ? '1px solid #A4BD01' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', color: '#EBF2FA', lineHeight: '1.4' }}>
              {m.content}
            </div>

            {/* Suggestions cards */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {m.suggestions.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      background: 'rgba(2, 32, 46, 0.95)',
                      border: '1px solid rgba(164, 189, 1, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: '#A4BD01' }}>
                        {s.label}
                      </div>
                      <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '10px', color: '#427AA1', marginTop: '2px' }}>
                        ⏱️ {s.time} ({s.duration} min) • {s.place}
                      </div>
                    </div>

                    <button
                      onClick={() => onAddSuggestedActivity && onAddSuggestedActivity(s)}
                      style={{
                        background: '#A4BD01',
                        color: '#02202E',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        whiteSpace: 'nowrap',
                      }}
                      title="Ajouter à l'itinéraire"
                    >
                      <PlusIcon style={{ width: '12px', height: '12px' }} /> Ajouter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01' }}>
            L'assistant réfléchit...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & Quick Buttons */}
      <div style={{ marginTop: '10px' }}>
        {/* Quick prompt badges */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '6px' }}>
          {['🏖️ Plage', '🏛️ Culture', '🍲 Gastro', '🌿 Nature'].map((tag) => (
            <button
              key={tag}
              onClick={() => handleQuickPrompt(`Idées pour ${tag}`)}
              style={{
                background: 'rgba(164, 189, 1, 0.1)',
                border: '1px solid rgba(164, 189, 1, 0.3)',
                color: '#A4BD01',
                borderRadius: '12px',
                padding: '3px 8px',
                fontSize: '10px',
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Que faire à Libreville l'après-midi ?"
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(164, 189, 1, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#EBF2FA',
              fontSize: '11px',
              fontFamily: "'Work Sans', sans-serif",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              background: '#A4BD01',
              color: '#02202E',
              border: 'none',
              borderRadius: '8px',
              padding: '0 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PaperAirplaneIcon style={{ width: '16px', height: '16px' }} />
          </button>
        </form>
      </div>
    </div>
  )
}
