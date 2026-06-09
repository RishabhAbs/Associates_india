import { useState } from 'react'
import { User, Mail, Phone, Building2, Calendar, Edit2, Check, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={15} className="text-gray-500" />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value || '—'}</p>
    </div>
  </div>
)

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', department: user?.department || '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await updateProfile(form)
      setSuccess(true)
      setEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({ name: user?.name || '', phone: user?.phone || '', department: user?.department || '' })
    setEditing(false)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Compact dark header — centered on mobile */}
      <div className="bg-[#1A1A2E] px-6 py-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
          <User size={28} className="text-white/60" />
        </div>
        <p className="text-xl font-bold text-white">{user?.name}</p>
        <p className="text-xs text-white/50 mt-0.5">{user?.email}</p>
        <span className="inline-block mt-2 text-xs font-bold px-4 py-1 rounded-full bg-abs-yellow text-gray-900">
          {user?.role}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-4">

        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm flex items-center gap-2">
            <Check size={15} /> Profile updated successfully
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
        )}

        {/* Account Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">Account Details</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs font-semibold text-abs-red">
                <Edit2 size={13} /> Edit
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="text-xs font-semibold text-green-600 disabled:opacity-50">
                  {saving ? 'Saving...' : '✓ Save'}
                </button>
                <button onClick={handleCancel} className="text-xs font-semibold text-gray-400">✕ Cancel</button>
              </div>
            )}
          </div>

          {!editing ? (
            <div>
              <InfoRow icon={User}      label="Full Name"      value={user?.name} />
              <InfoRow icon={Mail}      label="Email Address"  value={user?.email} />
              <InfoRow icon={Phone}     label="Phone"          value={user?.phone} />
              <InfoRow icon={Building2} label="Department"     value={user?.department} />
              <InfoRow icon={Calendar}  label="Joined"         value={user?.joinedDate} />
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3">
              {[
                { key: 'name',       label: 'Full Name',  type: 'text' },
                { key: 'phone',      label: 'Phone',      type: 'tel'  },
                { key: 'department', label: 'Department', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input type={type} value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-abs-red" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input type="email" value={user?.email} disabled
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 bg-abs-red text-white font-semibold text-sm rounded-xl mt-1 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
