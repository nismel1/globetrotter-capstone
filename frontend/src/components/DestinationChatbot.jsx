import React, { useState, useRef, useEffect } from 'react'
import { API_URL } from '../config'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon, ArrowPathIcon, UserIcon, SparklesIcon } from '@heroicons/react/24/outline'
import '../styles/chatbot.css'

export default function DestinationChatbot() {
  const { t, i18n } = useTranslation();
  const { token } = useContext(AuthContext);
  
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Créer une nouvelle conversation au premier chargement
  useEffect(() => {
    if (isOpen && !conversationId) {
      createNewChat();
    }
  }, [isOpen]);

  // Scroller vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewChat = async () => {
    try {
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create chat');
      }

      const data = await response.json();
      setConversationId(data.conversation_id);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(err.message || t('chatbot.error_creating_chat'));
      console.error('Error creating chat:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Afficher immédiatement le message de l'utilisateur
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch(`${API_URL}/chats/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          language: i18n.language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message);
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
    createNewChat();
  };

  return (
    <div className="destination-chatbot">
      {/* Bouton flottant */}
      {!isOpen && (
        <button 
          className="chatbot-toggle-btn"
          onClick={() => setIsOpen(true)}
          title={t('chatbot.ask_assistant')}
        >
            <ChatBubbleLeftRightIcon width={24} height={24} />
        </button>
      )}

      {/* Fenêtre du chat */}
      {isOpen && (
        <div className="chatbot-container">
          {/* En-tête */}
          <div className="chatbot-header">
            <div className="chatbot-title">
                <SparklesIcon width={24} height={24} />
              <h3>{t('chatbot.title')}</h3>
            </div>
            <div className="chatbot-controls">
              <button 
                className="chatbot-clear-btn"
                onClick={clearChat}
                title={t('chatbot.new_chat')}
              >
                 <ArrowPathIcon width={18} height={18} />
              </button>
              <button 
                className="chatbot-close-btn"
                onClick={() => setIsOpen(false)}
              >
                 <XMarkIcon width={18} height={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <p>{t('chatbot.welcome')}</p>
                <p>{t('chatbot.ask_me')}</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-message chatbot-message-${msg.role}`}>
                <div className="chatbot-message-avatar">
                  {msg.role === 'user' ? <UserIcon width={20} height={20} /> : <SparklesIcon width={20} height={20} />}
                </div>
                <div className="chatbot-message-content">
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-message chatbot-message-assistant">
                <div className="chatbot-message-avatar"><SparklesIcon width={20} height={20} /></div>
                <div className="chatbot-message-content">
                  <div className="chatbot-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="chatbot-error">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="chatbot-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chatbot.placeholder')}
              disabled={loading}
              maxLength={500}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="chatbot-send-btn"
            >
              {loading ? <div className="chatbot-typing"><span></span><span></span><span></span></div> : <PaperAirplaneIcon width={18} height={18} />}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
