import React, { useContext, useState } from 'react'
import { BellIcon, XMarkIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline'
import { NotificationContext } from '../context/NotificationContext'

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, clearAll } = useContext(NotificationContext)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: 'rgba(2, 32, 46, 0.8)',
          border: '1px solid rgba(164, 189, 1, 0.3)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#EBF2FA',
          position: 'relative',
        }}
        title="Notifications"
      >
        <BellIcon style={{ width: '20px', height: '20px' }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#679436',
              color: '#FFF',
              borderRadius: '50%',
              fontSize: '10px',
              fontWeight: 'bold',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 6px rgba(168,71,43,0.8)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Drawer Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '340px',
            background: 'rgba(14, 20, 17, 0.95)',
            border: '1px solid #A4BD01',
            borderRadius: '14px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(12px)',
            zIndex: 2000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(164, 189, 1, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(2, 32, 46, 0.9)',
            }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', fontWeight: 'bold' }}>
              🔔 NOTIFICATIONS ({unreadCount} NON LUES)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{ background: 'transparent', border: 'none', color: '#427AA1', cursor: 'pointer' }}
                  title="Tout effacer"
                >
                  <TrashIcon style={{ width: '16px', height: '16px' }} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#427AA1', cursor: 'pointer' }}
              >
                <XMarkIcon style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#427AA1', fontSize: '12px' }}>
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    background: n.read ? 'rgba(255, 255, 255, 0.03)' : 'rgba(164, 189, 1, 0.1)',
                    borderLeft: n.read ? '3px solid transparent' : '3px solid #A4BD01',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: n.read ? '#EBF2FA' : '#A4BD01' }}>
                      {n.title}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#427AA1' }}>
                      {n.time}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '11px', color: '#427AA1', margin: '4px 0 0 0' }}>
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
