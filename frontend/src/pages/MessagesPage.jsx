import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import { API_URL } from '../config'

function MessagesPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('auth_token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch(`${API_URL}/conversations`, { headers })
      .then(response => {
        if (!response.ok) throw new Error('Impossible de charger vos conversations.')
        return response.json()
      })
      .then(data => {
        const items = data.conversations || []
        setConversations(items)
        if (items[0]) setSelectedId(items[0].id)
      })
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetch(`${API_URL}/conversations/${selectedId}/messages`, { headers })
      .then(response => {
        if (!response.ok) throw new Error('Impossible de charger les messages.')
        return response.json()
      })
      .then(data => setMessages((data.messages || []).reverse()))
      .catch(requestError => setError(requestError.message))
  }, [selectedId])

  const sendMessage = async event => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !selectedId) return

    try {
      const response = await fetch(`${API_URL}/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      })
      if (!response.ok) throw new Error('Le message n’a pas pu être envoyé.')
      const message = await response.json()
      setMessages(previous => [...previous, message])
      setDraft('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const conversationLabel = conversation => conversation.title || `Conversation ${conversation.id.slice(0, 8)}`

  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar />
      <main className="app-container" style={{ maxWidth: '1100px', paddingTop: '104px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '38px', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ChatBubbleLeftRightIcon style={{ width: '34px' }} /> Messages
          </h1>
          <p style={{ color: '#8CAABD', marginTop: '6px' }}>Retrouvez vos conversations et échangez avec votre communauté.</p>
        </div>

        {error && <div style={{ color: '#ffb4ab', marginBottom: '16px' }}>{error}</div>}
        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(0, 1.5fr)', minHeight: '520px', border: '1px solid rgba(66,122,161,.35)', borderRadius: '14px', overflow: 'hidden', background: 'rgba(2,32,46,.75)' }}>
          <aside style={{ borderRight: '1px solid rgba(66,122,161,.35)' }}>
            <div style={{ padding: '18px', borderBottom: '1px solid rgba(66,122,161,.25)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#A4BD01' }}>CONVERSATIONS</div>
            {loading && <p style={{ padding: '18px', color: '#8CAABD' }}>Chargement...</p>}
            {!loading && conversations.length === 0 && <p style={{ padding: '18px', color: '#8CAABD' }}>Aucune conversation pour le moment.</p>}
            {conversations.map(conversation => (
              <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} style={{ width: '100%', textAlign: 'left', padding: '16px 18px', border: 0, borderBottom: '1px solid rgba(66,122,161,.15)', background: selectedId === conversation.id ? 'rgba(164,189,1,.14)' : 'transparent', color: '#EBF2FA', cursor: 'pointer' }}>
                <strong>{conversationLabel(conversation)}</strong>
                <div style={{ color: '#8CAABD', fontSize: '12px', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.last_message_content || 'Aucun message'}</div>
              </button>
            ))}
          </aside>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: '22px', overflowY: 'auto' }}>
              {!selectedId && <p style={{ color: '#8CAABD' }}>Sélectionnez une conversation pour commencer.</p>}
              {selectedId && messages.length === 0 && <p style={{ color: '#8CAABD' }}>Cette conversation ne contient aucun message.</p>}
              {messages.map(message => (
                <div key={message.id} style={{ display: 'flex', justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                  <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '12px', background: message.sender_id === user?.id ? '#679436' : 'rgba(66,122,161,.3)', color: '#EBF2FA' }}>{message.content}</div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px', padding: '16px', borderTop: '1px solid rgba(66,122,161,.25)' }}>
              <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Écrire un message..." disabled={!selectedId} style={{ flex: 1, padding: '12px 14px', border: '1px solid rgba(66,122,161,.45)', borderRadius: '8px', background: '#0b2d3b', color: '#EBF2FA' }} />
              <button type="submit" disabled={!selectedId || !draft.trim()} aria-label="Envoyer" style={{ width: '46px', border: 0, borderRadius: '8px', background: '#A4BD01', color: '#02202E', cursor: 'pointer' }}><PaperAirplaneIcon style={{ width: '20px', margin: 'auto' }} /></button>
            </form>
          </div>
        </section>
        <button onClick={() => navigate('/profile')} style={{ marginTop: '18px', background: 'transparent', border: 0, color: '#A4BD01', cursor: 'pointer' }}>Accéder à mon profil</button>
      </main>
    </div>
  )
}

export default MessagesPage
