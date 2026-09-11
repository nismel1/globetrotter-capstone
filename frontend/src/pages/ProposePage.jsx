import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { API_URL } from '../config'

function ProposePage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [categories, setCategories] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProposal, setSelectedProposal] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    coords: '0.3920, 9.4530',
    phone: '',
    email: '',
    tags: 'Vue panoramique, Calme, Terrasse',
    openingDay: 'Lundi',
    openTime: '09:00',
    closeTime: '18:00',
    isClosed: false,
    isOpen24: false,
  })

  // User proposals list
  const [proposals, setProposals] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    const userId = user?.id

    fetch(`${API_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))

    if (token && userId) {
      fetch(`${API_URL}/proposals/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const mapped = data.map((p) => ({
              id: p.id,
              title: p.name,
              category: 'Proposition Utilisateur',
              location: p.address || 'Libreville, Gabon',
              description: p.description || 'Lieu proposé par la communauté.',
              date: new Date(p.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
              status: p.status === 'approved' ? 'Approuvé' : p.status === 'rejected' ? 'Refusé' : 'En attente',
              image: p.image_urls?.[0] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
            }))
            setProposals(mapped)
          }
        })
        .catch(() => {})
    }
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handlePhotoSelect = (file) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('La photo ne doit pas dépasser 5 Mo.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoDrop = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handlePhotoSelect(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    const userId = user?.id

    const payload = {
      name: formData.name,
      description: formData.description || 'Lieu proposé par la communauté.',
      address: formData.address || 'Libreville, Gabon',
      latitude: parseFloat((formData.coords || '').split(',')[0]) || 0.392,
      longitude: parseFloat((formData.coords || '').split(',')[1]) || 9.453,
      category_id: formData.category || (categories[0]?.id || null),
      user_id: userId,
      image_urls: photoPreview ? [photoPreview] : [],
    }

    try {
      if (!token || !userId) throw new Error('Authentification requise')
      const response = await fetch(`${API_URL}/places/propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const details = await response.json().catch(() => null)
        throw new Error(details?.error || 'Échec de création de la proposition')
      }
      const savedProposal = await response.json()
      const proposal = savedProposal.place || savedProposal
      setProposals((current) => [{
        id: proposal.id || Date.now().toString(),
        title: proposal.name || formData.name,
        category: 'Proposition Utilisateur',
        location: proposal.address || formData.address || 'Libreville',
        description: proposal.description || formData.description,
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'En attente',
        image: proposal.image_urls?.[0] || photoPreview || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      }, ...current])
    } catch (err) {
      alert(`La proposition n’a pas pu être enregistrée : ${err.message}`)
      return
    }
    alert('Votre proposition a été enregistrée avec succès dans la base de données ! Elle est en cours de validation.')
    setFormData({
      name: '',
      category: '',
      description: '',
      address: '',
      coords: '0.3920, 9.4530',
      phone: '',
      email: '',
      tags: '',
      openingDay: 'Lundi',
      openTime: '09:00',
      closeTime: '18:00',
      isClosed: false,
      isOpen24: false,
    })
    setPhotoPreview(null)
  }

  const filteredProposals = proposals.filter((p) => {
    if (statusFilter === 'Tous') return true
    return p.status === statusFilter
  })

  // Pagination logic (3 items per page)
  const itemsPerPage = 3
  const totalPages = Math.max(1, Math.ceil(filteredProposals.length / itemsPerPage))
  const paginatedProposals = filteredProposals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar audioActive={true} onToggleAudio={() => {}} />

      <div className="app-container">
        {/* Page Header (Wireframe 2) */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px', color: '#A4BD01' }}>📍</span>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 600, color: '#EBF2FA' }}>
              Proposer un lieu
            </h1>
          </div>
          <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', color: '#427AA1' }}>
            Partagez un endroit que vous aimez et aidez la communauté à découvrir des lieux uniques.
          </p>
        </div>

        {/* 2-Column Grid (Wireframe 2) */}
        <div className="wireframe-grid-2col">
          {/* Left Column: Form Card "Nouveau lieu" */}
          <div
            style={{
              background: 'rgba(2, 32, 46, 0.85)',
              border: '1px solid rgba(164, 189, 1, 0.25)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.12em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>➕</span> NOUVEAU LIEU
            </div>

            <form onSubmit={handleSubmit}>
              {/* Row 1: Nom & Catégorie */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#EBF2FA', marginBottom: '6px' }}>
                    Nom du lieu <span style={{ color: '#679436' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Ex. : Café des Voyageurs"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(164, 189, 1, 0.3)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      color: '#EBF2FA',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#EBF2FA', marginBottom: '6px' }}>
                    Catégorie <span style={{ color: '#679436' }}>*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(2, 32, 46, 0.9)',
                      border: '1px solid rgba(164, 189, 1, 0.3)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      color: '#EBF2FA',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#EBF2FA', marginBottom: '6px' }}>
                  Description <span style={{ color: '#679436' }}>*</span>
                </label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Décrivez l'ambiance, les spécialités, l'histoire..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(164, 189, 1, 0.3)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#EBF2FA',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Adresse & Coordonnées */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#EBF2FA', marginBottom: '6px' }}>
                    Adresse <span style={{ color: '#679436' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Ex. : Bd du Bord de Mer, Libreville"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(164, 189, 1, 0.3)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      color: '#EBF2FA',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#EBF2FA', marginBottom: '6px' }}>
                    Coordonnées GPS (Lat, Long)
                  </label>
                  <input
                    type="text"
                    name="coords"
                    value={formData.coords}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(164, 189, 1, 0.3)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      color: '#EBF2FA',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Photo Dropzone */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#EBF2FA', marginBottom: '6px' }}>
                  Photo du lieu
                </label>
                <div
                  style={{
                    border: '2px dashed rgba(164, 189, 1, 0.4)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.2)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoDrop}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  {photoPreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img src={photoPreview} alt="Aperçu" style={{ maxHeight: '100px', borderRadius: '6px' }} />
                      <span style={{ fontSize: '11px', color: '#A4BD01' }}>Photo ajoutée (cliquez pour changer)</span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '24px' }}>📷</span>
                      <p style={{ fontSize: '12px', color: '#427AA1', margin: '4px 0 0' }}>Glissez une photo ici ou cliquez pour choisir un fichier</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #A4BD01 0%, #679436 100%)',
                  color: '#02202E',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(164, 189, 1, 0.3)',
                }}
              >
                ✈️ Soumettre ma proposition
              </button>
            </form>
          </div>

          {/* Right Column: "Mes propositions" List Card */}
          <div
            style={{
              background: 'rgba(2, 32, 46, 0.85)',
              border: '1px solid rgba(164, 189, 1, 0.25)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div>
              {/* Header & Filter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.12em' }}>
                    📑 MES PROPOSITIONS
                  </div>
                  <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '12px', color: '#427AA1' }}>
                    Retrouvez ici tous les lieux que vous avez proposés.
                  </div>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(164, 189, 1, 0.3)',
                    color: '#A4BD01',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                  }}
                >
                  <option value="Tous">Tous les statuts</option>
                  <option value="En attente">En attente</option>
                  <option value="Approuvé">Approuvé</option>
                  <option value="Refusé">Refusé</option>
                </select>
              </div>

              {/* Proposal Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {paginatedProposals.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#427AA1', padding: '32px 0' }}>
                    Aucune proposition pour le moment.
                  </div>
                ) : (
                  paginatedProposals.map((item) => {
                    let badgeBg = 'rgba(164, 189, 1, 0.2)'
                    let badgeColor = '#A4BD01'
                    if (item.status === 'Approuvé') {
                      badgeBg = 'rgba(46, 125, 50, 0.3)'
                      badgeColor = '#81C784'
                    } else if (item.status === 'Refusé') {
                      badgeBg = 'rgba(103, 148, 54, 0.3)'
                      badgeColor = '#E57373'
                    }

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          gap: '14px',
                          alignItems: 'center',
                        }}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }}
                        />

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '15px', fontWeight: 'bold', color: '#EBF2FA' }}>
                              {item.title}
                            </h4>
                            <span
                              style={{
                                background: badgeBg,
                                color: badgeColor,
                                border: `1px solid ${badgeColor}`,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '9px',
                              }}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1', marginTop: '2px' }}>
                            {item.category} • {item.location}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(239, 230, 211, 0.5)' }}>
                              Proposé le : {item.date}
                            </span>
                            <span
                              onClick={() => setSelectedProposal(item)}
                              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01', cursor: 'pointer' }}
                            >
                              Voir les détails →
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '24px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                color: '#427AA1',
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: currentPage === 1 ? '#555' : '#427AA1', padding: '6px 12px', borderRadius: '4px', cursor: currentPage === 1 ? 'default' : 'pointer' }}
              >
                &lt; Précédent
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <span
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      color: currentPage === pageNum ? '#A4BD01' : '#427AA1',
                      fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: currentPage === pageNum ? 'rgba(164, 189, 1, 0.15)' : 'transparent',
                    }}
                  >
                    {pageNum}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: currentPage === totalPages ? '#555' : '#427AA1', padding: '6px 12px', borderRadius: '4px', cursor: currentPage === totalPages ? 'default' : 'pointer' }}
              >
                Suivant &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Details Modal */}
      {selectedProposal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#02202E',
              border: '1px solid #A4BD01',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '500px',
            }}
          >
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', color: '#A4BD01', marginBottom: '12px' }}>
              {selectedProposal.title}
            </h3>

            <img
              src={selectedProposal.image}
              alt={selectedProposal.title}
              style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px' }}
            />

            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1', marginBottom: '12px' }}>
              Statut : <span style={{ color: '#AF37', fontWeight: 'bold' }}>{selectedProposal.status}</span> • Date : {selectedProposal.date}
            </div>

            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '14px', color: '#EBF2FA', lineHeight: '1.5', marginBottom: '16px' }}>
              {selectedProposal.description}
            </p>

            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1', marginBottom: '20px' }}>
              📍 Adresse : {selectedProposal.location}
            </div>

            <button
              onClick={() => setSelectedProposal(null)}
              style={{ width: '100%', padding: '10px', background: '#A4BD01', color: '#02202E', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProposePage
