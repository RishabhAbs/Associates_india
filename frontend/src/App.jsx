import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Home from './pages/Home'
import Profile from './pages/Profile'
import LedgerVoucher from './pages/LedgerVoucher'
import LedgerOutstanding from './pages/LedgerOutstanding'
import Order from './pages/Order'
import Users from './pages/Users'
import LedgerMaster from './pages/LedgerMaster'
import ItemMaster from './pages/ItemMaster'
import OutstandingReport from './pages/OutstandingReport'
import LedgerHub from './pages/LedgerHub'
import MasterHub from './pages/MasterHub'
import SalesVoucher from './pages/SalesVoucher'

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-abs-red border-t-transparent animate-spin" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
)

const Layout = ({ children }) => (
  <div className="min-h-screen bg-gray-100">
    <Navbar />
    <main className="pt-12 sm:pt-0 pb-20 sm:pb-0">{children}</main>
  </div>
)

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

// Guards a route by module permission (view)
const PermissionRoute = ({ module, children }) => {
  const { user, loading, hasPermission } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!hasPermission(module, 'view')) return <Navigate to="/home" replace />
  return <Layout>{children}</Layout>
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/home" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      <Route path="/home"    element={<ProtectedLayout><Home /></ProtectedLayout>} />
      <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />

      <Route path="/users"              element={<PermissionRoute module="users"><Users /></PermissionRoute>} />
      <Route path="/orders"             element={<PermissionRoute module="orders"><Order /></PermissionRoute>} />
      <Route path="/ledger"             element={<PermissionRoute module="ledger"><LedgerHub /></PermissionRoute>} />
      <Route path="/master"             element={<PermissionRoute module="master"><MasterHub /></PermissionRoute>} />
      <Route path="/master/ledger"      element={<PermissionRoute module="master"><LedgerMaster /></PermissionRoute>} />
      <Route path="/master/items"       element={<PermissionRoute module="master"><ItemMaster /></PermissionRoute>} />
      <Route path="/report/outstanding" element={<PermissionRoute module="reports"><OutstandingReport /></PermissionRoute>} />
      <Route path="/ledger/voucher"     element={<PermissionRoute module="ledger"><LedgerVoucher /></PermissionRoute>} />
      <Route path="/ledger/outstanding" element={<PermissionRoute module="ledger"><LedgerOutstanding /></PermissionRoute>} />
      <Route path="/sales/vouchers"    element={<PermissionRoute module="sales"><SalesVoucher /></PermissionRoute>} />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
