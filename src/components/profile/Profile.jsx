
// src/components/profile/Profile.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import './Profile.css'
import UserDetailsForm from './UserDetailsForm'
import RecurringItemEditor from './RecurringItemEditor'
import RecurringItemList from './RecurringItemList'
import { useProfileModal } from '../../context/ProfileModalProvider'

export default function Profile() {
  const { isOpen, closeProfile } = useProfileModal()

  // Local state for now; later we can hydrate from backend or context
  const [activeTab, setActiveTab] = useState('recurring') // 'recurring' | 'user'
  const [user, setUser] = useState({ name: '', email: '' })
  const [items, setItems] = useState([])

  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeProfile()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeProfile])

  const handleAddOrUpdate = (newItem) => {
    setItems((prev) => {
      const exists = prev.some((it) => it.id === newItem.id)
      if (exists) {
        return prev.map((it) => (it.id === newItem.id ? newItem : it))
      }
      return [...prev, newItem]
    })
  }

  const handleDelete = (id) => setItems((prev) => prev.filter((it) => it.id !== id))

  const totalByType = useMemo(() => {
    const res = { EMI: 0, SIP: 0, Fixed: 0 }
    for (const it of items) {
      if (res[it.type] != null) res[it.type] += Number(it.amount || 0)
    }
    return res
  }, [items])

  const handleSaveAll = async () => {
    // FRONTEND ONLY: stub - later wire to backend or localStorage
    console.log('[Save User]', user)
    console.log('[Save Recurring Items]', items)
    closeProfile()
  }

  if (!isOpen) return null

  return (
    <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
      <div className="profile-modal" ref={dialogRef}>
        <header className="profile-modal__header">
          <h2 id="profileModalTitle">Profile</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={closeProfile}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <nav className="profile-tabs" role="tablist" aria-label="Profile Sections">
          <button
            className={`profile-tab ${activeTab === 'recurring' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'recurring'}
            onClick={() => setActiveTab('recurring')}
          >
            Recurring
          </button>
          <button
            className={`profile-tab ${activeTab === 'user' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'user'}
            onClick={() => setActiveTab('user')}
          >
            User Details
          </button>
        </nav>

        <section className="profile-modal__content">
          {activeTab === 'recurring' ? (
            <>
              <RecurringItemEditor onSubmit={handleAddOrUpdate} />
              <RecurringItemList
                items={items}
                onDelete={handleDelete}
                onEdit={handleAddOrUpdate}
                totalByType={totalByType}
              />
            </>
          ) : (
            <UserDetailsForm value={user} onChange={setUser} />
          )}
        </section>

        <footer className="profile-modal__footer">
          <button type="button" className="btn-secondary" onClick={closeProfile}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSaveAll}>
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
