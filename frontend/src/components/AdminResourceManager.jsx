import React, { useEffect, useState } from 'react'
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { API_URL } from '../config'

const fieldLabels = {
  name: 'Nom', slug: 'Identifiant URL', description: 'Description', icon_url: 'Icône (URL)', color_hex: 'Couleur',
  category_id: 'Catégorie', required_place_count: 'Lieux requis', reward_text: 'Récompense', is_active: 'Actif',
  requirement_count: 'Visites requises', category: 'Catégorie',
}

export default function AdminResourceManager({ title, resource, fields, categories = [] }) {
  const [items, setItems] = useState([])
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')

  const loadItems = async () => {
    const response = await fetch(`${API_URL}/admin/${resource}`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } })
    if (!response.ok) throw new Error('Chargement impossible')
    const data = await response.json()
    setItems(data.items || data)
  }

  useEffect(() => { loadItems().catch(error => setError(error.message)) }, [resource])

  const save = async (event) => {
    event.preventDefault()
    const payload = { ...form }
    if (fields.includes('required_place_count')) payload.required_place_count = Number(payload.required_place_count)
    if (fields.includes('requirement_count') && payload.requirement_count) payload.requirement_count = Number(payload.requirement_count)
    const response = await fetch(`${API_URL}/admin/${resource}${editor?.id ? `/${editor.id}` : ''}`, {
      method: editor?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      body: JSON.stringify(payload),
    })
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Sauvegarde impossible') }
    setEditor(null)
    await loadItems()
  }

  const remove = async (item) => {
    if (!window.confirm(`Supprimer « ${item.name} » ?`)) return
    const response = await fetch(`${API_URL}/admin/${resource}/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } })
    if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error || 'Suppression impossible'); return }
    setItems(current => current.filter(value => value.id !== item.id))
  }

  return <section className="admin-section">
    <div className="admin-section-heading"><div><span className="admin-eyebrow">Configuration</span><h2>{title}</h2></div><button className="admin-add-button" onClick={() => { setEditor({}); setForm({ is_active: true }) }}><PlusIcon /> Créer</button></div>
    {error && <div className="admin-alert" role="alert">{error}</div>}
    <div className="admin-management-list">{items.length === 0 ? <div className="admin-empty">Aucun élément.</div> : items.map(item => <article className="admin-management-row" key={item.id}><div><strong>{item.name}</strong><small>{item.description || item.slug || item.category || 'Sans description'}</small></div><div className="admin-row-actions"><button title="Modifier" aria-label={`Modifier ${item.name}`} onClick={() => { setEditor(item); setForm(item) }}><PencilSquareIcon /></button><button className="admin-danger-button" title="Supprimer" aria-label={`Supprimer ${item.name}`} onClick={() => remove(item)}><TrashIcon /></button></div></article>)}</div>
    {editor && <div className="admin-confirm-overlay" role="dialog" aria-modal="true"><div className="admin-editor-dialog"><div className="admin-section-heading"><h3>{editor.id ? 'Modifier' : 'Créer'} {title.toLowerCase()}</h3><button className="admin-icon-button" aria-label="Fermer" onClick={() => setEditor(null)}><XMarkIcon /></button></div><form className="admin-editor-form" onSubmit={event => save(event).catch(error => setError(error.message))}>{fields.map(field => <label key={field}>{fieldLabels[field]}{field === 'description' ? <textarea rows="4" value={form[field] || ''} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} /> : field === 'category_id' ? <select value={form[field] || ''} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))}><option value="">Sans catégorie</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : field === 'is_active' ? <input type="checkbox" checked={Boolean(form[field])} onChange={event => setForm(current => ({ ...current, [field]: event.target.checked }))} /> : <input required={['name', 'slug', 'required_place_count'].includes(field)} type={field.includes('count') ? 'number' : field === 'color_hex' ? 'color' : field.includes('url') ? 'url' : 'text'} value={form[field] || ''} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} />}</label>)}<div className="admin-confirm-actions"><button type="button" className="admin-confirm-cancel" onClick={() => setEditor(null)}>Annuler</button><button className="admin-confirm-confirm" type="submit">Enregistrer</button></div></form></div></div>}
  </section>
}
