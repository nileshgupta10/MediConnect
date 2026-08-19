// src/pages/insurance-leads.js
// Store-owner page: submit and track insurance leads for customers
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import StoreLayout from '../components/StoreLayout'

const STATUS_META = {
  new:                  { label: 'New',                 color: '#6b7280', bg: '#f3f4f6' },
  called:               { label: 'Called',              color: '#2563eb', bg: '#eff6ff' },
  meeting_arranged:     { label: 'Meeting Arranged',    color: '#d97706', bg: '#fffbeb' },
  quotation_submitted:  { label: 'Quotation Submitted', color: '#ea580c', bg: '#fff7ed' },
  payment_received:     { label: 'Payment Received',    color: '#0891b2', bg: '#ecfeff' },
  policy_allotted:      { label: 'Policy Allotted',     color: '#16a34a', bg: '#f0fdf4' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 700,
      color: meta.color,
      background: meta.bg,
      border: `1px solid ${meta.color}33`,
    }}>
      {meta.label}
    </span>
  )
}

function LeadCard({ lead }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={s.leadCard}>
      <div style={s.leadCardTop} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={s.leadName}>{lead.customer_name}</div>
          <div style={s.leadMeta}>
            📞 {lead.customer_phone}
            {lead.customer_age ? `  •  Age: ${lead.customer_age}` : ''}
          </div>
          <div style={{ marginTop: 6 }}>
            <StatusBadge status={lead.status} />
          </div>
        </div>
        <div style={s.leadDate}>
          {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          <div style={s.expandHint}>{expanded ? '▲ Hide' : '▼ History'}</div>
        </div>
      </div>

      {expanded && (
        <div style={s.timeline}>
          {lead.updates.length === 0 ? (
            <p style={s.noUpdates}>No updates from agent yet.</p>
          ) : (
            lead.updates.map((u, i) => {
              const meta = STATUS_META[u.status] || { label: u.status, color: '#6b7280', bg: '#f3f4f6' }
              return (
                <div key={u.id} style={s.timelineItem}>
                  <div style={{ ...s.timelineDot, background: meta.color }} />
                  <div style={s.timelineBody}>
                    <div style={s.timelineStatus}>
                      <span style={{ color: meta.color, fontWeight: 700, fontSize: 13 }}>{meta.label}</span>
                      <span style={s.timelineDate}>
                        {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {u.note && <div style={s.timelineNote}>{u.note}</div>}
                    {u.amount && <div style={s.timelineAmount}>💰 ₹{u.amount}</div>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function InsuranceLeads() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [leads, setLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAge, setFormAge] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/simple-login'); return }
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (authReady) loadLeads()
  }, [authReady])

  const loadLeads = async () => {
    setLoadingLeads(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/insurance/leads', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json()
    if (!res.ok) {
      console.error('[insurance-leads] load error:', json.error)
      setLeads([])
    } else {
      setLeads(json.leads || [])
    }
    setLoadingLeads(false)
  }

  const handleSubmit = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      setFormMsg('Customer name and phone are required.')
      return
    }
    setSubmitting(true)
    setFormMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/insurance/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ customer_name: formName, customer_phone: formPhone, customer_age: formAge || undefined }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setFormMsg('Error: ' + (json.error || 'Unknown error'))
    } else {
      setFormMsg('')
      setFormName(''); setFormPhone(''); setFormAge('')
      setShowForm(false)
      setLeads(prev => [{ ...json.lead }, ...prev])
    }
  }

  if (!authReady) return null

  return (
    <StoreLayout>
      <div style={s.pageWrap}>
        {/* Banner */}
        <div style={s.banner}>
          <div style={s.bannerIcon}>🛡️</div>
          <div>
            <h2 style={s.bannerTitle}>Insurance Leads</h2>
            <p style={s.bannerSub}>Submit and track insurance leads for your customers</p>
          </div>
        </div>

        <div style={s.content}>
          {/* New Lead button / form */}
          {!showForm ? (
            <button style={s.newLeadBtn} onClick={() => { setShowForm(true); setFormMsg('') }}>
              + New Lead
            </button>
          ) : (
            <div style={s.formCard}>
              <h3 style={s.formTitle}>New Insurance Lead</h3>
              <label style={s.label}>Customer Name *</label>
              <input style={s.input} placeholder="Full name" value={formName} onChange={e => setFormName(e.target.value)} />
              <label style={s.label}>Phone Number *</label>
              <input style={s.input} placeholder="Mobile number" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
              <label style={s.label}>Age (optional)</label>
              <input style={s.input} placeholder="e.g. 35" type="number" min="1" max="120" value={formAge} onChange={e => setFormAge(e.target.value)} />
              {formMsg && <p style={s.errMsg}>{formMsg}</p>}
              <div style={s.formBtns}>
                <button style={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Lead'}
                </button>
                <button style={s.cancelBtn} onClick={() => { setShowForm(false); setFormMsg('') }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Leads list */}
          <h3 style={s.sectionTitle}>
            Your Leads {!loadingLeads && `(${leads.length})`}
          </h3>

          {loadingLeads ? (
            <p style={s.emptyMsg}>Loading…</p>
          ) : leads.length === 0 ? (
            <p style={s.emptyMsg}>No leads submitted yet. Click "+ New Lead" to add one.</p>
          ) : (
            leads.map(lead => <LeadCard key={lead.id} lead={lead} />)
          )}
        </div>
      </div>
    </StoreLayout>
  )
}

const s = {
  pageWrap: { minHeight: '100vh', background: '#f0fdfd', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  banner: {
    background: 'linear-gradient(135deg, #0f3460 0%, #0e9090 100%)',
    padding: '28px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  bannerIcon: { fontSize: 44, lineHeight: 1 },
  bannerTitle: { color: 'white', fontSize: 24, fontWeight: 900, margin: 0 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, marginBottom: 0 },
  content: { maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' },
  newLeadBtn: {
    display: 'block', width: '100%', padding: '13px 0',
    background: '#0e9090', color: 'white', border: 'none',
    borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer',
    marginBottom: 24,
  },
  formCard: {
    background: 'white', borderRadius: 14, padding: 20,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginBottom: 24,
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  formTitle: { fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 8, marginTop: 0 },
  label: { fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 10 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', fontSize: 14,
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  errMsg: { fontSize: 13, color: '#dc2626', fontWeight: 600, margin: '6px 0 0' },
  formBtns: { display: 'flex', gap: 10, marginTop: 14 },
  submitBtn: {
    flex: 1, padding: '11px 0', background: '#0e9090', color: 'white',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1, padding: '11px 0', background: '#f1f5f9', color: '#475569',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  sectionTitle: { fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 12, marginTop: 8 },
  emptyMsg: { fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: '24px 0' },
  leadCard: {
    background: 'white', borderRadius: 14, marginBottom: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  leadCardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '14px 16px', cursor: 'pointer',
  },
  leadName: { fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 3 },
  leadMeta: { fontSize: 13, color: '#64748b' },
  leadDate: { fontSize: 12, color: '#94a3b8', textAlign: 'right', minWidth: 70 },
  expandHint: { fontSize: 11, color: '#0e9090', fontWeight: 700, marginTop: 4 },
  timeline: {
    borderTop: '1px solid #f1f5f9', padding: '12px 16px 16px',
    background: '#fafafa',
  },
  noUpdates: { fontSize: 13, color: '#94a3b8', margin: 0, fontStyle: 'italic' },
  timelineItem: { display: 'flex', gap: 10, marginBottom: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  timelineBody: { flex: 1 },
  timelineStatus: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  timelineDate: { fontSize: 11, color: '#94a3b8' },
  timelineNote: { fontSize: 13, color: '#475569', marginTop: 3 },
  timelineAmount: { fontSize: 13, color: '#0e9090', fontWeight: 700, marginTop: 3 },
}
