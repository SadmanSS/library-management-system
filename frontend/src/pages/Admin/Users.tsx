import { useEffect, useState } from 'react'
import { getUsers, updateUserRole } from '../../services/api'
import type { Profile, Role, Route } from '../../types'
import { StateMessage } from '../../components/ui/StateMessage'

export function Admin({ onNavigate }: { onNavigate: (path: Route) => void }) {
  const [users, setUsers] = useState<Profile[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  useEffect(() => {
    getUsers().then(setUsers).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load users.')).finally(() => setLoading(false))
  }, [])
  async function changeRole(user: Profile, role: Role) {
    setSaving(user.auth_user_id); setError('')
    try { const updated = await updateUserRole(user.auth_user_id, role); setUsers((current) => current.map((item) => item.auth_user_id === updated.auth_user_id ? updated : item)) } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Unable to update this role.') } finally { setSaving('') }
  }
  if (loading) return <section className="form-page"><StateMessage loading title="Loading users..." text="Just a moment." /></section>
  return <section className="form-page admin-page"><div className="form-heading"><p className="section-kicker">ADMINISTRATION</p><h1>Manage users</h1><p>Assign roles without allowing users to elevate their own access.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="admin-user-list">{users.map((user) => <div className="admin-user-row" key={user.auth_user_id}><div><strong>{user.full_name || user.email}</strong><small>{user.email}</small></div><select value={user.role} disabled={saving === user.auth_user_id} onChange={(event) => changeRole(user, event.target.value as Role)}><option value="member">Member</option><option value="librarian">Librarian</option><option value="admin">Admin</option></select></div>)}</div><button className="button button-secondary" onClick={() => onNavigate('/')}>Back to home</button></section>
}
