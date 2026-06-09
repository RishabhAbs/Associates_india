import { useState, useEffect, useRef } from 'react'
import { Search, X, MessageSquare, Plus, ShoppingCart, Calendar, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Strip spaces + special chars for fuzzy matching
const normalize = (s = '') => s.toLowerCase().replace(/[\s\W_]+/g, '')

// ── Order Notes Modal ──────────────────────────────────────────
const NotesModal = ({ notes, onClose, onDone }) => {
  const [value, setValue] = useState(notes)
  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900">Order Notes</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="px-5 pb-4">
          <textarea value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Add any notes for this order..." rows={5}
            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none" />
        </div>
        <button onClick={() => onDone(value)}
          className="w-full bg-abs-red hover:bg-red-600 text-white font-semibold py-4 text-sm transition-colors">
          Done
        </button>
      </div>
    </div>
  )
}

// ── Add / Edit Item Modal ──────────────────────────────────────
const AddItemModal = ({ item, onClose, onConfirm }) => {
  const [qty,      setQty]      = useState(item.qty      ?? 1)
  const [rate,     setRate]     = useState(item.price    ?? parseFloat(item.rate) ?? 0)
  const [discount, setDiscount] = useState(item.discount ?? 0)
  const total = (qty * rate * (1 - discount / 100)).toFixed(2)
  const isEdit = item._editing === true

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl w-full max-w-lg pb-8">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="px-5 pt-3 pb-4 text-sm font-semibold text-abs-red">{item.name}</p>

        <div className="px-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantity</label>
            <input type="number" min="1" value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rate (₹)</label>
            <input type="number" min="0" step="0.01" value={rate}
              onChange={e => setRate(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount (%)</label>
            <input type="number" min="0" max="100" value={discount} placeholder="0"
              onChange={e => setDiscount(Math.min(100, parseFloat(e.target.value) || 0))}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none placeholder-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total</label>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm font-bold text-abs-red">
              ₹{Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="px-5 mt-5">
          <button
            onClick={() => onConfirm({ ...item, qty, price: rate, discount, lineTotal: parseFloat(total), _editing: undefined })}
            className="w-full bg-abs-red hover:bg-red-600 text-white font-semibold py-4 rounded-2xl text-sm transition-colors">
            {isEdit ? 'Update Item' : 'Confirm Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create / Edit Order Form ───────────────────────────────────
const CreateOrder = ({ order, onCancel, onCreated, API }) => {
  const [customer,         setCustomer]         = useState(order?.customer || '')
  const [customerResults,  setCustomerResults]  = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(order?.customer ? { name: order.customer } : null)
  const [date,             setDate]             = useState(order?.date || new Date().toISOString().split('T')[0])
  const [itemQuery,        setItemQuery]        = useState('')
  const [itemResults,      setItemResults]      = useState([])
  const [items,            setItems]            = useState(order?.items || [])
  const [notes,            setNotes]            = useState(order?.notes || '')
  const [showNotes,        setShowNotes]        = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [itemForModal,     setItemForModal]     = useState(null)

  const total = items.reduce((s, i) => s + (i.lineTotal ?? i.qty * i.price), 0)

  // Customer fuzzy search — strips spaces & special chars
  useEffect(() => {
    if (!customer || customer.length < 2) { setCustomerResults([]); return }
    const cached = JSON.parse(localStorage.getItem('ledgerMaster') || 'null')
    const all = cached?.data || []
    const q = normalize(customer)
    const results = all
      .filter(l => normalize(l.name).includes(q))
      .slice(0, 20)
      .map(l => ({ name: l.name, phone: l.phone || '', gstin: l.gstin || '' }))
    setCustomerResults(results)
  }, [customer])

  // Item fuzzy search — strips spaces & special chars
  useEffect(() => {
    if (!itemQuery || itemQuery.length < 2) { setItemResults([]); return }
    const cached = JSON.parse(localStorage.getItem('itemMaster') || 'null')
    const all = cached?.data || []
    const q = normalize(itemQuery)
    const results = all
      .filter(i => normalize(i.name).includes(q))
      .slice(0, 20)
      .map(i => ({ id: i.name, name: i.name, price: parseFloat(i.rate) || 0, rate: i.rate || '', unit: i.unit || '', gst: i.gst || '', hsn: i.hsn || '' }))
    setItemResults(results)
  }, [itemQuery])

  const addItem = (item) => {
    if (item._editing) {
      // Update existing item
      setItems(prev => prev.map(i => i.id === item.id ? item : i))
    } else {
      setItems((prev) => {
        const ex = prev.find((i) => i.id === item.id)
        if (ex) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + item.qty, lineTotal: (i.lineTotal || 0) + (item.lineTotal || 0) } : i)
        return [...prev, item]
      })
    }
    setItemQuery('')
    setItemResults([])
    setItemForModal(null)
  }

  const deleteItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const handleCreate = async () => {
    setSaving(true)
    try {
      if (order?.id) {
        await API.put(`/orders/${order.id}`, { customer: selectedCustomer?.name || customer, date, items, notes, total })
      } else {
        await API.post('/orders', { customer: selectedCustomer?.name || customer, date, items, notes, total })
      }
      onCreated()
    } catch { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">

        {/* Date */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-gray-800">
            {date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </p>
          <label className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <Calendar size={16} className="text-gray-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sr-only" />
          </label>
        </div>

        {/* Customer */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Customer</p>
          <div className="relative">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input type="text" placeholder="Search customer..."
                value={selectedCustomer ? selectedCustomer.name || selectedCustomer : customer}
                onChange={(e) => { setCustomer(e.target.value); setSelectedCustomer(null) }}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none" />
              {selectedCustomer && (
                <button onClick={() => { setSelectedCustomer(null); setCustomer('') }}>
                  <X size={13} className="text-gray-400" />
                </button>
              )}
            </div>
            {customerResults.length > 0 && !selectedCustomer && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                {customerResults.map((c, i) => (
                  <button key={i} onClick={() => { setSelectedCustomer(c); setCustomerResults([]) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50">
                    <p className="text-sm text-gray-800 font-medium">{c.name}</p>
                    {(c.phone || c.gstin) && (
                      <p className="text-xs text-gray-400">{[c.phone, c.gstin].filter(Boolean).join(' · ')}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Items */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Add Items</p>
          <div className="relative mb-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input type="text" placeholder="Search item..." value={itemQuery}
                onChange={(e) => setItemQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none" />
            </div>
            {itemResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                {itemResults.map((item) => (
                  <button key={item.id} onClick={() => { setItemForModal(item); setItemResults([]) }}
                    className="w-full flex items-start justify-between px-4 py-2.5 text-sm hover:bg-gray-50 text-left">
                    <div>
                      <p className="text-gray-800 font-medium">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {[item.unit, item.hsn && `HSN:${item.hsn}`, item.gst && `GST:${item.gst.trim()}%`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {item.rate && <span className="text-xs text-gray-500 ml-2 flex-shrink-0">₹{item.rate}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items list */}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {[item.unit, item.gst && `GST ${item.gst.trim()}%`, item.hsn && `HSN: ${item.hsn}`].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-gray-400">
                  ₹{item.price} each{item.discount ? ` · ${item.discount}% off` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500">Qty: {item.qty}</span>
                <span className="text-sm font-semibold text-gray-800 w-16 text-right">
                  ₹{(item.lineTotal ?? item.qty * item.price).toLocaleString()}
                </span>
                {/* Edit */}
                <button
                  onClick={() => setItemForModal({ ...item, _editing: true })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Pencil size={13} className="text-blue-500" />
                </button>
                {/* Delete */}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                  <Trash2 size={13} className="text-abs-red" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes FAB */}
      <button onClick={() => setShowNotes(true)}
        className="fixed bottom-20 right-5 w-11 h-11 rounded-full border border-abs-red bg-white flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors z-40">
        <MessageSquare size={18} className="text-abs-red" />
      </button>

      {/* Bottom bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
          <p className="text-base font-bold text-gray-900">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
        <button onClick={onCancel}
          className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
        <button onClick={handleCreate} disabled={saving}
          className="flex-1 py-2.5 bg-abs-red hover:bg-red-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60">
          {saving ? 'Saving...' : order?.id ? 'Update Order' : 'Create Order'}
        </button>
      </div>

      {showNotes && (
        <NotesModal notes={notes} onClose={() => setShowNotes(false)}
          onDone={(v) => { setNotes(v); setShowNotes(false) }} />
      )}

      {itemForModal && (
        <AddItemModal item={itemForModal} onClose={() => setItemForModal(null)}
          onConfirm={(confirmed) => addItem(confirmed)} />
      )}
    </div>
  )
}

// ── Order List ─────────────────────────────────────────────────
const Order = () => {
  const { API } = useAuth()
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [creating, setCreating] = useState(false)
  const [editing,  setEditing]  = useState(null)

  const fetchOrders = () => {
    setLoading(true)
    API.get('/orders')
      .then((r) => setOrders(r.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [])

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this order?')) return
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  // Fuzzy search on customer name
  const filtered = orders.filter((o) => {
    const q = normalize(search)
    return !q ||
      normalize(o.customer).includes(q) ||
      o.id?.toString().includes(search)
  })

  if (creating || editing) {
    return (
      <CreateOrder
        API={API}
        order={editing}
        onCancel={() => { setCreating(false); setEditing(null) }}
        onCreated={() => { setCreating(false); setEditing(null); fetchOrders() }}
      />
    )
  }

  return (
    <div className="px-4 py-3 relative min-h-[calc(100vh-56px)]">

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-3 py-2.5 gap-2 mb-3">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input type="text" placeholder="Search by customer or order ID..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
        {search && (
          <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-abs-red animate-spin" />
          <p className="text-sm text-gray-400">Loading orders...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-gray-400">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">#{o.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{o.customer}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.date}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{o.total?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.status === 'Delivered' ? 'bg-green-50 text-green-600' :
                      o.status === 'Pending'   ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {o.status || 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setEditing(o)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                        <Pencil size={13} className="text-blue-500" />
                      </button>
                      <button onClick={() => deleteOrder(o.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                        <Trash2 size={13} className="text-abs-red" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setCreating(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-abs-red hover:bg-red-600 text-white shadow-lg flex items-center justify-center transition-all z-30">
        <Plus size={24} />
      </button>
    </div>
  )
}

export default Order
