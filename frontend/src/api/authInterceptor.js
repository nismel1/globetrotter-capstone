import { API_URL } from '../config'

// Absolute base used to detect API calls when API_URL is a relative path like '/api'
const API_BASE = new URL(API_URL, window.location.origin).toString()

// Patches window.fetch once so any 401 from our API clears the session and
// notifies AuthContext, without having to touch every call site.
export function installAuthInterceptor() {
  if (window.__authInterceptorInstalled) return
  window.__authInterceptorInstalled = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init)

    if (response.status === 401) {
      const url = typeof input === 'string' ? input : input?.url || ''
      const absoluteUrl = new URL(url, window.location.origin).toString()
      if (absoluteUrl.startsWith(API_BASE)) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }

    return response
  }
}
