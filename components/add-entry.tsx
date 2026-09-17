"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, PlusCircle, Search, Users, Filter, ChevronDown, CalendarIcon, X, Image as ImageIcon, ExternalLink, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"
import type { DateRange } from "react-day-picker"

// --- Interfaces ---
interface Transaction {
  date: string
  incoming: number
  outgoing: number
  mode: string
  groupHead: string
  vendorName: string
  remarks: string
  photoLink?: string
}

interface TransactionRow {
  id: string
  date: string
  formattedDate: string
  personName: string
  incoming: number
  outgoing: number
  mode: string
  groupHead: string
  vendorName: string
  remarks: string
  photoLink?: string
}

interface AppUser {
  id: string
  name: string
  role: "user" | "admin"
}

interface DropdownOptions {
  personName: string[]
  mode: string[]
  groupHead: string[]
  vendorNames: string[]
}

interface FormViewProps {
  onAddTransaction?: (transaction: Omit<Transaction, "id" | "personName" | "userId">) => void
  currentUser: AppUser
}

import { fetchDropdownOptionsFromSupabase, addGroupHeadToSupabase, addVendorToSupabase } from "@/lib/api/master"
import {
  fetchTransactionsFromSupabase,
  insertTransactionToSupabase,
  updateTransactionInSupabase,
  deleteTransactionFromSupabase,
} from "@/lib/api/transactions"

const isPdfFile = (url: string | null): boolean => {
  if (!url) return false
  const cleanUrl = url.split('?')[0].toLowerCase()
  return cleanUrl.endsWith('.pdf')
}

