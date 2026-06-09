import { useState, useEffect } from 'react'
import React from 'react'
import {
  Search, Plus, X, Check, User, Mail, Phone, Building2, Shield,
  Eye, EyeOff, AtSign, KeyRound, Edit2, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLES = ['Super Admin', 'Admin', 'Manager', 'Sales', 'Viewer']
const DEPARTMENTS = ['Administration', 'Sales', 'Accounts', 'Operations', 'IT']

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users',     label: 'Users' },
  { key: 'master',    label: 'Master' },
  { key: 'ledger',    label: 'Ledger' },
  { key: 'reports',   label: 'Reports' },
  { key: 'orders',    label: 'Orders' },
]
const ACTIONS = ['view', 'create', 'edit', 'delete']

const emptyPermissions = () => ({
  dashboard: { view: true,  create: false, edit: false, delete: false },
  users:     { view: false, create: false, edit: false, delete: false },
  master:    { view: false, create: false, edit: false, delete: false },
  ledger:    { view: false, create: false, edit: false, delete: false },
  reports:   { view: false, create: false, edit: false, delete: false },
  orders:    { view: false, create: false, edit: false, delete: false },
})

const fullPermissions = () =>
  Object.fromEntries(MODULES.map(({ key }) => [key, Object.fromEntries(ACTIONS.map(a => [a, true]))]))

