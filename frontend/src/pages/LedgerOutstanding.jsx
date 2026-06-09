import { useState, useEffect } from 'react'
import { Search, Calendar, Download, ChevronDown, Users, FileSearch } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DatePicker from '../components/DatePicker'

// Returns color class based on Cr/Dr suffix in amount string
const amtColor = (val, bold = false) => {
  if (!val) return 'text-gray-400'
  const s = String(val)
  if (s.includes('Cr')) return bold ? 'text-abs-red font-bold' : 'text-abs-red'
  if (s.includes('Dr')) return bold ? 'text-green-600 font-bold' : 'text-green-600'
  return 'text-gray-700'
}

const fmtIso = (d) => d ? d.toISOString().split('T')[0] : ''

const defaultFrom = () => {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 3, 1) // April 1
}

const LedgerOutstanding = () => {
  const { API } = useAuth()
  const [ledgers, setLedgers] = useState([])
  const [selectedLedger, setSelectedLedger] = useState('')
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [ledgerSearch, setLedgerSearch] = useState('')

  // Date range
  const [fromDate, setFromDate] = useState(defaultFrom())
  const [toDate, setToDate] = useState(new Date())
  const [calendarMode, setCalendarMode] = useState(null) // 'from' | 'to' | null

  useEffect(() => {
    API.get('/ledger/list')
      .then((res) => setLedgers(res.data || []))
      .catch(() => setLedgers([]))
  }, [])

  useEffect(() => {
    if (!selectedLedger) return
    setLoading(true)
    setRecords([])
    setSummary(null)
    API.get('/ledger/outstanding', {
      params: { ledger: selectedLedger, from: fmtIso(fromDate), to: fmtIso(toDate) },
    })
      .then((res) => {
        const d = res.data || {}
        setRecords(d.rows || (Array.isArray(d) ? d : []))
        setSummary(d.summary || null)
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [selectedLedger, fromDate, toDate])

  // Parse "28-Mar-26" → Date
  const parseBillDate = (s) => {
    if (!s) return null
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}
    const [d, mon, yr] = s.split('-')
    if (!d || !mon || !yr) return null
    return new Date(2000 + parseInt(yr), months[mon], parseInt(d))
  }

  const filtered = records.filter((r) => {
    const matchSearch =
      r.refNo?.toLowerCase().includes(search.toLowerCase()) ||
      r.particulars?.toLowerCase().includes(search.toLowerCase())
    const billDate = parseBillDate(r.date)
    const inRange = !billDate || (
      (!fromDate || billDate >= fromDate) &&
      (!toDate   || billDate <= toDate)
    )
    return matchSearch && inRange
  })

  const handleDateSelect = (d) => {
    if (calendarMode === 'from') {
      setFromDate(d)
      setCalendarMode('to') // auto-advance to pick end date
    } else if (calendarMode === 'to') {
      setToDate(d)
      setCalendarMode(null)
    }
  }

  const handleDownload = () => {
    const rows = [
      ['Date', 'Ref. No.', 'Opening Amount', 'Pending Amount', 'Due on', 'Overdue by days'],
      ...filtered.map((r) => [r.date, r.refNo, r.openingAmount, r.pendingAmount, r.dueOn, r.overdueByDays]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outstanding_${selectedLedger || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 py-2">

      {/* Sticky top controls */}
      <div className="sticky top-12 z-[25] bg-gray-100 -mx-4 px-4 pt-1 pb-2">
      {/* Info bar */}
      {selectedLedger && (
        <div className="flex items-center justify-between px-1 py-1.5 mb-1">
          <p className="text-xs text-gray-500">
            Ledger: <span className="font-semibold text-gray-800">{selectedLedger}</span>
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <button
              onClick={() => setCalendarMode('from')}
              className="hover:text-abs-red transition-colors font-medium"
            >
              {fmtIso(fromDate)}
            </button>
            <span>to</span>
            <button
              onClick={() => setCalendarMode('to')}
              className="hover:text-abs-red transition-colors font-medium"
            >
              {fmtIso(toDate)}
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-3 py-2 gap-2 mb-1.5">
        <Users size={16} className="text-gray-400 flex-shrink-0" />

        <div className="flex-1">
          <button
            onClick={() => setLedgerOpen(!ledgerOpen)}
            className="w-full flex items-center gap-1 text-sm outline-none"
          >
            <span className={`flex-1 text-left ${selectedLedger ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
              {selectedLedger || 'Select Ledger...'}
            </span>
            <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          </button>
          {ledgerOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-30 flex flex-col max-h-72">
              <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search ledger..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full text-sm outline-none text-gray-700 placeholder-gray-400"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {ledgers.filter((l) => l.toLowerCase().includes(ledgerSearch.toLowerCase())).length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">No ledgers found</div>
                ) : (
                  ledgers
                    .filter((l) => l.toLowerCase().includes(ledgerSearch.toLowerCase()))
                    .map((l) => (
                      <button
                        key={l}
                        onClick={() => { setSelectedLedger(l); setLedgerOpen(false); setLedgerSearch('') }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          selectedLedger === l ? 'text-abs-red font-medium' : 'text-gray-700'
                        }`}
                      >
                        {l}
                      </button>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        <button
          onClick={() => setCalendarMode('from')}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
          title="Pick date range"
        >
          <Calendar size={15} className={fromDate ? 'text-abs-red' : 'text-gray-500'} />
        </button>

        <button
          onClick={handleDownload}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
          title="Download CSV"
        >
          <Download size={15} className="text-gray-500" />
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-2 flex items-center px-3 py-2 gap-2">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search particulars, type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
        />
      </div>
      </div>{/* end sticky */}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-abs-red animate-spin" />
          <p className="text-sm text-gray-500">Fetching from Tally...</p>
        </div>
      ) : !selectedLedger ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Users size={28} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-800 mb-1">Select a Ledger</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Please choose a ledger from the list to<br />view its transaction history.
            </p>
          </div>
          <button
            onClick={() => setLedgerOpen(true)}
            className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-xl transition-colors"
          >
            Choose Ledger
          </button>
        </div>
      ) : (
        <>
          {/* ── Mobile list ── */}
          <div className="sm:hidden">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-16 gap-3">
                <FileSearch size={36} className="text-gray-300" />
                <p className="text-sm font-bold text-gray-700">No Records Found</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {filtered.map((r, i) => (
                  <div key={i} className="px-4 py-3 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm font-bold text-gray-800 flex-1">{r.refNo}</p>
                      <p className={`text-sm font-semibold flex-shrink-0 ${amtColor(r.pendingAmount, true)}`}>{r.pendingAmount || '—'}</p>
                    </div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-400">{r.date} | Due: {r.dueOn || '—'}</span>
                      <span className={`text-xs font-medium ${r.overdueByDays > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {r.overdueByDays > 0 ? `${r.overdueByDays}d overdue` : 'On time'}
                      </span>
                    </div>
                    {r.openingAmount && (
                      <p className={`text-xs ${amtColor(r.openingAmount)}`}>Opening: {r.openingAmount}</p>
                    )}
                  </div>
                ))}
                {/* GRAND TOTAL */}
                {summary && (
                  <div>
                    <div className="bg-abs-red px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-white tracking-wide">GRAND TOTAL</span>
                      <ChevronDown size={16} className="text-white" />
                    </div>
                    <div className="divide-y divide-gray-50">
                      {[
                        ['Opening Balance', summary.totalOpening || '—'],
                        ['Closing Balance', summary.totalPending || '—'],
                        ['Grand Total',     summary.grandTotal   || '—'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm text-gray-600">{label}</span>
                          <span className={`text-sm font-medium ${amtColor(value)}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Ref. No.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Opening Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Pending Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Due on</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-3 text-gray-800">{r.refNo}</td>
                    <td className={`px-4 py-3 text-right text-xs ${amtColor(r.openingAmount)}`}>{r.openingAmount||'—'}</td>
                    <td className={`px-4 py-3 text-right text-xs ${amtColor(r.pendingAmount,true)}`}>{r.pendingAmount||'—'}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">{r.dueOn||'—'}</td>
                    <td className="px-4 py-3 text-right text-xs">{r.overdueByDays>0?<span className="text-red-500 font-medium">{r.overdueByDays}d</span>:<span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
                {summary && (<>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={2} className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">Opening Balance :</td>
                    <td className={`px-4 py-2.5 text-right text-xs font-semibold ${amtColor(summary.totalOpening)}`}>{summary.totalOpening||'—'}</td>
                    <td colSpan={3}/>
                  </tr>
                  <tr className="bg-gray-50 border-t border-gray-100">
                    <td colSpan={2} className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">Closing Balance :</td>
                    <td/><td className={`px-4 py-2.5 text-right text-xs font-semibold ${amtColor(summary.totalPending)}`}>{summary.totalPending||'—'}</td><td colSpan={2}/>
                  </tr>
                  <tr className="bg-gray-50 border-t border-gray-100">
                    <td colSpan={2} className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">Grand Total :</td>
                    <td/><td className={`px-4 py-2.5 text-right text-xs font-bold ${amtColor(summary.grandTotal)}`}>{summary.grandTotal||'—'}</td><td colSpan={2}/>
                  </tr>
                </>)}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {/* Date picker */}
      {calendarMode && (
        <DatePicker
          selectedDate={calendarMode === 'from' ? fromDate : toDate}
          onSelect={handleDateSelect}
          onClose={() => setCalendarMode(null)}
        />
      )}

      {/* Close dropdown on outside click */}
      {ledgerOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setLedgerOpen(false)} />
      )}
    </div>
  )
}

export default LedgerOutstanding
