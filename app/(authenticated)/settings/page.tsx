"use client"

import React, { useState, useEffect } from 'react'
import {
  Settings,
  UserPlus,
  Edit2,
  Trash2,
  Lock,
  UserCheck,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react'
import {
  fetchAllDbUsersFromSupabase,
  addUserToSupabase,
  updateUserInSupabase,
  deleteUserFromSupabase,
  DbUser,
} from '@/lib/api/auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { SidebarTrigger } from '@/components/ui/sidebar'

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Analytics & totals summary' },
  { id: 'form', label: 'Entries (Add Entry)', desc: 'Record incoming & outgoing transactions' },
  { id: 'receiving', label: 'Receiving', desc: 'Record vendor invoice receipts' },
  { id: 'reports', label: 'Reports', desc: 'Detailed filterable statement reports' },
  { id: 'master', label: 'Master Data', desc: 'Manage dropdown categories & values' },
  { id: 'settings', label: 'Settings', desc: 'Manage users and access permissions' },
]

export default function SettingsPage() {
  const [users, setUsers] = useState<DbUser[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<DbUser | null>(null) // null = Create mode, DbUser = Edit mode
  const [saving, setSaving] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('counter')
  const [selectedPages, setSelectedPages] = useState<string[]>([
    'dashboard',
    'form',
    'receiving',
    'reports',
  ])
  const [showPassword, setShowPassword] = useState(false)

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<DbUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await fetchAllDbUsersFromSupabase()
      setUsers(data)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const openCreateModal = () => {
    setEditUser(null)
    setName('')
    setUsername('')
    setPassword('')
    setRole('counter')
    setSelectedPages(['dashboard', 'form', 'receiving', 'reports'])
    setIsModalOpen(true)
  }

  const openEditModal = (user: DbUser) => {
    setEditUser(user)
    setName(user.name)
    setUsername(user.username)
    setPassword(user.password || '')
    setRole(user.role)
    setSelectedPages(user.pages || [])
    setIsModalOpen(true)
  }

  const togglePagePermission = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    )
  }

  const toggleSelectAllPages = () => {
    if (selectedPages.length === AVAILABLE_PAGES.length) {
      setSelectedPages([])
    } else {
      setSelectedPages(AVAILABLE_PAGES.map((p) => p.id))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || (!editUser && !username.trim())) return

    setSaving(true)
    setMessage(null)

    try {
      if (editUser) {
        // Edit Mode
        await updateUserInSupabase(editUser.id, {
          name: name.trim(),
          password: password.trim(),
          role: role.trim(),
          pages: selectedPages,
        })
        setMessage({ type: 'success', text: `User "${name.trim()}" updated successfully!` })
      } else {
        // Create Mode
        await addUserToSupabase({
          name: name.trim(),
          username: username.trim(),
          password: password.trim(),
          role: role.trim(),
          pages: selectedPages,
        })
        setMessage({ type: 'success', text: `User "${name.trim()}" created successfully!` })
      }

      setIsModalOpen(false)
      await loadUsers()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save user' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    setMessage(null)

    try {
      await deleteUserFromSupabase(deleteTarget.id)
      setMessage({ type: 'success', text: `User "${deleteTarget.name}" deleted successfully!` })
      setDeleteTarget(null)
      await loadUsers()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete user' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="p-3 bg-purple-100 rounded-2xl text-purple-700">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Settings & User Access
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Create system users and assign page access permissions
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </button>
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
          <div className="flex items-center gap-3 font-medium text-sm">
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

      {/* Users Table Card */}
      <div className="bg-white border border-[#ede9fe] rounded-2xl shadow-xl shadow-purple-500/5 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="text-sm font-medium">Loading registered users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <p className="text-base font-semibold">No users found</p>
            <p className="text-sm text-slate-400">Click "Add New User" to register a user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Username</th>
                  <th className="py-4 px-6">Password</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Accessible Pages</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600 text-xs">{u.username}</td>
                    <td className="py-4 px-6 font-mono text-slate-500 text-xs">
                      {u.password ? '••••••••' : <span className="text-slate-300">None</span>}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : u.role === 'counter'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {u.pages && u.pages.length > 0 ? (
                          u.pages.map((p) => (
                            <span
                              key={p}
                              className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold capitalize border border-slate-200"
                            >
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-rose-500 font-semibold">No pages granted</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 rounded-3xl overflow-hidden bg-white flex flex-col border-none shadow-2xl" aria-describedby={undefined}>
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <DialogTitle className="text-slate-900 font-bold text-xl flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              {editUser ? `Edit Access: ${editUser.name}` : 'Create New System User'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Form to configure user credentials and page permission settings
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sonia, Naresh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Username & Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editUser}
                    placeholder="e.g. sonia, naresh"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  User Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="counter">Counter (Standard User)</option>
                  <option value="compunder">Compounder (Limited Access)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              {/* Page Access Checkboxes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Page Permissions
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAllPages}
                    className="text-xs text-purple-600 font-semibold hover:underline"
                  >
                    {selectedPages.length === AVAILABLE_PAGES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_PAGES.map((page) => {
                    const isChecked = selectedPages.includes(page.id)
                    return (
                      <div
                        key={page.id}
                        onClick={() => togglePagePermission(page.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-purple-50/70 border-purple-300 text-purple-900'
                            : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                            isChecked
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-bold text-xs block">{page.label}</span>
                          <span className="text-[11px] text-slate-400 line-clamp-1">
                            {page.desc}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl flex items-center gap-2 shadow-md shadow-purple-600/20"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editUser ? 'Save Changes' : 'Create User'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deletion of user account
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete user <strong className="text-slate-900">{deleteTarget?.name}</strong> (username: <code className="font-mono text-purple-700">{deleteTarget?.username}</code>)?
            </p>
            <p className="text-xs text-rose-500 font-medium mt-2">
              This user will immediately lose access to the system.
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
              Delete User
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