// ── Permissions Grid ───────────────────────────────────────────
const PermissionsGrid = ({ permissions, onChange, isSuperAdmin }) => {
  const toggle = (module, action, checked) => {
    const next = { ...permissions, [module]: { ...permissions[module], [action]: checked } }
    // If unchecking view, uncheck all other actions too
    if (action === 'view' && !checked) {
      next[module] = Object.fromEntries(ACTIONS.map(a => [a, false]))
    }
    // If checking any action (not view), auto-enable view
    if (action !== 'view' && checked) {
      next[module] = { ...next[module], view: true }
    }
    onChange(next)
  }

  const toggleAll = (module, checked) => {
    onChange({ ...permissions, [module]: Object.fromEntries(ACTIONS.map(a => [a, checked])) })
  }

  return (
    <div className="col-span-2">
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <ShieldCheck size={14} className="text-gray-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Page Permissions</span>
          {isSuperAdmin && (
            <span className="ml-auto text-[10px] font-semibold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
              All access (Super Admin)
            </span>
          )}
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-6 gap-0 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Module</div>
          {ACTIONS.map(a => (
            <div key={a} className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">
              {a}
            </div>
          ))}
        </div>

        {/* Module rows */}
        <div className="divide-y divide-gray-50">
          {MODULES.map(({ key, label }) => {
            const perms = permissions[key] || {}
            const allChecked = ACTIONS.every(a => perms[a])
            return (
              <div key={key} className="grid grid-cols-6 gap-0 px-3 py-2.5 items-center hover:bg-gray-50/60 transition-colors">
                {/* Module label + select-all toggle */}
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSuperAdmin || allChecked}
                    disabled={isSuperAdmin}
                    onChange={(e) => toggleAll(key, e.target.checked)}
                    className="w-3.5 h-3.5 accent-red-500 cursor-pointer disabled:cursor-not-allowed"
                    title="Toggle all"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>

                {/* Individual action checkboxes */}
                {ACTIONS.map(action => (
                  <div key={action} className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={isSuperAdmin || (perms[action] === true)}
                      disabled={isSuperAdmin}
                      onChange={(e) => toggle(key, action, e.target.checked)}
                      className="w-4 h-4 accent-red-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Create / Edit User Modal ───────────────────────────────────
const UserModal = ({ user, onClose, onSaved, API }) => {
  const editing = !!user
  const [form, setForm] = useState({
    name:       user?.name       || '',
    username:   user?.username   || '',
    email:      user?.email      || '',
    phone:      user?.phone      || '',
    department: user?.department || '',
    role:       user?.role       || 'Sales',
    password:   '',
  })
  const [permissions, setPermissions] = useState(
    user?.permissions || emptyPermissions()
  )
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const isSuperAdmin = form.role === 'Super Admin'

  // When role switches to Super Admin, fill all permissions
  const handleRoleChange = (role) => {
    set('role', role)
    if (role === 'Super Admin') setPermissions(fullPermissions())
  }

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required'); return }
    if (!editing && !form.username) { setError('Username is required'); return }
    if (!editing && !form.password) { setError('Password is required for new users'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, permissions: isSuperAdmin ? fullPermissions() : permissions }
      if (editing) {
        await API.put(`/users/${user.id}`, payload)
      } else {
        await API.post('/users', payload)
      }
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save user'
      setError(msg)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header — fixed */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">{editing ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form — scrollable */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4 overflow-y-auto overflow-x-hidden flex-1">
          {error && (
            <div className="col-span-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-abs-red focus-within:border-transparent">
              <User size={14} className="text-gray-400 flex-shrink-0" />
              <input type="text" placeholder="Enter full name" value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400" />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Username</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-abs-red focus-within:border-transparent">
              <AtSign size={14} className="text-gray-400 flex-shrink-0" />
              <input type="text" placeholder="Enter username" value={form.username}
                onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                disabled={editing}
                className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 disabled:text-gray-400" />
            </div>
          </div>

          {/* Email */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-abs-red focus-within:border-transparent">
              <Mail size={14} className="text-gray-400 flex-shrink-0" />
              <input type="email" placeholder="user@example.com" value={form.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={editing}
                className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 disabled:text-gray-400" />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-abs-red focus-within:border-transparent">
              <Phone size={14} className="text-gray-400 flex-shrink-0" />
              <input type="tel" placeholder="+91 00000 00000" value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400" />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Department</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-abs-red">
              <Building2 size={14} className="text-gray-400 flex-shrink-0" />
              <select value={form.department} onChange={(e) => set('department', e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent">
                <option value="">Select...</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Role</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-abs-red">
              <Shield size={14} className="text-gray-400 flex-shrink-0" />
              <select value={form.role} onChange={(e) => handleRoleChange(e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {editing ? 'New Password' : 'Password'}
            </label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-abs-red focus-within:border-transparent">
              <KeyRound size={14} className="text-gray-400 flex-shrink-0" />
              <input type={showPassword ? 'text' : 'password'}
                placeholder={editing ? 'Leave blank to keep' : 'Set password'}
                value={form.password} onChange={(e) => set('password', e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Permissions Grid */}
          <PermissionsGrid
            permissions={permissions}
            onChange={setPermissions}
            isSuperAdmin={isSuperAdmin}
          />
        </div>

        {/* Footer — fixed */}
        <div className="px-6 pb-5 pt-3 flex gap-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-abs-red hover:bg-red-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? 'Saving...' : <><Check size={14} /> {editing ? 'Update' : 'Create User'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Swipeable mobile user card ────────────────────────────────
const SwipeCard = ({ u, onEdit }) => {
  const [offset, setOffset] = React.useState(0)
  const startX = React.useRef(0)
  const SNAP = 72

  const handleTouchStart = e => { startX.current = e.touches[0].clientX }
  const handleTouchMove = e => {
    const dx = startX.current - e.touches[0].clientX
    setOffset(Math.max(0, Math.min(SNAP, dx)))
  }
  const handleTouchEnd = () => { setOffset(offset > SNAP / 2 ? SNAP : 0) }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      <div className="absolute right-0 top-0 bottom-0 w-[72px] bg-abs-red flex items-center justify-center">
        <button onClick={onEdit} className="flex flex-col items-center gap-0.5">
          <Edit2 size={16} className="text-white" />
          <span className="text-white text-[10px] font-bold">Edit</span>
        </button>
      </div>
      <div className="bg-white px-4 py-3 transition-transform duration-150"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onClick={() => offset > 0 && setOffset(0)}>
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-gray-500" />
            </div>
            <span className="text-sm font-bold text-gray-800 truncate">{u.name}</span>
            <RoleBadge role={u.role} />
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">{u.phone || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 pl-[34px]">
          <span className="text-xs text-gray-400 truncate">{u.email}</span>
          {u.joinedDate && <span className="text-[10px] text-gray-400 flex-shrink-0">{u.joinedDate}</span>}
        </div>
      </div>
    </div>
  )
}

const RoleBadge = ({ role }) => {
  const map = {
    'Super Admin': 'bg-purple-50 text-purple-600',
    'Admin':       'bg-blue-50 text-blue-600',
    'Manager':     'bg-indigo-50 text-indigo-600',
    'Sales':       'bg-green-50 text-green-600',
    'Viewer':      'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[role] || 'bg-gray-100 text-gray-500'}`}>
      {role}
    </span>
  )
}

// ── Main Users page ────────────────────────────────────────────
const Users = () => {
  const { API, hasPermission } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [modal, setModal] = useState(null)

  const canCreate = hasPermission('users', 'create')
  const canEdit   = hasPermission('users', 'edit')

  const fetchUsers = () => {
    setLoading(true)
    API.get('/users')
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'All' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="px-4 py-3">
      {/* Sticky search + filter */}
      <div className="sticky top-12 z-10 bg-gray-100 -mx-4 px-4 pt-1 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-3 py-2 gap-2">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search by name, email or department..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
          </div>
          {canCreate && (
            <button onClick={() => setModal('create')}
              className="flex items-center gap-2 px-4 py-2 bg-abs-red hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0">
              <Plus size={15} /> Add User
            </button>
          )}
        </div>
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {['All', ...ROLES].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                roleFilter === r ? 'bg-abs-red text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: 'Total Users', value: users.length, color: 'text-gray-800' },
          { label: 'Admins',  value: users.filter(u => u.role?.includes('Admin')).length, color: 'text-purple-600' },
          { label: 'Sales',   value: users.filter(u => u.role === 'Sales').length,        color: 'text-green-600' },
          { label: 'Others',  value: users.filter(u => !['Super Admin','Admin','Sales'].includes(u.role)).length, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-abs-red animate-spin" />
          <p className="text-sm text-gray-400">Loading users...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center py-14">
          <p className="text-sm text-gray-400">No users found.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {filtered.map((u, i) => (
              canEdit
                ? <SwipeCard key={u.id || i} u={u} onEdit={() => setModal(u)} />
                : <div key={u.id || i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User size={13} className="text-gray-500" />
                      </div>
                      <span className="text-sm font-bold text-gray-800">{u.name}</span>
                      <RoleBadge role={u.role} />
                    </div>
                    <p className="text-xs text-gray-400 pl-[34px]">{u.email}</p>
                  </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Joined</th>
                  {canEdit && <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <User size={13} className="text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.department || '—'}</td>
                    <td className="px-4 py-3 text-center"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.joinedDate || '—'}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setModal(u)} className="px-3 py-1 text-xs font-medium text-abs-red border border-red-200 rounded-lg hover:bg-red-50">Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          API={API}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchUsers() }}
        />
      )}
    </div>
  )
}

export default Users
