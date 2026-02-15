import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function PostJob() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [shift, setShift] = useState('')
  const [numOpenings, setNumOpenings] = useState('')
  const [requiredExperience, setRequiredExperience] = useState('')
  const [preferredSoftware, setPreferredSoftware] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)

  const submitJob = async () => {
    if (!title.trim() || !shift || !numOpenings || !requiredExperience) {
      setMessage('Please fill in all required fields.')
      return
    }

    const openings = parseInt(numOpenings)
    if (isNaN(openings) || openings < 1) {
      setMessage('Number of openings must be at least 1.')
      return
    }

    setPosting(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/simple-login'); return }

    const { data: storeProfile } = await supabase
      .from('store_profiles')
      .select('store_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const { error } = await supabase
      .from('jobs')
      .insert({
        title: title.trim(),
        shift,
        num_openings: openings,
        required_experience: requiredExperience,
        preferred_software: preferredSoftware.trim() || null,
        description: description.trim() || null,
        location: storeProfile?.store_name || 'Location not set',
        store_owner_id: user.id,
      })

    setPosting(false)

    if (error) { setMessage('Error: ' + error.message); return }

    setMessage('Job posted successfully!')
    setTitle('')
    setShift('')
    setNumOpenings('')
    setRequiredExperience('')
    setPreferredSoftware('')
    setDescription('')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Post a Job</h1>

        <label style={styles.label}>Job Title *</label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Full-time Pharmacist"
          maxLength={100}
        />

        <label style={styles.label}>Shift *</label>
        <select style={styles.select} value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="">Select Shift</option>
          <option value="Morning">Morning</option>
          <option value="Night">Night</option>
          <option value="Both">Both (Morning & Night)</option>
        </select>

        <label style={styles.label}>Number of Openings *</label>
        <input
          type="number"
          style={styles.input}
          value={numOpenings}
          onChange={(e) => setNumOpenings(e.target.value)}
          placeholder="e.g. 2"
          min="1"
          max="99"
        />

        <label style={styles.label}>Required Experience *</label>
        <select style={styles.select} value={requiredExperience} onChange={(e) => setRequiredExperience(e.target.value)}>
          <option value="">Select Experience</option>
          <option value="Fresher">Fresher</option>
          <option value="1-5 years">1-5 years</option>
          <option value="5+ years">5+ years</option>
        </select>

        <label style={styles.label}>Preferred Software (Optional)</label>
        <input
          style={styles.input}
          value={preferredSoftware}
          onChange={(e) => setPreferredSoftware(e.target.value)}
          placeholder="e.g. PharmERP, Marg, GoFrugal"
          maxLength={200}
        />

        <label style={styles.label}>Job Description (Optional)</label>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details about working hours, benefits, etc."
          maxLength={1000}
        />

        <button style={styles.primaryBtn} onClick={submitJob} disabled={posting}>
          {posting ? 'Posting…' : 'Post Job'}
        </button>

        {message && (
          <p style={message.startsWith('Error') || message.startsWith('Please') || message.startsWith('Number')
            ? styles.errorMsg : styles.successMsg}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
  card: { width: '100%', maxWidth: 520, background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.08)' },
  heading: { fontSize: 22, marginBottom: 20 },
  label: { display: 'block', marginTop: 14, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#475569' },
  input: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' },
  select: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, background: 'white', boxSizing: 'border-box' },
  textarea: { width: '100%', minHeight: 100, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' },
  primaryBtn: { marginTop: 20, width: '100%', padding: 14, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 600 },
  successMsg: { marginTop: 12, fontSize: 14, color: '#059669', padding: '8px 12px', background: '#f0fdf4', borderRadius: 6 },
  errorMsg: { marginTop: 12, fontSize: 14, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 6 },
}