import { useState, useEffect, useMemo } from 'react'
import { Search, FileSearch, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 20

const ItemMaster = () => {
  const { API } = useAuth()
  const _saved = JSON.parse(localStorage.getItem('itemMaster') || 'null')
  const [items, setItems] = useState(_saved?.data || [])
  const [loading, setLoading] = useState(false)
  const [synced, setSynced] = useState(!!(_saved?.data?.length))
  const [lastSync, setLastSync] = useState(_saved?.ts || null)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [groupFilter] = useState('All')
  const [page, setPage] = useState(1)

  const syncFromTally = () => {
    setLoading(true)
    API.get('/master/items')
      .then((r) => {
        const data = r.data || []
        const ts = new Date().toLocaleString()
        setItems(data)
        setSynced(true)
        setLastSync(ts)
        localStorage.setItem('itemMaster', JSON.stringify({ data, ts }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const groups = useMemo(
    () => ['All', ...Array.from(new Set(items.map((i) => i.group).filter(Boolean))).sort()],
    [items]
  )

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  useEffect(() => { setPage(1) }, [search, groupFilter, sortField, sortDir])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items
      .filter((i) => {
        const matchSearch =
          !q ||
          i.name?.toLowerCase().includes(q) ||
          i.group?.toLowerCase().includes(q) ||
          i.unit?.toLowerCase().includes(q)
        const matchGroup = groupFilter === 'All' || i.group === groupFilter
        return matchSearch && matchGroup
      })
      .sort((a, b) => {
        const av = (a[sortField] || '').toLowerCase()
        const bv = (b[sortField] || '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [items, search, groupFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">⇅</span>
    return <span className="text-abs-red ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thClass = 'px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer select-none whitespace-nowrap'

  return (
    <div className="px-4 py-3">

      {/* Sticky search */}
      <div className="sticky top-12 z-10 bg-gray-100 -mx-4 px-4 pt-1 pb-2">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-3 py-2 gap-2 mb-0">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search name, group, unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
        />

        {/* Sync icon button */}
        <button
          onClick={syncFromTally}
          disabled={loading}
          title={loading ? 'Syncing...' : 'Sync Tally'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-all ${
            loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-abs-red text-white hover:bg-red-600'
          }`}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {lastSync && !loading && (
        <p className="text-xs text-gray-400 mt-1 px-1">Last synced: {lastSync}</p>
      )}
      </div>{/* end sticky */}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-abs-red animate-spin" />
          <p className="text-sm text-gray-500">Fetching from Tally...</p>
        </div>
      ) : !synced ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <RefreshCw size={26} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700">Not Synced Yet</p>
            <p className="text-xs text-gray-400 mt-1">Click <span className="font-semibold text-abs-red">Sync Tally</span> to fetch item master data.</p>
          </div>
          <button
            onClick={syncFromTally}
            className="flex items-center gap-2 px-6 py-2.5 bg-abs-red hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <RefreshCw size={14} /> Sync Tally
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* ── Mobile cards ── */}
          <div className="sm:hidden divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileSearch size={32} className="text-gray-200" />
                <p className="text-sm font-bold text-gray-600">No Items Found</p>
              </div>
            ) : paginated.map((item, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-sm font-bold text-gray-800 mb-2">{item.name}</p>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-gray-500">{item.group || '—'}</span>
                  <span className="text-xs text-gray-500">{item.unit || '—'}</span>
                </div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-gray-500">HSN: {item.hsn || '—'}</span>
                  <span className="text-xs text-gray-500">GST: {item.gst ? `${item.gst.trim()}%` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Op: {item.openingBalance || '—'}</span>
                  <span className="text-xs text-gray-500">Cl: {item.closingBalance || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-10">#</th>
                <th className={`${thClass} text-left`} onClick={() => handleSort('name')}>
                  Name <SortIcon field="name" />
                </th>
                <th className={`${thClass} text-left`} onClick={() => handleSort('group')}>
                  Group <SortIcon field="group" />
                </th>
                <th className={`${thClass} text-left`} onClick={() => handleSort('unit')}>
                  Unit <SortIcon field="unit" />
                </th>
                <th className={`${thClass} text-left`} onClick={() => handleSort('hsn')}>
                  HSN <SortIcon field="hsn" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort('openingBalance')}>
                  Opening Bal <SortIcon field="openingBalance" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort('closingBalance')}>
                  Closing Bal <SortIcon field="closingBalance" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort('gst')}>
                  GST % <SortIcon field="gst" />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <FileSearch size={32} className="text-gray-200" />
                      <p className="text-sm font-bold text-gray-600">No Items Found</p>
                      <p className="text-xs text-gray-400">{search ? 'Try a different search term.' : 'No item master data available.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{item.group || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{item.unit || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{item.hsn || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-600">{item.openingBalance || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-600">{item.closingBalance || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                      {item.gst ? `${item.gst.trim()}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-600">{item.rate || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 flex flex-col gap-2">
              <p className="text-xs text-gray-400 text-center">
                <span className="font-medium text-gray-600">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)}</span>
                {' / '}
                <span className="font-medium text-gray-600">{filtered.length}</span> items
              </p>
              <div className="flex items-center justify-center gap-1 flex-wrap">
                <button onClick={() => setPage(1)} disabled={page===1} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">«</button>
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">‹</button>
                {Array.from({length:totalPages},(_,i)=>i+1)
                  .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                  .reduce((acc,p,idx,arr)=>{if(idx>0&&p-arr[idx-1]>1)acc.push('...');acc.push(p);return acc;},[])
                  .map((p,idx)=>p==='...'
                    ? <span key={`e${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    : <button key={p} onClick={()=>setPage(p)} className={`w-7 h-7 text-xs rounded-lg border transition-colors ${page===p?'bg-abs-red text-white border-abs-red font-semibold':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{p}</button>
                  )}
                <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page===totalPages} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default ItemMaster
