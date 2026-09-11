import React, { createContext, useState, useEffect } from 'react'

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  clearAll: () => {},
  toast: null,
})

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: '🌤️ Météo Libreville',
    message: 'Ensoleillé 29°C à Libreville aujourd’hui ! Temps idéal pour une traversée vers la Pointe Denis.',
    time: 'Il y a 10 min',
    type: 'weather',
    read: false,
  },
  {
    id: 'notif-2',
    title: '🏆 Nouveau Défi Débloqué',
    message: 'Participez au défi "Goûter au Poulet Nyembwe" à Louis et gagnez +150 XP !',
    time: 'Il y a 1 heure',
    type: 'challenge',
    read: false,
  },
  {
    id: 'notif-3',
    title: '👥 Invitation Groupe',
    message: 'Marc vous a invité à rejoindre la sortie "Week-end Pirogue & Réserve Akanda".',
    time: 'Hier',
    type: 'group',
    read: true,
  },
]

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('globetrotter_notifications')
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS
  })

  const [toast, setToast] = useState(null)

  useEffect(() => {
    localStorage.setItem('globetrotter_notifications', JSON.stringify(notifications))
  }, [notifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  const addNotification = (title, message, type = 'info') => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      time: 'À l’instant',
      type,
      read: false,
    }
    setNotifications((prev) => [newNotif, ...prev])

    // Trigger toast alert
    setToast({ title, message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        clearAll,
        toast,
      }}
    >
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2500,
            background: '#02202E',
            border: '1px solid #A4BD01',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            color: '#EBF2FA',
            maxWidth: '340px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', fontWeight: 'bold' }}>
            {toast.title}
          </div>
          <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', marginTop: '4px', color: '#EBF2FA' }}>
            {toast.message}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}
