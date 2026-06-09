import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const DatePicker = ({ selectedDate, onSelect, onClose }) => {
  const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('default', { month: 'long' })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const selDay = selectedDate ? new Date(selectedDate).getDate() : null
  const isSelMonth =
    selectedDate &&
    new Date(selectedDate).getMonth() === month &&
    new Date(selectedDate).getFullYear() === year

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-72 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="font-bold text-base text-gray-900">
            {monthName} {year}
          </span>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50"
          >
            <ChevronRight size={16} className="text-blue-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => (
            <button
              key={i}
              disabled={!day}
              onClick={() => day && onSelect(new Date(year, month, day))}
              className={[
                'w-9 h-9 mx-auto flex items-center justify-center rounded-full text-sm transition-all',
                !day ? 'invisible' : '',
                day && isSelMonth && day === selDay
                  ? 'bg-gray-700 text-white font-semibold'
                  : day
                  ? 'hover:bg-gray-100 text-gray-700'
                  : '',
              ].join(' ')}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full mt-5 text-center text-gray-400 font-semibold text-sm py-2 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default DatePicker
