import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckIcon, ClockIcon, MapPinIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import AudioManager from '../components/AudioManager'
import AdminResourceManager from '../components/AdminResourceManager'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../config'
import './AdminPage.css'

const PAGE_SIZE = 10

const emptyPlace = { name: '', slug: '', category_id: '', description: '', address: '', latitude: '', longitude: '', cover_image_url: '', is_published: true }
const emptyEvent = { name: '', description: '', place_id: '', start_date: '', start_time: '', end_date: '', end_time: '', image_url: '', is_published: true }

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  return []
}

const readTotalCount = (payload) => {
  if (typeof payload?.total === 'number') return payload.total
  if (typeof payload?.count === 'number') return payload.count
  return normalizeCollection(payload).length
}

function AdminPage() {
  const { user, token } = useContext(AuthContext)
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [proposals, setProposals] = useState([])
  const [places, setPlaces] = useState([])
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState('')
  const [pageState, setPageState] = useState({ places: 1, events: 1, users: 1 })
  const [hasMore, setHasMore] = useState({ places: true, events: true, users: true })
  const [confirmAction, setConfirmAction] = useState(null)
  const [editor, setEditor] = useState(null)
  const [editorData, setEditorData] = useState(emptyPlace)
  const [categories, setCategories] = useState([])
  const [stories, setStories] = useState([])

  const getAuthHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token])

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setError('Session expirée. Veuillez vous reconnecter.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [metricsResult, proposalsResult, placesResult, eventsResult, usersResult, categoriesResult, storiesResult] = await Promise.allSettled([
        fetch(`${API_URL}/analytics/metrics`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/admin/proposals/pending`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/admin/places?limit=${PAGE_SIZE}&offset=0`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/admin/events?limit=${PAGE_SIZE}&offset=0`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/admin/users?limit=${PAGE_SIZE}&offset=0`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/categories`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/admin/stories/pending`, { headers: getAuthHeaders() }),
      ])

      const nextMetrics = metricsResult.status === 'fulfilled' && metricsResult.value.ok ? await metricsResult.value.json() : null
      const nextProposals = proposalsResult.status === 'fulfilled' && proposalsResult.value.ok ? await proposalsResult.value.json() : []
      const nextPlaces = placesResult.status === 'fulfilled' && placesResult.value.ok ? await placesResult.value.json() : { items: [] }
      const nextEvents = eventsResult.status === 'fulfilled' && eventsResult.value.ok ? await eventsResult.value.json() : { items: [] }
      const nextUsers = usersResult.status === 'fulfilled' && usersResult.value.ok ? await usersResult.value.json() : { items: [] }
      const nextCategories = categoriesResult.status === 'fulfilled' && categoriesResult.value.ok ? await categoriesResult.value.json() : []
      const nextStories = storiesResult.status === 'fulfilled' && storiesResult.value.ok ? await storiesResult.value.json() : []

      const failedRequests = [metricsResult, proposalsResult, placesResult, eventsResult, usersResult].filter(result => result.status === 'rejected').length
      if (failedRequests > 0) {
        setError('Certaines données n’ont pas pu être chargées. Les sections disponibles sont affichées ci-dessous.')
      }

      setMetrics(nextMetrics)
      setProposals(Array.isArray(nextProposals) ? nextProposals : [])
      setPlaces(normalizeCollection(nextPlaces))
      setEvents(normalizeCollection(nextEvents))
      setUsers(normalizeCollection(nextUsers))
      setCategories(normalizeCollection(nextCategories))
      setStories(normalizeCollection(nextStories))
      setHasMore({
        places: readTotalCount(nextPlaces) > PAGE_SIZE,
        events: readTotalCount(nextEvents) > PAGE_SIZE,
        users: readTotalCount(nextUsers) > PAGE_SIZE,
      })
    } catch (requestError) {
      setError(requestError.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, token])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const loadMore = useCallback(async (type) => {
    if (!token) return

    const nextPage = (pageState[type] || 1) + 1
    const offset = (nextPage - 1) * PAGE_SIZE

    try {
      const response = await fetch(`${API_URL}/admin/${type}?limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error('La pagination a échoué.')

      const payload = await response.json()
      const items = normalizeCollection(payload)
      const total = readTotalCount(payload)

      if (type === 'places') {
        setPlaces(current => [...current, ...items])
      } else if (type === 'events') {
        setEvents(current => [...current, ...items])
      } else {
        setUsers(current => [...current, ...items])
      }

      setPageState(current => ({ ...current, [type]: nextPage }))
      setHasMore(current => ({ ...current, [type]: total > nextPage * PAGE_SIZE }))
    } catch (requestError) {
      setError(requestError.message || 'Une erreur est survenue.')
    }
  }, [getAuthHeaders, pageState, token])

  const reviewProposal = async (proposalId, decision) => {
    if (!token) return
    setActionId(proposalId)
    setError('')

    try {
      const response = await fetch(`${API_URL}/admin/proposals/${proposalId}/${decision}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: decision === 'reject' ? JSON.stringify({ reason: 'Proposition non retenue après examen.' }) : undefined,
      })
      if (!response.ok) throw new Error('La modération de cette proposition a échoué.')
      setProposals(current => current.filter(proposal => proposal.id !== proposalId))
    } catch (requestError) {
      setError(requestError.message || 'Une erreur est survenue.')
    } finally {
      setActionId(null)
      setConfirmAction(null)
    }
  }

  const updatePublication = async (type, id, isPublished) => {
    if (!token) return
    const endpoint = type === 'place' ? 'places' : 'events'
    try {
      const response = await fetch(`${API_URL}/admin/${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ is_published: isPublished }),
      })
      if (!response.ok) throw new Error('La mise à jour a échoué.')
      if (type === 'place') setPlaces(current => current.map(item => item.id === id ? { ...item, is_published: isPublished } : item))
      else setEvents(current => current.map(item => item.id === id ? { ...item, is_published: isPublished } : item))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setConfirmAction(null)
    }
  }

  const updateUserStatus = async (id, isActive) => {
    if (!token) return
    try {
      const response = await fetch(`${API_URL}/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!response.ok) throw new Error('La mise à jour du compte a échoué.')
      setUsers(current => current.map(item => item.id === id ? { ...item, is_active: isActive } : item))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setConfirmAction(null)
    }
  }

  const updateUserRole = async (id, role) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${id}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ role }) })
      if (!response.ok) throw new Error('La mise à jour du rôle a échoué.')
      const account = await response.json()
      setUsers(current => current.map(item => item.id === id ? { ...item, ...account } : item))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const reviewStory = async (storyId, decision) => {
    try {
      const response = await fetch(`${API_URL}/admin/stories/${storyId}/${decision}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
      if (!response.ok) throw new Error('La modération de cette story a échoué.')
      setStories(current => current.filter(story => story.id !== storyId))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const triggerConfirmation = (config) => setConfirmAction(config)

  const openEditor = (type, item = null) => {
    setEditor({ type, item })
    setEditorData(item ? { ...item } : type === 'place' ? emptyPlace : emptyEvent)
  }

  const saveEditor = async (event) => {
    event.preventDefault()
    const { type, item } = editor
    const endpoint = type === 'place' ? 'places' : 'events'
    const response = await fetch(`${API_URL}/admin/${endpoint}${item ? `/${item.id}` : ''}`, {
      method: item ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(editorData),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload.error || 'La sauvegarde a échoué.')
      return
    }
    const savedItem = await response.json()
    if (type === 'place') setPlaces(current => item ? current.map(value => value.id === item.id ? savedItem : value) : [savedItem, ...current])
    else setEvents(current => item ? current.map(value => value.id === item.id ? savedItem : value) : [savedItem, ...current])
    setEditor(null)
  }

  const deleteItem = async (type, item) => {
    const endpoint = type === 'place' ? 'places' : 'events'
    try {
      const response = await fetch(`${API_URL}/admin/${endpoint}/${item.id}`, { method: 'DELETE', headers: getAuthHeaders() })
      if (!response.ok) throw new Error('La suppression a échoué.')
      if (type === 'place') setPlaces(current => current.map(value => value.id === item.id ? { ...value, is_published: false } : value))
      else setEvents(current => current.map(value => value.id === item.id ? { ...value, is_published: false } : value))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setConfirmAction(null)
    }
  }

  if (user?.role !== 'admin') return <Navigate to="/home" replace />

  return (
    <div className="admin-page">
      <Navbar />
      <main className="admin-container">
        <header className="admin-header">
          <div>
            <span className="admin-eyebrow">Espace administration</span>
            <h1>Pilotez Globetrotter.</h1>
            <p>Suivez l’activité de la plateforme et modérez les contributions de la communauté.</p>
          </div>
          <button className="admin-refresh" onClick={loadDashboard} disabled={loading}>Actualiser</button>
        </header>

        {error && <div className="admin-alert" role="alert">{error}</div>}

        <section className="admin-stats" aria-label="Statistiques de la plateforme">
          <article><span>Utilisateurs</span><strong>{loading ? '—' : metrics?.total_users ?? 0}</strong><small>comptes enregistrés</small></article>
          <article><span>Destinations</span><strong>{loading ? '—' : metrics?.total_places ?? 0}</strong><small>lieux publiés</small></article>
          <article><span>Propositions</span><strong>{loading ? '—' : metrics?.pending_proposals ?? proposals.length}</strong><small>en attente</small></article>
          <article><span>Événements</span><strong>{loading ? '—' : metrics?.upcoming_events ?? 0}</strong><small>à venir</small></article>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Modération</span><h2>Propositions à examiner</h2></div><span className="admin-count"><ClockIcon /> {proposals.length}</span></div>
          {loading ? <div className="admin-empty">Chargement des propositions...</div> : proposals.length === 0 ? <div className="admin-empty"><CheckIcon /><strong>Tout est à jour</strong><span>Aucune proposition n’attend actuellement votre validation.</span></div> : <div className="admin-proposals">{proposals.map(proposal => <article className="admin-proposal" key={proposal.id}><div className="admin-proposal-content"><span className="admin-proposal-category"><MapPinIcon /> Proposition de lieu</span><h3>{proposal.name}</h3><p>{proposal.description || 'Aucune description fournie.'}</p><small>{proposal.address || 'Adresse non renseignée'} · {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}</small></div><div className="admin-proposal-actions"><button className="admin-approve" onClick={() => triggerConfirmation({ title: 'Approuver la proposition', message: `Voulez-vous accepter la proposition « ${proposal.name} » ?`, onConfirm: () => reviewProposal(proposal.id, 'approve') })} disabled={actionId === proposal.id}><CheckIcon /> Approuver</button><button className="admin-reject" onClick={() => triggerConfirmation({ title: 'Rejeter la proposition', message: `Voulez-vous refuser la proposition « ${proposal.name} » ?`, onConfirm: () => reviewProposal(proposal.id, 'reject') })} disabled={actionId === proposal.id}><XMarkIcon /> Rejeter</button></div></article>)}</div>}
        </section>
        <section className="admin-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Catalogue</span><h2>Lieux publiés et brouillons</h2></div><div className="admin-heading-actions"><span className="admin-count">{places.length}</span><button className="admin-add-button" onClick={() => openEditor('place')}><PlusIcon /> Créer un lieu</button></div></div>
          <div className="admin-management-list">
            {places.length === 0 ? <div className="admin-empty">Aucun lieu enregistré.</div> : places.map(place => <article className="admin-management-row" key={place.id}><div><strong>{place.name}</strong><small>{place.address || 'Adresse non renseignée'}</small></div><div className="admin-row-actions"><button aria-label={`Modifier ${place.name}`} title="Modifier" onClick={() => openEditor('place', place)}><PencilSquareIcon /></button><button onClick={() => triggerConfirmation({ title: place.is_published ? 'Dépublier le lieu' : 'Publier le lieu', message: `Voulez-vous ${place.is_published ? 'dépublier' : 'publier'} « ${place.name} » ?`, onConfirm: () => updatePublication('place', place.id, !place.is_published) })}>{place.is_published ? 'Dépublier' : 'Publier'}</button><button className="admin-danger-button" aria-label={`Supprimer ${place.name}`} title="Supprimer" onClick={() => triggerConfirmation({ title: 'Supprimer le lieu', message: `Le lieu « ${place.name} » sera dépublié. Confirmer ?`, onConfirm: () => deleteItem('place', place) })}><TrashIcon /></button></div></article>)}
          </div>
          {hasMore.places && <button className="admin-load-more" onClick={() => loadMore('places')}>Afficher plus</button>}
        </section>
        <section className="admin-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Programmation</span><h2>Événements</h2></div><div className="admin-heading-actions"><span className="admin-count">{events.length}</span><button className="admin-add-button" onClick={() => openEditor('event')}><PlusIcon /> Créer un événement</button></div></div>
          <div className="admin-management-list">
            {events.length === 0 ? <div className="admin-empty">Aucun événement enregistré.</div> : events.map(event => <article className="admin-management-row" key={event.id}><div><strong>{event.name}</strong><small>{event.start_date || 'Date non renseignée'}</small></div><div className="admin-row-actions"><button aria-label={`Modifier ${event.name}`} title="Modifier" onClick={() => openEditor('event', event)}><PencilSquareIcon /></button><button onClick={() => triggerConfirmation({ title: event.is_published ? 'Dépublier l’événement' : 'Publier l’événement', message: `Voulez-vous ${event.is_published ? 'dépublier' : 'publier'} « ${event.name} » ?`, onConfirm: () => updatePublication('event', event.id, !event.is_published) })}>{event.is_published ? 'Dépublier' : 'Publier'}</button><button className="admin-danger-button" aria-label={`Supprimer ${event.name}`} title="Supprimer" onClick={() => triggerConfirmation({ title: 'Supprimer l’événement', message: `L’événement « ${event.name} » sera dépublié. Confirmer ?`, onConfirm: () => deleteItem('event', event) })}><TrashIcon /></button></div></article>)}
          </div>
          {hasMore.events && <button className="admin-load-more" onClick={() => loadMore('events')}>Afficher plus</button>}
        </section>
        <section className="admin-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Comptes</span><h2>Utilisateurs</h2></div><span className="admin-count">{users.length}</span></div>
          <div className="admin-management-list">
            {users.length === 0 ? <div className="admin-empty">Aucun utilisateur enregistré.</div> : users.map(account => <article className="admin-management-row" key={account.id}><div><strong>{account.full_name || account.email}</strong><small>{account.email} · {account.role}</small></div><div className="admin-row-actions"><select aria-label={`Rôle de ${account.full_name || account.email}`} disabled={account.id === user.id} value={account.role} onChange={event => updateUserRole(account.id, event.target.value)}><option value="user">Utilisateur</option><option value="admin">Admin</option></select><button disabled={account.id === user.id} onClick={() => triggerConfirmation({ title: account.is_active ? 'Désactiver le compte' : 'Réactiver le compte', message: `Voulez-vous ${account.is_active ? 'désactiver' : 'réactiver'} le compte de ${account.full_name || account.email} ?`, onConfirm: () => updateUserStatus(account.id, !account.is_active) })}>{account.is_active ? 'Désactiver' : 'Réactiver'}</button></div></article>)}
          </div>
          {hasMore.users && <button className="admin-load-more" onClick={() => loadMore('users')}>Afficher plus</button>}
        </section>
        <section className="admin-section">
          <AudioManager />
        </section>
        <section className="admin-section"><div className="admin-section-heading"><div><span className="admin-eyebrow">Modération</span><h2>Stories à examiner</h2></div><span className="admin-count">{stories.length}</span></div><div className="admin-management-list">{stories.length === 0 ? <div className="admin-empty">Aucune story en attente.</div> : stories.map(story => <article className="admin-management-row" key={story.id}><div><strong>{story.title || 'Story sans titre'}</strong><small>{story.story_text}</small></div><div className="admin-row-actions"><button onClick={() => reviewStory(story.id, 'approved')}>Approuver</button><button className="admin-danger-button" onClick={() => reviewStory(story.id, 'rejected')}>Rejeter</button></div></article>)}</div></section>
        <AdminResourceManager title="Catégories" resource="categories" fields={['name', 'slug', 'description', 'icon_url', 'color_hex']} />
        <AdminResourceManager title="Tags" resource="tags" fields={['name', 'slug', 'category_id']} categories={categories} />
        <AdminResourceManager title="Missions" resource="missions" fields={['name', 'description', 'category_id', 'required_place_count', 'icon_url', 'reward_text', 'is_active']} categories={categories} />
        <AdminResourceManager title="Badges" resource="badges" fields={['name', 'description', 'icon_url', 'requirement_count', 'category']} />
        <section className="admin-section admin-quick-links"><div className="admin-section-heading"><div><span className="admin-eyebrow">Accès rapides</span><h2>Gestion disponible</h2></div></div><div className="admin-link-grid"><button onClick={() => navigate('/explorer')}><MapPinIcon /><span><strong>Catalogue</strong><small>Consulter les destinations publiées</small></span></button><button onClick={() => navigate('/profile')}><CheckIcon /><span><strong>Mon profil</strong><small>Revenir à l’espace utilisateur</small></span></button></div></section>
      </main>

      {confirmAction && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-confirm-dialog">
            <h3>{confirmAction.title}</h3>
            <p>{confirmAction.message}</p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-confirm-cancel" onClick={() => setConfirmAction(null)}>Annuler</button>
              <button type="button" className="admin-confirm-confirm" onClick={confirmAction.onConfirm}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {editor && <div className="admin-confirm-overlay" role="dialog" aria-modal="true"><div className="admin-editor-dialog"><div className="admin-section-heading"><h3>{editor.item ? 'Modifier' : 'Créer'} {editor.type === 'place' ? 'un lieu' : 'un événement'}</h3><button className="admin-icon-button" aria-label="Fermer" onClick={() => setEditor(null)}><XMarkIcon /></button></div><form className="admin-editor-form" onSubmit={saveEditor}><label>Nom<input required name="name" value={editorData.name || ''} onChange={event => setEditorData(current => ({ ...current, name: event.target.value }))} /></label>{editor.type === 'place' ? <><label>Identifiant URL<input required name="slug" value={editorData.slug || ''} onChange={event => setEditorData(current => ({ ...current, slug: event.target.value }))} /></label><label>Catégorie<select required value={editorData.category_id || ''} onChange={event => setEditorData(current => ({ ...current, category_id: event.target.value }))}><option value="">Choisir une catégorie</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Adresse<input name="address" value={editorData.address || ''} onChange={event => setEditorData(current => ({ ...current, address: event.target.value }))} /></label></> : <><label>Lieu<select required value={editorData.place_id || ''} onChange={event => setEditorData(current => ({ ...current, place_id: event.target.value }))}><option value="">Choisir un lieu</option>{places.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label><label>Date de début<input required type="date" value={editorData.start_date || ''} onChange={event => setEditorData(current => ({ ...current, start_date: event.target.value }))} /></label></>}<label>Description<textarea value={editorData.description || ''} onChange={event => setEditorData(current => ({ ...current, description: event.target.value }))} rows="4" /></label><label>Image (URL)<input type="url" value={editor.type === 'place' ? editorData.cover_image_url || '' : editorData.image_url || ''} onChange={event => setEditorData(current => ({ ...current, [editor.type === 'place' ? 'cover_image_url' : 'image_url']: event.target.value }))} /></label><label className="admin-checkbox"><input type="checkbox" checked={Boolean(editorData.is_published)} onChange={event => setEditorData(current => ({ ...current, is_published: event.target.checked }))} /> Publié</label><div className="admin-confirm-actions"><button type="button" className="admin-confirm-cancel" onClick={() => setEditor(null)}>Annuler</button><button className="admin-confirm-confirm" type="submit">Enregistrer</button></div></form></div></div>}
    </div>
  )
}

export default AdminPage
