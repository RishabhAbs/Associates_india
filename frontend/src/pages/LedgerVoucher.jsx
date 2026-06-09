import { useState, useEffect } from 'react'
import { Search, Calendar, Download, ChevronDown, Users, FileSearch, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DatePicker from '../components/DatePicker'

const fmtIso = (d) => d ? d.toISOString().split('T')[0] : ''

const fmtDisplayDate = (d) => {
  if (!d) return ''
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`
}

const defaultFrom = () => {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 3, 1) // April 1
}

const fmtAmt = (v) =>
  v != null && v !== '' && v !== 0
    ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : ''

const LedgerVoucher = () => {
  const { API } = useAuth()
  const [ledgers, setLedgers] = useState([])
  const [selectedLedger, setSelectedLedger] = useState('')
  const [data, setData] = useState({ transactions: [], summary: null })
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
    setData({ transactions: [], summary: null })
    API.get('/ledger/vouchers', {
      params: { ledger: selectedLedger, from: fmtIso(fromDate), to: fmtIso(toDate) },
    })
      .then((res) => {
        const raw = res.data || {}
        setData({
          transactions: raw.transactions || raw || [],
          summary: raw.summary || null,
        })
      })
      .catch(() => setData({ transactions: [], summary: null }))
      .finally(() => setLoading(false))
  }, [selectedLedger, fromDate, toDate])

  const filtered = (data.transactions || []).filter((v) =>
    v.particulars?.toLowerCase().includes(search.toLowerCase()) ||
    v.vchType?.toLowerCase().includes(search.toLowerCase()) ||
    v.vchNo?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDateSelect = (d) => {
    if (calendarMode === 'from') {
      setFromDate(d)
      setCalendarMode('to')
    } else if (calendarMode === 'to') {
      setToDate(d)
      setCalendarMode(null)
    }
  }

  const handleDownload = () => {
    const rows = [
      ['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit', 'Credit'],
      ...filtered.map((v) => [v.date, v.particulars, v.vchType, v.vchNo || '—', v.debit || '', v.credit || '']),
    ]
    if (data.summary) {
      rows.push([
        '',
        'Opening Balance :',
        '',
        '',
        data.summary.openingBalanceDebit ? data.summary.openingBalanceDebit : '',
        data.summary.openingBalanceCredit ? data.summary.openingBalanceCredit : ''
      ])
      rows.push([
        '',
        'Current Total :',
        '',
        '',
        data.summary.currentTotalDebit || '',
        data.summary.currentTotalCredit || ''
      ])
      rows.push([
        '',
        'Closing Balance :',
        '',
        '',
        data.summary.closingBalanceType === 'Dr' ? data.summary.closingBalance : '',
        data.summary.closingBalanceType === 'Cr' ? data.summary.closingBalance : ''
      ])
    }
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vouchers_${selectedLedger}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const summary = data.summary

  return (
    <div className="px-4 py-2">

      {/* Info bar */}
      {selectedLedger && (
        <div className="flex items-center justify-between px-1 py-1.5 mb-1">
          <p className="text-xs text-gray-500">
            Ledger: <span className="font-semibold text-gray-800">{selectedLedger}</span>
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <button onClick={() => setCalendarMode('from')} className="hover:text-abs-red transition-colors font-medium">
              {fmtIso(fromDate)}
            </button>
            <span>to</span>
            <button onClick={() => setCalendarMode('to')} className="hover:text-abs-red transition-colors font-medium">
              {fmtIso(toDate)}
            </button>
          </div>
        </div>
      )}

      {/* Sticky top controls */}
      <div className="sticky top-12 z-[25] bg-gray-100 -mx-4 px-4 pt-1 pb-2">
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
              {/* Search inside dropdown */}
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-3 py-2 gap-2">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input type="text" placeholder="Search particulars, type..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
      </div>
      {/* Date range bar — mobile only */}
      {selectedLedger && (
        <button onClick={() => setCalendarMode('from')}
          className="sm:hidden flex items-center gap-1.5 mt-1.5 px-1">
          <Calendar size={13} className="text-abs-red flex-shrink-0" />
          <span className="text-xs text-abs-red font-medium">{fmtIso(fromDate)} to {fmtIso(toDate)}</span>
        </button>
      )}
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
            <p className="text-sm text-gray-400">Please choose a ledger to view its transaction history.</p>
          </div>
          <button onClick={() => setLedgerOpen(true)} className="px-8 py-2.5 bg-gray-100 text-gray-700 font-medium text-sm rounded-xl">
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
                <p className="text-sm font-bold text-gray-700">No Vouchers Found</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {filtered.map((v, i) => (
                  <div key={i} className="px-4 py-3 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm font-bold text-gray-800 flex-1 leading-tight">{v.particulars || '—'}</p>
                      <p className="text-sm font-semibold flex-shrink-0 text-gray-800">
                        {v.debit  ? `${fmtAmt(v.debit)} Dr.`  : ''}
                        {v.credit ? `${fmtAmt(v.credit)} Cr.` : ''}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">{v.date} | {v.vchType} {v.vchNo ? `#${v.vchNo}` : '#'}</p>
                  </div>
                ))}
                {/* GRAND TOTAL */}
                {summary && (() => {
                  const openingBal = summary.openingBalanceCredit
                    ? -Math.abs(summary.openingBalanceCredit)
                    : Math.abs(summary.openingBalanceDebit || 0)
                  const grandTotal = (summary.currentTotalCredit || 0) + (summary.currentTotalDebit || 0)
                  const closingBal = openingBal + (summary.currentTotalDebit || 0) - (summary.currentTotalCredit || 0)
                  const fmtSigned = (n) => {
                    if (n === 0) return '0.00'
                    const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    return `${abs} ${n < 0 ? 'Cr' : 'Dr'}`
                  }
                  const fmtGrand = (n) => {
                    if (!n) return '0.00'
                    return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                  return (
                    <div>
                      <div className="bg-abs-red px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-white tracking-wide">GRAND TOTAL</span>
                        <ChevronDown size={16} className="text-white" />
                      </div>
                      <div className="divide-y divide-gray-50">
                        {[
                          ['Opening Bal', fmtSigned(openingBal)],
                          ['Grand Total', fmtGrand(grandTotal)],
                          ['Closing Bal', fmtSigned(closingBal)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-sm text-gray-600">{label}</span>
                            <span className="text-sm font-medium text-gray-800">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileSearch size={36} className="text-gray-300" />
                <p className="text-sm font-bold text-gray-700">No Vouchers Found</p>
              </div>
            ) : (
              <div>
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-24">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Particulars</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-16">Vch Type</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-14">Vch No.</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-32">Debit</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-32">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{v.date}</td>
                      <td className="px-4 py-2.5 text-gray-800">{v.particulars}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{v.vchType}</td>
                      <td className="px-4 py-2.5 text-center text-gray-300 text-xs">{v.vchNo || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">{fmtAmt(v.debit)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-abs-red">{fmtAmt(v.credit)}</td>
                    </tr>
                  ))}
                  {summary && (() => {
                    // Opening balance from Tally (signed: Cr = negative, Dr = positive)
                    const openingBal = summary.openingBalanceCredit
                      ? -Math.abs(summary.openingBalanceCredit)
                      : Math.abs(summary.openingBalanceDebit || 0)
                    // Grand Total = net of transactions (Credits reduce liability, Debits increase it)
                    const grandTotal = (summary.currentTotalCredit || 0) + (summary.currentTotalDebit || 0)
                    // Closing Balance = Opening Balance - Grand Total (credits reduce the balance)
                    const closingBal = openingBal + (summary.currentTotalDebit || 0) - (summary.currentTotalCredit || 0)
                    const fmtSigned = (n) => {
                      if (n === 0) return '0.00'
                      const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      return `${abs} ${n < 0 ? 'Cr' : 'Dr'}`
                    }
                    const fmtGrand = (n) => {
                      if (!n) return '0.00'
                      return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    }
                    const openingColor = openingBal < 0 ? 'text-abs-red' : 'text-green-600'
                    const closingColor = closingBal < 0 ? 'text-abs-red' : 'text-green-600'
                    return (
                      <>
                        <tr className="bg-gray-50 border-t border-gray-200">
                          <td colSpan={5} className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">Opening Balance :</td>
                          <td className={`px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap ${openingColor}`}>{fmtSigned(openingBal)}</td>
                        </tr>
                        <tr className="bg-gray-50 border-t border-gray-100">
                          <td colSpan={5} className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">Grand Total :</td>
                          <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900 whitespace-nowrap">{fmtGrand(grandTotal)}</td>
                        </tr>
                        <tr className="bg-gray-50 border-t border-gray-100">
                          <td colSpan={5} className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">Closing Balance :</td>
                          <td className={`px-4 py-2.5 text-right text-xs font-bold whitespace-nowrap ${closingColor}`}>{fmtSigned(closingBal)}</td>
                        </tr>
                      </>
                    )
                  })()}
                </tbody>
              </table>
              </div>
            )}
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

export default LedgerVoucher
