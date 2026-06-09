import { useState, useEffect, useCallback, useRef } from 'react'
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

const fmt = (n) => {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr'
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' L'
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 })
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
  const [rows, setRows]             = useState([])
  const [total, setTotal]           = useState(0)
  const [lastSynced, setLastSynced] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [syncing, setSyncing]       = useState(false)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [sort, setSort]             = useState({ field: 'billdate', dir: 'desc' })

  const searchTimer = useRef(null)

  const fetchData = useCallback((pg = 1, q = search, s = sort) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      page: pg, limit: PAGE_SIZE,
      sort: s.field, dir: s.dir,
      ...(q ? { search: q } : {}),
    })
    API.get(`/sales/vouchers?${params}`)
      .then(r => {
        setRows(r.data?.entries || [])
        setTotal(r.data?.total  || 0)
        setLastSynced(r.data?.lastSynced || null)
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load sales data'))
      .finally(() => setLoading(false))
  }, [API, search, sort])

  // Sync from Tally via backend
  const syncFromTally = async () => {
    setSyncing(true)
    setError(null)
    try {
      await API.post('/sales/sync', {}, { timeout: 300000 })
      fetchData(1, search, sort)
    } catch (e) {
      console.error('Sync error:', e)
      setError(e?.response?.data?.message || e?.message || 'Failed to sync from Tally')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { fetchData(1, '', sort) }, [])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchData(1, val, sort)
    }, 400)
  }

  const handleSort = (field) => {
    const newSort = { field, dir: sort.field === field && sort.dir === 'asc' ? 'desc' : 'asc' }
    setSort(newSort)
    setPage(1)
    fetchData(1, search, newSort)
  }

  const handlePage = (pg) => {
    setPage(pg)
    fetchData(pg, search, sort)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          {lastSynced && (
            <span className="text-[10px] text-gray-400 hidden sm:block whitespace-nowrap">
              Synced: {new Date(lastSynced).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
          <button
            onClick={() => { setPage(1); fetchData(1, search, sort) }}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Reload"
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
        {total > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              { label: 'Total Entries', value: total.toLocaleString('en-IN'), color: 'text-gray-800' },
              { label: 'Showing Page',  value: `${page} of ${totalPages}`,    color: 'text-blue-600' },
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
          <p className="text-sm text-gray-500">Loading sales data...</p>
        </div>
      ) : error && rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
          <ShoppingCart size={32} className="text-red-200" />
          <p className="text-sm font-bold text-gray-600">Could Not Load Sales Data</p>
          <p className="text-xs text-gray-400">{error}</p>
          <button onClick={() => fetchData(1, search, sort)} className="mt-1 text-xs text-abs-red hover:underline">Retry</button>
        </div>
      ) : (
        <>
          {rows.length === 0 ? (
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
                      <TH label="Bill No"  field="billno" />
                      <TH label="Date"     field="billdate" />
                      <TH label="Party"    field="party" />
                      <TH label="Item"     field="stockitemname" />
                      <TH label="Rate"     field="rate" />
                      <TH label="Qty"      field="billedqty" right />
                      <TH label="Disc %"   field="discount" right />
                      <TH label="Amount"   field="totalamt" right />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
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
                {rows.map((r, i) => (
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
          {totalPages > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mt-2 px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing <span className="font-medium text-gray-600">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-medium text-gray-600">{total.toLocaleString('en-IN')}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePage(1)} disabled={page === 1} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">«</button>
                <button onClick={() => handlePage(page - 1)} disabled={page === 1} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc }, [])
                  .map((p, idx) => p === '…'
                    ? <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    : <button key={`page-${p}`} onClick={() => handlePage(p)} className={`w-7 h-7 text-xs rounded-lg border transition-colors ${page === p ? 'bg-abs-red text-white border-abs-red font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{p}</button>
                  )}
                <button onClick={() => handlePage(page + 1)} disabled={page === totalPages} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">›</button>
                <button onClick={() => handlePage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
