import { API_URL } from '../config'

export function trackEvent(event_type, metadata = {}) {
  const token = localStorage.getItem('auth_token')
  if (!token) return
  fetch(`${API_URL}/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ event_type, metadata }),
  }).catch(() => {})
}

export function trackInteraction(place_id, action_type) {
  const token = localStorage.getItem('auth_token')
  if (!token) return
  fetch(`${API_URL}/recommendations/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ place_id, action_type }),
  }).catch(() => {})
}
