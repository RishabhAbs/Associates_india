import { useNavigate } from 'react-router-dom'
import { FileText, AlertCircle } from 'lucide-react'

const cards = [
  {
    to: '/ledger/voucher',
    icon: FileText,
    title: 'Ledger Voucher',
    desc: 'View all transactions for a ledger',
    color: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    to: '/ledger/outstanding',
    icon: AlertCircle,
    title: 'Outstanding',
    desc: 'View pending bills for a ledger',
    color: 'bg-orange-50',
    iconColor: 'text-orange-500',
  },
]

export default function LedgerHub() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Ledger</h1>
      <p className="text-sm text-gray-400 mb-5">Select a report to view</p>
      <div className="grid grid-cols-2 gap-4">
        {cards.map(({ to, icon: Icon, title, desc, color, iconColor }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-start gap-3 hover:shadow-md transition-shadow text-left"
          >
            <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
              <Icon size={22} className={iconColor} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
