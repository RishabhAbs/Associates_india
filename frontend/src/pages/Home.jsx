import { useState, useEffect } from 'react'
import { Shield, X, Bell, Truck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const StatusCard = ({ data }) => (
  <div className="rounded-2xl p-3 sm:p-6 bg-[#1A1A2E] text-white flex flex-col gap-1.5 sm:gap-3 relative overflow-hidden">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] sm:text-xs font-semibold tracking-widest text-gray-400 uppercase">Status</span>
      </div>
      <Shield size={14} className="text-green-400 sm:w-5 sm:h-5" />
    </div>
    <div>
      <p className="text-xl sm:text-3xl font-bold">{data?.label}</p>
      <p className="text-abs-yellow text-[10px] sm:text-sm mt-0.5">{data?.description}</p>
    </div>
  </div>
)

const MetricCard = ({ icon: Icon, iconColor, borderColor, title, count, description }) => (
  <div
    className="bg-white rounded-2xl p-3 sm:p-6 shadow-sm border border-gray-100 flex flex-col gap-1 sm:gap-2 relative overflow-hidden"
    style={{ borderBottom: `3px solid ${borderColor}` }}
  >
    <div className="flex items-start justify-between">
      <span className="text-[10px] sm:text-xs font-semibold tracking-widest text-gray-400 uppercase leading-tight">{title}</span>
      <Icon size={14} style={{ color: iconColor }} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-4xl font-bold text-gray-900">{count}</p>
    <p className="text-[10px] sm:text-sm text-gray-500 leading-tight">{description}</p>
  </div>
)

const Home = () => {
  const { user, API } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Greeting */}
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {user?.name}
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your team today.</p>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <StatusCard data={stats?.status} />
          <MetricCard
            icon={X}
            iconColor="#F5C518"
            borderColor="#F5C518"
            title="Pending Tasks"
            count={stats?.pendingTasks.count ?? 0}
            description={stats?.pendingTasks.description}
          />
          <MetricCard
            icon={Bell}
            iconColor="#E8514A"
            borderColor="#E8514A"
            title="Notifications"
            count={stats?.notifications.count ?? 0}
            description={stats?.notifications.description}
          />
          <MetricCard
            icon={Truck}
            iconColor="#3B82F6"
            borderColor="#3B82F6"
            title="Deliveries"
            count={stats?.deliveries.count ?? 0}
            description={stats?.deliveries.description}
          />
        </div>
      )}
    </div>
  )
}

export default Home
