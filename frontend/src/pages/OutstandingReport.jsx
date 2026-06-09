import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, SlidersHorizontal, RefreshCw, FileSearch } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 50

const fmtAmt = (v) => {
  if (!v && v !== 0) return '—'
  const n = Math.abs(Number(v))
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const amtColor = (v) => {
  const n = Math.abs(Number(v || 0))
  if (n >= 10000) return 'text-orange-500 font-semibold'
  return 'text-green-600 font-semibold'
}

const SortBtn = ({ field, sort, onSort }) => {
  const active = sort.field === field
  return (
    <button onClick={() => onSort(field)} className="inline-flex items-center gap-0.5 ml-1">
      <span className={`text-xs leading-none ${active && sort.dir === 'asc' ? 'text-abs-red' : 'text-gray-300'}`}>↑</span>
      <span className={`text-xs leading-none ${active && sort.dir === 'desc' ? 'text-abs-red' : 'text-gray-300'}`}>↓</span>
    </button>
  )
}

export default function OutstandingReport() {
  const { API } = useAuth()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [sort, setSort]       = useState({ field: 'billdate', dir: 'asc' })
  const [showFilter, setShowFilter] = useState(false)
  const [overdueMins, setOverdueMins] = useState('')   // min overdue days filter

  const fetchReport = () => {
    setLoading(true)
    API.get('/report/outstanding')
      .then(r => { setRows(r.data || []); setPage(1) })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReport() }, [])

  const handleSort = (field) => {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows
      .filter(r => {
        const matchSearch = !q ||
          r.party?.toLowerCase().includes(q) ||
          r.billRef?.toLowerCase().includes(q) ||
          r.billDate?.toLowerCase().includes(q)
        const matchOverdue = !overdueMins || (parseInt(r.overdue) || 0) >= parseInt(overdueMins)
        return matchSearch && matchOverdue
      })
      .sort((a, b) => {
        let av = a[sort.field] || '', bv = b[sort.field] || ''
        if (sort.field === 'amount' || sort.field === 'overdue') {
          av = parseFloat(av) || 0; bv = parseFloat(bv) || 0
          return sort.dir === 'asc' ? av - bv : bv - av
        }
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
  }, [rows, search, sort, overdueMins])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalAmt   = filtered.reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0)

  const TH = ({ label, field, right }) => (
    <th className={`px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {label} <SortBtn field={field} sort={sort} onSort={handleSort} />
    </th>
  )

  return (
    <div className="px-4 py-3">
      {/* Sticky search + summary */}
      <div className="sticky top-12 z-10 bg-gray-100 -mx-4 px-4 pt-1 pb-2">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-3 py-2 gap-2 mb-2">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search customers, bills..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
        />

        <button
          onClick={fetchReport}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-colors ${
              showFilter || overdueMins ? 'border-abs-red bg-red-50 text-abs-red' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={14} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-xl shadow-lg z-30 w-56 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Min. Overdue Days</p>
              <input
                type="number"
                placeholder="e.g. 30"
                value={overdueMins}
                onChange={e => { setOverdueMins(e.target.value); setPage(1) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-abs-red"
              />
              {overdueMins && (
                <button onClick={() => setOverdueMins('')} className="mt-2 text-xs text-abs-red hover:underline">
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary strip */}
      {!loading && rows.length > 0 && (() => {
        const fmt = (n) => {
          if (n >= 10000000) return '₹' + (n/10000000).toFixed(2) + ' Cr'
          if (n >= 100000)   return '₹' + (n/100000).toFixed(2) + ' L'
          return '₹' + n.toLocaleString('en-IN')
        }
        return (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Total Bills',   value: filtered.length,                                              color: 'text-gray-800' },
              { label: 'Total Amount',  value: fmt(totalAmt),                                                color: 'text-abs-red'  },
              { label: 'Overdue',       value: filtered.filter(r => parseInt(r.overdue) > 0).length,         color: 'text-orange-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                <p className="text-[10px] text-gray-400 font-medium leading-tight">{label}</p>
                <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )
      })()}
      </div>{/* end sticky */}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-abs-red animate-spin" />
          <p className="text-sm text-gray-500">Fetching from Tally...</p>
        </div>
      ) : (
        <div>
          {paginated.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
              <FileSearch size={32} className="text-gray-200" />
              <p className="text-sm font-bold text-gray-600">No Records Found</p>
              <p className="text-xs text-gray-400">{search ? 'Try a different search.' : 'No outstanding data available.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-left w-10">#</th>
                      <TH label="Party Name" field="party" />
                      <TH label="Bill Ref"   field="billRef" />
                      <TH label="Bill Date"  field="billDate" />
                      <TH label="Due Date"   field="dueDate" />
                      <TH label="Overdue"    field="overdue" right />
                      <TH label="Amount"     field="amount" right />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{(page-1)*PAGE_SIZE+i+1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{r.party||'—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.billRef||'—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.billDate||'—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.dueDate||'—'}</td>
                        <td className="px-4 py-3 text-right text-xs">
                          {r.overdue>0?<span className="text-orange-500 font-medium">{r.overdue}d</span>:<span className="text-gray-300">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm ${amtColor(r.amount)}`}>{fmtAmt(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile: cards — matches reference image */}
              <div className="sm:hidden bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {paginated.map((r, i) => (
                  <div key={i} className="border-b border-gray-100 px-4 py-3">
                    {/* Row 1: Party Name (bold) + Amount (green) */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-bold text-gray-900 flex-1 leading-tight">{r.party||'—'}</p>
                      <p className="text-sm font-bold text-green-600 flex-shrink-0">{fmtAmt(r.amount)}</p>
                    </div>
                    {/* Row 2: 📍 Beat (left) + 📅 Bill Date (right) */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-400">📍 {r.salesman||'—'}</span>
                      <span className="text-xs text-gray-400">📅 {r.billDate||'—'}</span>
                    </div>
                    {/* Row 3: 🧾 Bill Ref (left) + Xd overdue (right) */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">🧾 {r.billRef||'—'}</span>
                      {r.overdue > 0
                        ? <span className="text-xs text-gray-400">{r.overdue}d overdue</span>
                        : <span className="text-xs text-green-500">On time</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing <span className="font-medium text-gray-600">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)}</span> of <span className="font-medium text-gray-600">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page===1} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">«</button>
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">‹</button>
                {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                  .reduce((acc,p,idx,arr)=>{if(idx>0&&p-arr[idx-1]>1)acc.push('…');acc.push(p);return acc;},[])
                  .map((p,idx)=>p==='…'
                    ?<span key={idx} className="px-1 text-xs text-gray-400">…</span>
                    :<button key={p} onClick={()=>setPage(p)} className={`w-7 h-7 text-xs rounded-lg border transition-colors ${page===p?'bg-abs-red text-white border-abs-red font-semibold':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{p}</button>
                  )}
                <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page===totalPages} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showFilter && <div className="fixed inset-0 z-20" onClick={() => setShowFilter(false)} />}
    </div>
  )
}
