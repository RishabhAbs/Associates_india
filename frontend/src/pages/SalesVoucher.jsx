import { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, FileSearch, ShoppingCart, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 50

const fmtDate = (v) => {
  if (!v || v.length !== 8) return v || '—'
  return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`
}

const fmtAmt = (v) => {
  if (!v && v !== 0) return '—'
  const n = Math.abs(Number(v))
  if (isNaN(n)) return v
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const SortBtn = ({ field, sort, onSort }) => {
  const active = sort.field === field
  return (
    <button onClick={() => onSort(field)} className="inline-flex items-center gap-0.5 ml-1">
      <span className={`text-xs leading-none ${active && sort.dir === 'asc'  ? 'text-abs-red' : 'text-gray-300'}`}>↑</span>
      <span className={`text-xs leading-none ${active && sort.dir === 'desc' ? 'text-abs-red' : 'text-gray-300'}`}>↓</span>
    </button>
  )
}

export default function SalesVoucher() {
  const { API } = useAuth()
  const [rows, setRows]           = useState([])
  const [lastSynced, setLastSynced] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [sort, setSort]           = useState({ field: 'billdate', dir: 'desc' })

  // Load from store (fast)
  const fetchData = () => {
    setLoading(true)
    setError(null)
    API.get('/sales/vouchers')
      .then(r => {
        setRows(r.data?.entries || [])
        setLastSynced(r.data?.lastSynced || null)
        setPage(1)
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load sales data'))
      .finally(() => setLoading(false))
  }

  // Sync: backend fetches from Tally (Connection:close, batches of 100) and saves to DB
  const syncFromTally = async () => {
    setSyncing(true)
    setError(null)
    try {
      // Backend does the Tally fetch + batch insert — may take up to 3 minutes
      const saved = await API.post('/sales/sync', {}, { timeout: 300000 })
      setRows(saved.data?.entries || [])
      setLastSynced(saved.data?.lastSynced || new Date().toISOString())
      setPage(1)
    } catch (e) {
      console.error('Sync error:', e)
      setError(e?.response?.data?.message || e?.message || 'Failed to sync from Tally')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSort = (field) => {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows
      .filter(r =>
        !q ||
        r.party?.toLowerCase().includes(q) ||
        r.billno?.toLowerCase().includes(q) ||
        r.stockitemname?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let av = a[sort.field] || '', bv = b[sort.field] || ''
        if (['amount', 'totalamt', 'discount'].includes(sort.field)) {
          av = parseFloat(av) || 0; bv = parseFloat(bv) || 0
          return sort.dir === 'asc' ? av - bv : bv - av
        }
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
  }, [rows, search, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalAmt = filtered.reduce((s, r) => s + Math.abs(Number(r.totalamt || 0)), 0)

  const fmt = (n) => {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr'
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' L'
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 })
  }

  const TH = ({ label, field, right }) => (
    <th className={`px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {label} <SortBtn field={field} sort={sort} onSort={handleSort} />
    </th>
  )

  return (
    <div className="px-4 py-3">
      {/* Sticky header */}
      <div className="sticky top-12 sm:top-14 z-10 bg-gray-100 -mx-4 px-4 pt-1 pb-2">
        {/* Search bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-3 py-2 gap-2 mb-2">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search party, bill no, item..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          {lastSynced && (
            <span className="text-[10px] text-gray-400 hidden sm:block whitespace-nowrap">
              Synced: {new Date(lastSynced).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Reload from store"
          >
            <RefreshCw size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={syncFromTally}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 h-8 bg-abs-red text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
            title="Sync latest data from Tally"
          >
            <Download size={13} className={syncing ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Tally'}</span>
          </button>
        </div>

        {/* Summary strip */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: 'Total Entries', value: filtered.length,              color: 'text-gray-800' },
              { label: 'Total Amount',  value: fmt(totalAmt),                color: 'text-abs-red'  },
              { label: 'Unique Bills',  value: new Set(filtered.map(r => r.billno)).size, color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                <p className="text-[10px] text-gray-400 font-medium leading-tight">{label}</p>
                <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-abs-red animate-spin" />
          <p className="text-sm text-gray-500">Fetching from Tally...</p>
        </div>
      ) : error && rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
          <ShoppingCart size={32} className="text-red-200" />
          <p className="text-sm font-bold text-gray-600">Could Not Load Sales Data</p>
          <p className="text-xs text-gray-400">{error}</p>
          <button onClick={fetchData} className="mt-1 text-xs text-abs-red hover:underline">Retry</button>
        </div>
      ) : (
        <>
          {paginated.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
              <FileSearch size={32} className="text-gray-200" />
              <p className="text-sm font-bold text-gray-600">No Records Found</p>
              <p className="text-xs text-gray-400">{search ? 'Try a different search.' : 'No sales data available.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-left w-10">#</th>
                      <TH label="Bill No"    field="billno" />
                      <TH label="Date"       field="billdate" />
                      <TH label="Party"      field="party" />
                      <TH label="Item"       field="stockitemname" />
                      <TH label="Rate"       field="rate" />
                      <TH label="Qty"        field="billedqty" right />
                      <TH label="Disc %"     field="discount" right />
                      <TH label="Amount"     field="amount" right />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => (
                      <tr key={r.id ?? `${r.billno}-${r.stockitemname}-${i}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-3 text-xs font-medium text-blue-600 whitespace-nowrap">{r.billno || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.billdate)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{r.party || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{r.stockitemname || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{r.rate || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 text-right whitespace-nowrap">{r.billedqty || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 text-right">{r.discount ? `${r.discount}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-600 whitespace-nowrap">{fmtAmt(r.totalamt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {paginated.map((r, i) => (
                  <div key={r.id ?? `${r.billno}-${r.stockitemname}-${i}`} className="border-b border-gray-100 px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900 flex-1 leading-tight">{r.party || '—'}</p>
                      <p className="text-sm font-bold text-green-600 flex-shrink-0">{fmtAmt(r.totalamt)}</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-1 leading-tight">{r.stockitemname || '—'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-500 font-medium">{r.billno || '—'}</span>
                      <span className="text-xs text-gray-400">{fmtDate(r.billdate)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400">Qty: {r.billedqty || '—'} · Rate: {r.rate || '—'}</span>
                      {r.discount && r.discount !== '0'
                        ? <span className="text-xs text-orange-500">{r.discount}% off</span>
                        : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mt-2 px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing <span className="font-medium text-gray-600">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-gray-600">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc }, [])
                  .map((p, idx) => p === '…'
                    ? <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    : <button key={`page-${p}`} onClick={() => setPage(p)} className={`w-7 h-7 text-xs rounded-lg border transition-colors ${page === p ? 'bg-abs-red text-white border-abs-red font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{p}</button>
                  )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
