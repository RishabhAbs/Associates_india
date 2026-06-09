import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API = axios.create({ baseURL: '/api' })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('abs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('abs_token')
    if (token) {
      API.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('abs_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const res = await API.post('/auth/login', { username, password })
    localStorage.setItem('abs_token', res.data.token)
    setUser(res.data.user)
    return res.data
  }

  const logout = async () => {
    try { await API.post('/auth/logout') } catch (_) {}
    localStorage.removeItem('abs_token')
    setUser(null)
  }

  const updateProfile = async (data) => {
    const res = await API.put('/auth/profile', data)
    setUser(res.data.user)
    return res.data
  }

  // Super Admin bypasses all checks; others need explicit permission
  const hasPermission = (module, action = 'view') => {
    if (!user) return false
    if (user.role === 'Super Admin') return true
    return user.permissions?.[module]?.[action] === true
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile, API, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
