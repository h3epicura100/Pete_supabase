"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  Database,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  CreditCard,
  FolderTree,
  HelpCircle,
  Store,
} from 'lucide-react'
import {
  fetchAllMasterItemsFromSupabase,
  addDropdownOptionToSupabase,
  deleteDropdownOptionFromSupabase,
  MasterItem,
} from '@/lib/api/master'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { SidebarTrigger } from '@/components/ui/sidebar'

const CATEGORIES = [
  { id: 'person', label: 'Persons', icon: Users, desc: 'Team members & employees' },
  { id: 'mode', label: 'Payment Modes', icon: CreditCard, desc: 'Cash, Bank, Credit, etc.' },
  { id: 'group_head', label: 'Group Heads', icon: FolderTree, desc: 'Account heads & categories' },
  { id: 'reason', label: 'Reasons', icon: HelpCircle, desc: 'Transaction purposes & remarks' },
  { id: 'vendor', label: 'Vendors', icon: Store, desc: 'Suppliers & business partners' },
]

export default function MasterPage() {
  const [items, setItems] = useState<MasterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('person')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<MasterItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Status message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchAllMasterItemsFromSupabase()
      setItems(data)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load master items' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.category === activeTab &&
        item.value.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
  }, [items, activeTab, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = {}
    CATEGORIES.forEach((c) => {
      counts[c.id] = items.filter((i) => i.category === c.id).length
    })
    return counts
  }, [items])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newValue.trim()) return

    setAdding(true)
    setMessage(null)

    try {
      await addDropdownOptionToSupabase(activeTab, newValue.trim())
      setNewValue('')
      setMessage({ type: 'success', text: `Added "${newValue.trim()}" successfully!` })
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add item' })
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    setMessage(null)

    try {
      await deleteDropdownOptionFromSupabase(deleteTarget.id)
      setMessage({ type: 'success', text: `Deleted "${deleteTarget.value}" successfully!` })
      setDeleteTarget(null)
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete item' })
    } finally {
      setDeleting(false)
    }
  }

  const currentCategoryObj = CATEGORIES.find((c) => c.id === activeTab)

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="p-3 bg-purple-100 rounded-2xl text-purple-700">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Master Data Management
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Add and manage dropdown options across the application
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-3 font-medium">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-semibold hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = activeTab === cat.id
          const count = categoryCounts[cat.id] || 0

          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id)
                setSearchQuery('')
              }}
              className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 ${
                isActive
                  ? 'bg-white border-purple-500 shadow-lg shadow-purple-500/10 ring-2 ring-purple-500/20'
                  : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`p-2 rounded-xl ${
                    isActive ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </div>
              <span
                className={`font-bold text-sm ${
                  isActive ? 'text-purple-900' : 'text-slate-700'
                }`}
              >
                {cat.label}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 line-clamp-1">{cat.desc}</span>
            </button>
          )
        })}
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-[#ede9fe] rounded-2xl shadow-xl shadow-purple-500/5 p-6 md:p-8 space-y-6">
        {/* Active Tab Header + Add Form */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>{currentCategoryObj?.label}</span>
              <span className="text-xs font-normal text-slate-400">
                ({filteredItems.length} items)
              </span>
            </h2>
            <p className="text-sm text-slate-500">{currentCategoryObj?.desc}</p>
          </div>

          {/* Inline Add Form */}
          <form onSubmit={handleAdd} className="flex items-center gap-3 w-full lg:w-auto">
            <input
              type="text"
              placeholder={`Add new ${currentCategoryObj?.label.slice(0, -1) || 'item'}...`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 lg:w-72 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
            />
            <button
              type="submit"
              disabled={adding || !newValue.trim()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 shrink-0"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </button>
          </form>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Items List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="text-sm font-medium">Loading master options...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <p className="text-base font-semibold text-slate-600">No items found</p>
            <p className="text-sm text-slate-400">
              {searchQuery
                ? `No items match "${searchQuery}"`
                : `No items added to ${currentCategoryObj?.label} yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/40 hover:border-purple-200 transition-all group"
              >
                <span className="font-semibold text-slate-800 text-sm">{item.value}</span>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{deleteTarget?.value}</strong> from{' '}
              <strong className="text-purple-700 capitalize">{deleteTarget?.category}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Existing entries using this value will maintain their recorded text, but this option will no longer appear in dropdown selection lists.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-2 shadow-md shadow-rose-600/20"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
