import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Home, User, LogOut, BookOpen, ChevronDown, FileText, AlertCircle,
  ClipboardList, Users, Database, BookMarked, Package, BarChart2, ShoppingCart
} from 'lucide-react'
import ABSLogo from './ABSLogo'
import { useAuth } from '../context/AuthContext'

const navLink = (isActive) =>
  `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
    isActive ? 'text-abs-red bg-red-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
  }`

const LogoutModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-xl p-6 w-80 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <LogOut size={24} className="text-abs-red" />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-gray-900">Logout?</p>
        <p className="text-sm text-gray-400 mt-1">Are you sure you want to log out?</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-abs-red text-sm font-medium text-white hover:bg-red-600">Logout</button>
      </div>
    </div>
  </div>
)

const TopDropdown = ({ icon: Icon, label, items }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const isActive = items.some(i => location.pathname.startsWith(i.to))
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={navLink(isActive)}>
        <Icon size={16} />{label}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {items.map(({ to, icon: IIcon, label: lbl }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${isActive ? 'text-abs-red bg-red-50 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
              }>
              <IIcon size={15} />{lbl}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

const BottomLink = ({ to, icon: Icon, label }) => (
  <NavLink to={to} className={({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
      isActive ? 'text-abs-red' : 'text-gray-400 hover:text-gray-700'
    }`
  }>
    <Icon size={20} />
    <span className="text-[10px]">{label}</span>
  </NavLink>
)

const Navbar = () => {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = async () => { await logout(); navigate('/login') }

  const can = (module) => hasPermission(module, 'view')

  const masterItems = [
    { to: '/master/ledger', icon: BookMarked, label: 'Ledger Master' },
    { to: '/master/items',  icon: Package,    label: 'Item Master' },
  ]
  const ledgerItems = [
    { to: '/ledger/voucher',     icon: FileText,    label: 'Ledger Voucher' },
    { to: '/ledger/outstanding', icon: AlertCircle, label: 'Outstanding' },
  ]

  const roleBadgeClass = user?.role === 'Super Admin' || user?.role === 'Admin'
    ? 'bg-purple-50 text-purple-600'
    : 'bg-green-50 text-green-600'

  return (
    <>
      {showLogoutModal && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)} />
      )}

      {/* Mobile top bar */}
      <nav className="sm:hidden bg-white border-b border-gray-100 shadow-sm px-4 fixed top-0 inset-x-0 z-50">
        <div className="flex items-center justify-between h-12">
          <NavLink to="/home"><ABSLogo size="sm" /></NavLink>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleBadgeClass}`}>{user?.role}</span>
            <button onClick={() => setShowLogoutModal(true)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Desktop top bar */}
      <nav className="hidden sm:block bg-white border-b border-gray-100 shadow-sm px-4 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <NavLink to="/home" className="mr-3 flex-shrink-0"><ABSLogo size="sm" /></NavLink>
            <div className="hidden sm:flex items-center gap-1">
              <NavLink to="/home" className={({ isActive }) => navLink(isActive)}>
                <Home size={16} /> Home
              </NavLink>
              {can('users')   && <NavLink to="/users"              className={({ isActive }) => navLink(isActive)}><Users size={16} /> Users</NavLink>}
              {can('master')  && <TopDropdown icon={Database}  label="Master"  items={masterItems} />}
              {can('ledger')  && <TopDropdown icon={BookOpen}  label="Ledger"  items={ledgerItems} />}
              {can('reports') && <NavLink to="/report/outstanding" className={({ isActive }) => navLink(isActive)}><BarChart2 size={16} /> Report</NavLink>}
              {can('sales')   && <NavLink to="/sales/vouchers"     className={({ isActive }) => navLink(isActive)}><ShoppingCart size={16} /> Sales</NavLink>}
              {can('orders')  && <NavLink to="/orders"             className={({ isActive }) => navLink(isActive)}><ClipboardList size={16} /> Order</NavLink>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadgeClass}`}>{user?.role}</span>
            <NavLink to="/profile" className={({ isActive }) =>
              `w-9 h-9 flex items-center justify-center rounded-lg transition-all ${isActive ? 'text-abs-red bg-red-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`
            }>
              <User size={18} />
            </NavLink>
            <button onClick={() => setShowLogoutModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-50 flex items-stretch">
        <BottomLink to="/home"    icon={Home}   label="Home" />
        {can('users')   && <BottomLink to="/users"              icon={Users}         label="Users" />}
        {can('master')  && <BottomLink to="/master"             icon={Database}      label="Master" />}
        {can('ledger')  && <BottomLink to="/ledger"             icon={BookOpen}      label="Ledger" />}
        {can('reports') && <BottomLink to="/report/outstanding" icon={BarChart2}     label="Report" />}
        {can('sales')   && <BottomLink to="/sales/vouchers"    icon={ShoppingCart}  label="Sales" />}
        {can('orders')  && <BottomLink to="/orders"            icon={ClipboardList} label="Order" />}
        <BottomLink to="/profile" icon={User}   label="Profile" />
      </nav>
    </>
  )
}

export default Navbar