const FormView: React.FC<FormViewProps> = ({ onAddTransaction, currentUser }) => {
  const { toast } = useToast()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<TransactionRow | null>(null)

  const [formData, setFormData] = useState({
    personName: currentUser.name,
    date: new Date().toISOString().split("T")[0],
    incoming: "",
    outgoing: "",
    mode: "",
    groupHead: "",
    vendorName: "",
    remarks: "",
  })

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({
    personName: [],
    mode: [],
    groupHead: [],
    vendorNames: [],
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group Head Quick Add Modal State
  const [isGroupHeadModalOpen, setIsGroupHeadModalOpen] = useState(false)
  const [newGroupHead, setNewGroupHead] = useState("")
  const [isAddingGroupHead, setIsAddingGroupHead] = useState(false)

  // Vendor Quick Add Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false)
  const [newVendorName, setNewVendorName] = useState("")
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  
  // Image preview modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [hasPreviewError, setHasPreviewError] = useState(false)

  // Delete transaction modal state
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [allTransactions, setAllTransactions] = useState<TransactionRow[]>([])
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false)
  const [tableSearch, setTableSearch] = useState("")
  const [personFilter, setPersonFilter] = useState<string>("all")
  const [groupHeadFilter, setGroupHeadFilter] = useState<string>("all")
  const [vendorFilter, setVendorFilter] = useState<string>("all")
  const [modeFilter, setModeFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [tempDateRange, setTempDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  })

  const fetchDropdownOptions = async () => {
    setIsLoading(true); setError(null)
    try {
      const options = await fetchDropdownOptionsFromSupabase()
      setDropdownOptions({
        personName: options.personName,
        mode: options.mode,
        groupHead: options.groupHead,
        vendorNames: options.vendorNames || [],
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTransactions = async () => {
    setIsTransactionsLoading(true)
    try {
      const txs = await fetchTransactionsFromSupabase()
      const rows: TransactionRow[] = txs.map(t => ({
        id: t.id,
        date: t.date,
        formattedDate: t.formattedDate,
        personName: t.personName,
        incoming: t.incoming,
        outgoing: t.outgoing,
        mode: t.mode,
        groupHead: t.groupHead,
        vendorName: t.vendorName || "",
        remarks: t.remarks || "",
        photoLink: t.photoLink,
      }))
      setAllTransactions(rows)
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsTransactionsLoading(false)
    }
  }

  useEffect(() => { fetchDropdownOptions(); fetchTransactions() }, [])

  const isFilterActive = useMemo(() => {
    return (
      personFilter !== "all" ||
      groupHeadFilter !== "all" ||
      vendorFilter !== "all" ||
      modeFilter !== "all" ||
      dateRange !== undefined ||
      tableSearch.trim() !== ""
    )
  }, [personFilter, groupHeadFilter, vendorFilter, modeFilter, dateRange, tableSearch])

  // Extract unique options currently present in the transactions table
  const tableFilterOptions = useMemo(() => {
    const persons = new Set<string>()
    const groupHeads = new Set<string>()
    const vendors = new Set<string>()
    const modes = new Set<string>()

    allTransactions.forEach(t => {
      const p = t.personName?.trim()
      if (p && p !== "-") persons.add(p)

      const g = t.groupHead?.trim()
      if (g && g !== "-") groupHeads.add(g)

      const v = t.vendorName?.trim()
      if (v && v !== "-") vendors.add(v)

      const m = t.mode?.trim()
      if (m && m !== "-") modes.add(m)
    })

    return {
      persons: Array.from(persons).sort((a, b) => a.localeCompare(b)),
      groupHeads: Array.from(groupHeads).sort((a, b) => a.localeCompare(b)),
      vendors: Array.from(vendors).sort((a, b) => a.localeCompare(b)),
      modes: Array.from(modes).sort((a, b) => a.localeCompare(b)),
    }
  }, [allTransactions])

  const handleClearAllFilters = () => {
    setPersonFilter("all")
    setGroupHeadFilter("all")
    setVendorFilter("all")
    setModeFilter("all")
    setDateRange(undefined)
    setTempDateRange({ from: "", to: "" })
    setTableSearch("")
  }

  const visibleTransactions = useMemo(() => {
    let baseRows = allTransactions
    if (personFilter !== "all") baseRows = baseRows.filter(t => t.personName === personFilter)
    if (groupHeadFilter !== "all") baseRows = baseRows.filter(t => t.groupHead === groupHeadFilter)
    if (vendorFilter !== "all") baseRows = baseRows.filter(t => t.vendorName === vendorFilter)
    if (modeFilter !== "all") baseRows = baseRows.filter(t => t.mode === modeFilter)
    if (dateRange?.from || dateRange?.to) {
      const start = dateRange.from ? startOfDay(dateRange.from) : null
      const end = dateRange.to ? endOfDay(dateRange.to) : null
      baseRows = baseRows.filter(t => {
        if (!t.date) return false
        const tDate = parseISO(t.date)
        if (start && end) return isWithinInterval(tDate, { start, end })
        if (start) return tDate >= start
        if (end) return tDate <= end
        return true
      })
    }
    const query = tableSearch.trim().toLowerCase()
    if (!query) return baseRows
    return baseRows.filter(t => [t.personName, t.groupHead, t.vendorName, t.remarks, t.mode].some(v => v?.toLowerCase().includes(query)))
  }, [allTransactions, tableSearch, personFilter, groupHeadFilter, vendorFilter, modeFilter, dateRange])

  // Open modal in Create mode
  const handleOpenAddModal = () => {
    setEditTransaction(null)
    setFormData({
      personName: currentUser.name,
      date: new Date().toISOString().split("T")[0],
      incoming: "",
      outgoing: "",
      mode: "",
      groupHead: "",
      vendorName: "",
      remarks: "",
    })
    setPhotoFile(null)
    setFileInputKey(Date.now())
    setIsFormOpen(true)
  }

  // Open modal in Edit mode
  const handleOpenEditModal = (t: TransactionRow) => {
    setEditTransaction(t)
    setFormData({
      personName: t.personName,
      date: t.date,
      incoming: t.incoming > 0 ? String(t.incoming) : "",
      outgoing: t.outgoing > 0 ? String(t.outgoing) : "",
      mode: t.mode,
      groupHead: t.groupHead,
      vendorName: t.vendorName,
      remarks: t.remarks,
    })
    setPhotoFile(null)
    setFileInputKey(Date.now())
    setIsFormOpen(true)
  }

  // Dedicated Quick-Add Handler for Group Head
  const handleAddNewGroupHead = async () => {
    const trimmed = newGroupHead.trim()
    if (!trimmed) return
    setIsAddingGroupHead(true)
    try {
      await addGroupHeadToSupabase(trimmed)
      setNewGroupHead("")
      setIsGroupHeadModalOpen(false)
      await fetchDropdownOptions()
      // Auto-select the newly added group head in the form
      setFormData(prev => ({ ...prev, groupHead: trimmed }))
      toast({ title: "Group Head Added", description: `"${trimmed}" added successfully.` })
    } catch (err: any) {
      toast({ title: "Failed to Add Group Head", description: err.message, variant: "destructive" })
      console.error(err)
    } finally {
      setIsAddingGroupHead(false)
    }
  }

  // Dedicated Quick-Add Handler for Vendor
  const handleAddNewVendor = async () => {
    const trimmed = newVendorName.trim()
    if (!trimmed) return
    setIsAddingVendor(true)
    try {
      await addVendorToSupabase(trimmed)
      setNewVendorName("")
      setIsVendorModalOpen(false)
      await fetchDropdownOptions()
      // Auto-select the newly added vendor in the form
      setFormData(prev => ({ ...prev, vendorName: trimmed }))
      toast({ title: "Vendor Added", description: `"${trimmed}" added successfully.` })
    } catch (err: any) {
      toast({ title: "Failed to Add Vendor", description: err.message, variant: "destructive" })
      console.error(err)
    } finally {
      setIsAddingVendor(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  const handleSelectChange = (name: string, value: string) => setFormData(prev => ({ ...prev, [name]: value }))
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setPhotoFile(e.target.files?.[0] || null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const actionText = editTransaction ? "Updating" : "Submitting"
    const loadingToast = toast({ title: `${actionText} Transaction...`, description: "Please wait.", duration: 900000 })
    try {
      if (editTransaction) {
        await updateTransactionInSupabase(
          editTransaction.id,
          {
            personName: formData.personName,
            date: formData.date,
            incoming: Number(formData.incoming) || 0,
            outgoing: Number(formData.outgoing) || 0,
            mode: formData.mode,
            groupHead: formData.groupHead,
            vendorName: formData.vendorName,
            remarks: formData.remarks,
          },
          photoFile,
          editTransaction.photoLink
        )
        toast({ title: "Transaction Updated!" })
      } else {
        await insertTransactionToSupabase(
          {
            personName: formData.personName,
            date: formData.date,
            incoming: Number(formData.incoming) || 0,
            outgoing: Number(formData.outgoing) || 0,
            mode: formData.mode,
            groupHead: formData.groupHead,
            vendorName: formData.vendorName,
            remarks: formData.remarks,
          },
          photoFile
        )
        toast({ title: "Transaction Added!" })
      }

      setFormData({
        personName: currentUser.name,
        date: new Date().toISOString().split("T")[0],
        incoming: "",
        outgoing: "",
        mode: "",
        groupHead: "",
        vendorName: "",
        remarks: "",
      })
      setEditTransaction(null)
      setPhotoFile(null)
      setFileInputKey(Date.now())
      setIsFormOpen(false)
      await fetchTransactions()
    } catch (err: any) {
      toast({ title: editTransaction ? "Update Failed" : "Submission Failed", description: err.message, variant: "destructive" })
      console.error(err)
    } finally {
      loadingToast.dismiss()
      setIsSubmitting(false)
    }
  }

  // Delete transaction handler
  const handleDeleteTransaction = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteTransactionFromSupabase(deleteTarget.id)
      toast({ title: "Transaction Deleted", description: "Transaction removed successfully." })
      setDeleteTarget(null)
      await fetchTransactions()
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" })
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const openPreviewModal = (url: string) => {
    setHasPreviewError(false)
    setPreviewImageUrl(url)
  }

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600" /><p className="mt-2 text-slate-500">Loading Transactions...</p></div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  const totalColumns = currentUser.role === "admin" ? 10 : 9

  return (
    <div className="p-3 sm:p-6 bg-[#f5f3ff] min-h-screen space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      <Card className="border-[#ede9fe] shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-violet-50/70 border-b border-violet-100/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-slate-800 flex items-center gap-2 text-lg sm:text-xl font-bold">
              <FileText className="h-5 w-5 text-violet-600" /> Transactions
            </CardTitle>
            <Button
              onClick={handleOpenAddModal}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-violet-500/20 w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Add / Edit Transaction Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[88vh] flex flex-col p-0 max-w-2xl sm:max-w-3xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800">
              {editTransaction ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editTransaction ? "Update transaction details" : "Record a new incoming or outgoing transaction"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Row 1: Person & Date */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Person</Label>
                <Select value={formData.personName} onValueChange={val => handleSelectChange("personName", val)} disabled={currentUser.role !== "admin"}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Person" /></SelectTrigger>
                  <SelectContent>{dropdownOptions.personName.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</Label>
                <Input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="rounded-xl h-11" />
              </div>

              {/* Row 2: Incoming Amount & Outgoing Amount */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Incoming Amount</Label>
                <Input type="number" step="0.01" name="incoming" placeholder="0.00" value={formData.incoming} onChange={handleInputChange} className="rounded-xl h-11" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outgoing Amount</Label>
                <Input type="number" step="0.01" name="outgoing" placeholder="0.00" value={formData.outgoing} onChange={handleInputChange} className="rounded-xl h-11" />
              </div>

              {/* Row 3: Mode & Group Head */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</Label>
                <Select value={formData.mode} onValueChange={val => handleSelectChange("mode", val)}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Mode" /></SelectTrigger>
                  <SelectContent>{dropdownOptions.mode.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Group Head</Label>
                <div className="flex gap-2">
                  <Select value={formData.groupHead} onValueChange={val => handleSelectChange("groupHead", val)}>
                    <SelectTrigger className="flex-1 rounded-xl h-11"><SelectValue placeholder="Select Group Head" /></SelectTrigger>
                    <SelectContent>{dropdownOptions.groupHead.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="outline" onClick={() => setIsGroupHeadModalOpen(true)} className="rounded-xl h-11 w-11 shrink-0" title="Add New Group Head">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Row 4: Vendor & Remarks */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</Label>
                <div className="flex gap-2">
                  <Select value={formData.vendorName} onValueChange={val => handleSelectChange("vendorName", val)}>
                    <SelectTrigger className="flex-1 rounded-xl h-11"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                    <SelectContent>{dropdownOptions.vendorNames.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="outline" onClick={() => setIsVendorModalOpen(true)} className="rounded-xl h-11 w-11 shrink-0" title="Add New Vendor">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</Label>
                <Input type="text" name="remarks" placeholder="Add remarks..." value={formData.remarks} onChange={handleInputChange} className="rounded-xl h-11" />
              </div>

              {/* Row 5: Attachment File (Optional) */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {editTransaction?.photoLink ? "Replace Attachment File (Optional)" : "Attachment File (Optional)"}
                </Label>
                <Input key={fileInputKey} type="file" onChange={handleFileChange} className="rounded-xl h-11" />
                {editTransaction?.photoLink && (
                  <p className="text-[11px] text-slate-400 mt-1">Current attachment file is preserved unless replaced.</p>
                )}
              </div>
            </div>
            <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button>
              <Button type="submit" className="bg-violet-600 text-white font-bold px-8 rounded-xl w-full sm:w-auto shadow-md shadow-violet-200" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : editTransaction ? "Save Changes" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Group Head Modal */}
      <Dialog open={isGroupHeadModalOpen} onOpenChange={setIsGroupHeadModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-bold">New Group Head</DialogTitle>
            <DialogDescription className="sr-only">Add new group head option</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Group Head Name</Label>
            <Input value={newGroupHead} onChange={e => setNewGroupHead(e.target.value)} placeholder="e.g. Office Expenses" className="rounded-xl h-11" />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsGroupHeadModalOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleAddNewGroupHead} disabled={isAddingGroupHead || !newGroupHead.trim()} className="bg-violet-600 text-white rounded-xl w-full sm:w-auto">
              {isAddingGroupHead ? "Adding..." : "Add Group Head"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Vendor Modal */}
      <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-bold">New Vendor</DialogTitle>
            <DialogDescription className="sr-only">Add new vendor option</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Name</Label>
            <Input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="e.g. Apex Traders" className="rounded-xl h-11" />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsVendorModalOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleAddNewVendor} disabled={isAddingVendor || !newVendorName.trim()} className="bg-violet-600 text-white rounded-xl w-full sm:w-auto">
              {isAddingVendor ? "Adding..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-base sm:text-lg">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deletion of transaction entry
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 text-sm text-slate-600 space-y-3">
            <p>Are you sure you want to delete this transaction entry?</p>
            {deleteTarget && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="text-slate-700">{deleteTarget.formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Person:</span>
                  <span className="text-slate-700">{deleteTarget.personName}</span>
                </div>
                {deleteTarget.groupHead && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Group Head:</span>
                    <span className="text-slate-700">{deleteTarget.groupHead}</span>
                  </div>
                )}
                {deleteTarget.vendorName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vendor:</span>
                    <span className="text-slate-700">{deleteTarget.vendorName}</span>
                  </div>
                )}
                {deleteTarget.incoming > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Incoming:</span>
                    <span className="text-emerald-600 font-bold">₹{deleteTarget.incoming.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {deleteTarget.outgoing > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Outgoing:</span>
                    <span className="text-rose-600 font-bold">₹{deleteTarget.outgoing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="rounded-xl w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTransaction}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl w-full sm:w-auto shadow-md shadow-rose-200"
            >
              {isDeleting ? "Deleting..." : "Delete Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview Modal for Images and PDFs */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-white border border-slate-100 shadow-xl z-[100]" aria-describedby={undefined}>
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 space-y-0">
            <DialogTitle className="text-slate-800 font-bold text-sm sm:text-base flex items-center gap-2">
              {isPdfFile(previewImageUrl) ? (
                <FileText className="w-4 h-4 text-violet-600" />
              ) : (
                <ImageIcon className="w-4 h-4 text-violet-600" />
              )}
              <span className="truncate">{isPdfFile(previewImageUrl) ? "PDF Attachment Document" : "Attachment Proof"}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview transaction attachment document or image
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 flex justify-center items-center bg-slate-50/80 rounded-xl border border-slate-100 min-h-[220px] max-h-[60vh] overflow-hidden">
            {previewImageUrl && (
              isPdfFile(previewImageUrl) ? (
                <iframe
                  src={previewImageUrl}
                  className="w-full h-[55vh] rounded-lg border border-slate-200 bg-white"
                  title="PDF Document Preview"
                />
              ) : !hasPreviewError ? (
                <img
                  src={previewImageUrl}
                  alt="Attachment Proof"
                  onError={() => setHasPreviewError(true)}
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg shadow-sm border border-slate-200"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-3">
                  <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
                    <FileText className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Attachment Document</h4>
                    <p className="text-xs text-slate-500 mt-1">PDF or non-image file attached.</p>
                  </div>
                  <a
                    href={previewImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-md shadow-violet-200 transition-colors"
                  >
                    <span>Open / Download File</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between pt-2">
            {previewImageUrl ? (
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>Open File</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : <div />}
            <Button
              variant="outline"
              onClick={() => setPreviewImageUrl(null)}
              className="rounded-xl text-xs font-semibold h-9 px-4 border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Records Card */}
      <Card className="border-[#ede9fe] shadow-xl shadow-violet-500/5 rounded-2xl overflow-hidden p-3 sm:p-6 space-y-4">
        <CardHeader className="bg-violet-50/70 border border-violet-100/80 rounded-xl p-3 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-slate-800 text-sm md:text-base font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-600" />
              All Transactions ({visibleTransactions.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
              {/* Person Filter */}
              <div className="relative w-full sm:w-36 md:w-40">
                <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
                <Select value={personFilter} onValueChange={setPersonFilter}>
                  <SelectTrigger className="pl-8 rounded-xl h-10 text-xs"><SelectValue placeholder="All Persons" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Persons</SelectItem>
                    {tableFilterOptions.persons.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Group Head Filter */}
              <div className="relative w-full sm:w-36 md:w-40">
                <Select value={groupHeadFilter} onValueChange={setGroupHeadFilter}>
                  <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="All Group Heads" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Group Heads</SelectItem>
                    {tableFilterOptions.groupHeads.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor Filter */}
              <div className="relative w-full sm:w-36 md:w-40">
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {tableFilterOptions.vendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Mode Filter */}
              <div className="relative w-full sm:w-28 md:w-32">
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="All Modes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    {tableFilterOptions.modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="bg-[#7c3aed] text-white font-bold h-10 rounded-xl px-3.5 flex items-center justify-center gap-1.5 shadow-lg shadow-violet-100 w-full sm:w-auto text-xs">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="uppercase">Date</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-72 max-w-xs p-4 rounded-3xl shadow-2xl border-none bg-white z-[100]" align="center">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-[10px] uppercase tracking-widest text-slate-400">Range</h3>
                      {(tempDateRange.from || tempDateRange.to) && (
                        <Button variant="ghost" className="h-auto p-0 text-[10px] text-rose-500" onClick={() => { setTempDateRange({ from: "", to: "" }); setDateRange(undefined) }}>Clear</Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-slate-500">From</Label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                          <Input type="date" value={tempDateRange.from} onChange={e => { const v = e.target.value; setTempDateRange(p => { const u = { ...p, from: v }; setDateRange({ from: u.from ? new Date(u.from) : undefined, to: u.to ? new Date(u.to) : undefined }); return u }) }} className="pl-8 h-9 rounded-xl text-xs border-slate-100" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-slate-500">To</Label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                          <Input type="date" value={tempDateRange.to} onChange={e => { const v = e.target.value; setTempDateRange(p => { const u = { ...p, to: v }; setDateRange({ from: u.from ? new Date(u.from) : undefined, to: u.to ? new Date(u.to) : undefined }); return u }) }} className="pl-8 h-9 rounded-xl text-xs border-slate-100" />
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Search Box */}
              <div className="relative w-full sm:flex-1 sm:min-w-[150px] lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Search transactions..." className="pl-8 rounded-xl h-10 border-slate-200 text-xs" />
              </div>
              
              {/* Clear All Filters Button */}
              {isFilterActive && (
                <Button 
                  variant="ghost" 
                  onClick={handleClearAllFilters}
                  className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-rose-100 bg-rose-50/30 w-full sm:w-auto"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card-like View (Visible on phone screens < md) */}
          <div className="block md:hidden p-3 space-y-3">
            {isTransactionsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
                <p className="text-xs text-slate-400 mt-2">Loading transactions...</p>
              </div>
            ) : visibleTransactions.length > 0 ? (
              visibleTransactions.map(t => (
                <div key={t.id} className="p-3.5 bg-slate-50/70 hover:bg-violet-50/40 border border-slate-200/80 rounded-2xl space-y-2.5 shadow-sm transition-colors">
                  {/* Top Bar: Date, Person & Badges */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">{t.formattedDate}</span>
                      {currentUser.role === "admin" && (
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {t.personName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.groupHead && (
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md bg-violet-50 text-violet-600 border border-violet-100">
                          {t.groupHead}
                        </span>
                      )}
                      {t.mode && (
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                          {t.mode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Details: Vendor & Amounts */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Vendor</div>
                      <div className="text-xs font-bold text-slate-800 truncate">{t.vendorName || "-"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {t.incoming > 0 && (
                        <div className="text-emerald-600 font-bold text-sm">
                          +₹{t.incoming.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      {t.outgoing > 0 && (
                        <div className="text-rose-600 font-bold text-sm">
                          -₹{t.outgoing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      {t.incoming === 0 && t.outgoing === 0 && (
                        <div className="text-slate-400 text-xs font-medium">₹0.00</div>
                      )}
                    </div>
                  </div>

                  {/* Remarks */}
                  {t.remarks && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Remarks:</span>
                      <span className="truncate">{t.remarks}</span>
                    </div>
                  )}

                  {/* Bottom Bar: Attachment & Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                    <div>
                      {t.photoLink ? (
                        <button
                          type="button"
                          onClick={() => openPreviewModal(t.photoLink || "")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors border border-purple-200/60"
                        >
                          {isPdfFile(t.photoLink) ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          <span>View Doc</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">No attachment</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors border border-violet-100"
                        title="Edit transaction"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No transactions found.
              </div>
            )}
          </div>

          {/* Desktop Tabular View (Hidden on mobile < md) */}
          <div className="hidden md:block overflow-x-auto w-full max-h-[500px]">
            <table className="w-full text-sm min-w-[850px]">
              <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-10">
                <tr className="border-b border-violet-100">
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Date</th>
                  {currentUser.role === "admin" && <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Person</th>}
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Group Head</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Vendor</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Incoming</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Outgoing</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Remarks</th>
                  <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Image</th>
                  <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {isTransactionsLoading ? (
                  <tr>
                    <td colSpan={totalColumns} className="p-6 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-violet-600" />
                    </td>
                  </tr>
                ) : visibleTransactions.length > 0 ? (
                  visibleTransactions.map(t => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 sm:p-4 text-slate-600">{t.formattedDate}</td>
                      {currentUser.role === "admin" && <td className="p-3 sm:p-4 text-slate-700 font-medium">{t.personName}</td>}
                      <td className="p-3 sm:p-4"><span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-md bg-violet-50 text-violet-600">{t.groupHead || "-"}</span></td>
                      <td className="p-3 sm:p-4 font-medium text-slate-700">{t.vendorName || "-"}</td>
                      <td className="p-3 sm:p-4"><span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500">{t.mode || "-"}</span></td>
                      <td className="p-3 sm:p-4 text-right text-emerald-600 font-bold">{t.incoming > 0 ? `₹${t.incoming.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
                      <td className="p-3 sm:p-4 text-right text-rose-600 font-bold">{t.outgoing > 0 ? `₹${t.outgoing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
                      <td className="p-3 sm:p-4 text-slate-600 max-w-[180px] truncate" title={t.remarks}>{t.remarks || "-"}</td>
                      <td className="p-3 sm:p-4 text-center">
                        {t.photoLink ? (
                          <button
                            type="button"
                            onClick={() => openPreviewModal(t.photoLink || "")}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors border border-purple-200/60 shadow-sm"
                            title="Click to view attachment"
                          >
                            {isPdfFile(t.photoLink) ? (
                              <FileText className="w-3.5 h-3.5" />
                            ) : (
                              <ImageIcon className="w-3.5 h-3.5" />
                            )}
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Edit transaction"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={totalColumns} className="p-6 text-center text-slate-400">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FormView
