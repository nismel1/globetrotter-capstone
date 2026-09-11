import React, { useState, useEffect, useContext } from 'react'
import GroupVoting from './GroupVoting'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../config'
import { UserGroupIcon, CalculatorIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function GroupDashboard({ group, groupId }) {
  const { token } = useContext(AuthContext)
  const [groupData, setGroupData] = useState(group || null)
  const [expenses, setExpenses] = useState(group?.expenses || [])
  const [loading, setLoading] = useState(!group)
  const [error, setError] = useState('')
  const [newExpense, setNewExpense] = useState({ title: '', cost: '', paidBy: 'Vous' })

  useEffect(() => {
    const targetGroupId = groupId || group?.id
    if (!token || !targetGroupId) return

    const fetchGroup = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/groups/${targetGroupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error('Impossible de charger le groupe')
        }

        const data = await response.json()
        setGroupData(data.group || data)
        setExpenses(data.expenses || data.group?.expenses || [])
        setError('')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [group, groupId, token])

  const defaultGroup = groupData || {
    title: 'Groupe Libreville',
    date: 'À venir',
    members: [],
    expenses: [],
  }

  const totalCost = expenses.reduce((sum, e) => sum + Number(e.cost || 0), 0)
  const costPerPerson = defaultGroup.members.length ? Math.round(totalCost / defaultGroup.members.length) : 0

  const handleAddExpense = (e) => {
    e.preventDefault()
    if (!newExpense.title || !newExpense.cost) return

    setExpenses((prev) => [...prev, {
      id: Date.now(),
      title: newExpense.title,
      cost: Number(newExpense.cost),
      paidBy: newExpense.paidBy,
    }])
    setNewExpense({ title: '', cost: '', paidBy: 'Vous' })
  }

  if (loading) return <div style={{ padding: 20, color: '#EBF2FA' }}>Chargement du groupe…</div>
  if (error) return <div style={{ padding: 20, color: '#ffb4b4' }}>{error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Group Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(164, 189, 1, 0.15) 0%, rgba(2, 32, 46, 0.9) 100%)',
          border: '1px solid #A4BD01',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.1em' }}>
          📊 DASHBOARD DE GROUPE • PREMIUM
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 'bold', color: '#EBF2FA', marginTop: '4px' }}>
          {defaultGroup.title}
        </h2>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1', marginTop: '4px' }}>
          📅 {defaultGroup.date} • {defaultGroup.members.length} Membres actifs
        </div>
      </div>

      {/* Grid: Members & Budget Splitter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Members List */}
        <div
          style={{
            background: 'rgba(2, 32, 46, 0.85)',
            border: '1px solid rgba(164, 189, 1, 0.3)',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', marginBottom: '12px' }}>
            👥 MEMBRES DU GROUPE ({defaultGroup.members.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {defaultGroup.members.map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '13px', color: '#EBF2FA' }}>
                  👤 {m}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#679436' }}>
                  ✓ Confirmé
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Splitter Calculator */}
        <div
          style={{
            background: 'rgba(2, 32, 46, 0.85)',
            border: '1px solid rgba(164, 189, 1, 0.3)',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', marginBottom: '12px' }}>
            💶 CALCULATEUR DE RÉPARTITION DES DÉPENSES
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(164, 189, 1, 0.1)', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1' }}>Dépense Totale</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 'bold', color: '#A4BD01' }}>€{totalCost}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#427AA1' }}>Part par personne</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 'bold', color: '#679436' }}>€{costPerPerson}</div>
            </div>
          </div>

          {/* Expenses breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {expenses.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", color: '#427AA1' }}>
                <span>{e.title} ({e.paidBy})</span>
                <span style={{ color: '#EBF2FA', fontWeight: 'bold' }}>€{e.cost}</span>
              </div>
            ))}
          </div>

          {/* Add Expense Form */}
          <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Dépense (ex: Essence)"
              value={newExpense.title}
              onChange={(ex) => setNewExpense({ ...newExpense, title: ex.target.value })}
              style={{ flex: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px', fontSize: '11px' }}
            />
            <input
              type="number"
              placeholder="Prix €"
              value={newExpense.cost}
              onChange={(ex) => setNewExpense({ ...newExpense, cost: ex.target.value })}
              style={{ width: '70px', padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,175,55,0.3)', color: '#EBF2FA', borderRadius: '6px', fontSize: '11px' }}
            />
            <button type="submit" style={{ background: '#A4BD01', color: '#02202E', border: 'none', borderRadius: '6px', padding: '0 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>+</button>
          </form>
        </div>
      </div>

      {/* Integrated Group Voting */}
      <GroupVoting />
    </div>
  )
}
