"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, PlusCircle, Search, Users, Filter, ChevronDown, CalendarIcon, X, Image as ImageIcon, ExternalLink } from "lucide-react"
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
  reason: string
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
  reason: string
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
  reason: string[]
}

interface FormViewProps {
  onAddTransaction?: (transaction: Omit<Transaction, "id" | "personName" | "userId">) => void
  currentUser: AppUser
}

import { fetchDropdownOptionsFromSupabase, addGroupHeadToSupabase, addReasonToSupabase } from "@/lib/api/master"
import { fetchTransactionsFromSupabase, insertTransactionToSupabase } from "@/lib/api/transactions"

const isNonEmptyString = (value: any): value is string => typeof value === "string" && value.trim().length > 0

const isPdfFile = (url: string | null): boolean => {
  if (!url) return false
  const cleanUrl = url.split('?')[0].toLowerCase()
  return cleanUrl.endsWith('.pdf')
}

const FormView: React.FC<FormViewProps> = ({ onAddTransaction, currentUser }) => {
  const { toast } = useToast()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    personName: currentUser.name,
    date: new Date().toISOString().split("T")[0],
    incoming: "",
    outgoing: "",
    mode: "",
    groupHead: "",
    reason: "",
  })

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({
    personName: [],
    mode: [],
    groupHead: [],
    reason: [],
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGroupHeadModalOpen, setIsGroupHeadModalOpen] = useState(false)
  const [newGroupHead, setNewGroupHead] = useState("")
  const [isAddingGroupHead, setIsAddingGroupHead] = useState(false)
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false)
  const [newReason, setNewReason] = useState("")
  const [isAddingReason, setIsAddingReason] = useState(false)
  
  // Image preview modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [hasPreviewError, setHasPreviewError] = useState(false)

  const [allTransactions, setAllTransactions] = useState<TransactionRow[]>([])
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false)
  const [tableSearch, setTableSearch] = useState("")
  const [personFilter, setPersonFilter] = useState<string>("all")
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
        reason: options.reason,
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
        reason: t.reason,
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
    return personFilter !== "all" || dateRange !== undefined || tableSearch.trim() !== ""
  }, [personFilter, dateRange, tableSearch])

  const handleClearAllFilters = () => {
    setPersonFilter("all")
    setDateRange(undefined)
    setTempDateRange({ from: "", to: "" })
    setTableSearch("")
  }

  const visibleTransactions = useMemo(() => {
    let baseRows = allTransactions
    if (personFilter !== "all") baseRows = baseRows.filter(t => t.personName === personFilter)
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
    return baseRows.filter(t => [t.personName, t.groupHead, t.reason, t.mode].some(v => v.toLowerCase().includes(query)))
  }, [allTransactions, tableSearch, personFilter, dateRange])

  const handleAddNewOption = async (newValue: string, col: number, setAdd: any, setOpen: any, clear: any, type: string) => {
    if (!newValue.trim()) return
    setAdd(true)
    try {
      if (type === "groupHead") {
        await addGroupHeadToSupabase(newValue)
      } else {
        await addReasonToSupabase(newValue)
      }
      clear()
      setOpen(false)
      await fetchDropdownOptions()
    } catch (err) {
      console.error(err)
    } finally {
      setAdd(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  const handleSelectChange = (name: string, value: string) => setFormData(prev => ({ ...prev, [name]: value }))
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setPhotoFile(e.target.files?.[0] || null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true)
    const loadingToast = toast({ title: "Submitting Transaction...", description: "Please wait.", duration: 900000 })
    try {
      await insertTransactionToSupabase(
        {
          personName: formData.personName,
          date: formData.date,
          incoming: Number(formData.incoming) || 0,
          outgoing: Number(formData.outgoing) || 0,
          mode: formData.mode,
          groupHead: formData.groupHead,
          reason: formData.reason,
        },
        photoFile
      )
      toast({ title: "Transaction Added!" })
      setFormData({ personName: currentUser.name, date: new Date().toISOString().split("T")[0], incoming: "", outgoing: "", mode: "", groupHead: "", reason: "" })
      setPhotoFile(null); setFileInputKey(Date.now()); setIsFormOpen(false); await fetchTransactions()
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" })
      console.error(err)
    } finally {
      loadingToast.dismiss(); setIsSubmitting(false)
    }
  }

  const openPreviewModal = (url: string) => {
    setHasPreviewError(false)
    setPreviewImageUrl(url)
  }

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600" /><p className="mt-2">Loading...</p></div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  const totalColumns = currentUser.role === "admin" ? 8 : 7

  return (
    <div className="p-3 sm:p-6 bg-[#f5f3ff] min-h-screen space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      <Card className="border-[#ede9fe] shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-violet-50/70 border-b border-violet-100/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-slate-800 flex items-center gap-2 text-lg sm:text-xl font-bold">
              <FileText className="h-5 w-5 text-violet-600" /> Transactions
            </CardTitle>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-violet-500/20 w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[88vh] flex flex-col p-0 max-w-2xl sm:max-w-3xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800">Add Transaction</DialogTitle>
            <DialogDescription className="sr-only">Record a new incoming or outgoing transaction</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1"><Label>Person</Label><Select value={formData.personName} onValueChange={val => handleSelectChange("personName", val)} disabled={currentUser.role !== "admin"}><SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Person" /></SelectTrigger><SelectContent>{dropdownOptions.personName.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="rounded-xl h-11" /></div>
              <div className="space-y-1"><Label>Income</Label><Input type="number" name="incoming" value={formData.incoming} onChange={handleInputChange} className="rounded-xl h-11" /></div>
              <div className="space-y-1"><Label>Expense</Label><Input type="number" name="outgoing" value={formData.outgoing} onChange={handleInputChange} className="rounded-xl h-11" /></div>
              <div className="space-y-1"><Label>Mode</Label><Select value={formData.mode} onValueChange={val => handleSelectChange("mode", val)}><SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Mode" /></SelectTrigger><SelectContent>{dropdownOptions.mode.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Group Head</Label><div className="flex gap-2"><Select value={formData.groupHead} onValueChange={val => handleSelectChange("groupHead", val)}><SelectTrigger className="flex-1 rounded-xl h-11"><SelectValue placeholder="Select Group Head" /></SelectTrigger><SelectContent>{dropdownOptions.groupHead.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><Button type="button" size="icon" variant="outline" onClick={() => setIsGroupHeadModalOpen(true)} className="rounded-xl h-11 w-11 shrink-0"><PlusCircle className="h-4 w-4" /></Button></div></div>
              <div className="space-y-1 sm:col-span-2"><Label>Reason</Label><div className="flex gap-2"><Select value={formData.reason} onValueChange={val => handleSelectChange("reason", val)}><SelectTrigger className="flex-1 rounded-xl h-11"><SelectValue placeholder="Select Reason" /></SelectTrigger><SelectContent>{dropdownOptions.reason.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><Button type="button" size="icon" variant="outline" onClick={() => setIsReasonModalOpen(true)} className="rounded-xl h-11 w-11 shrink-0"><PlusCircle className="h-4 w-4" /></Button></div></div>
              <div className="space-y-1 sm:col-span-2"><Label>Attachment File (Optional)</Label><Input key={fileInputKey} type="file" onChange={handleFileChange} className="rounded-xl h-11" /></div>
            </div>
            <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button>
              <Button type="submit" className="bg-violet-600 text-white font-bold px-8 rounded-xl w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Submit"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupHeadModalOpen} onOpenChange={setIsGroupHeadModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New Group Head</DialogTitle>
            <DialogDescription className="sr-only">Add new group head option</DialogDescription>
          </DialogHeader>
          <div className="py-2"><Input value={newGroupHead} onChange={e => setNewGroupHead(e.target.value)} placeholder="Name" className="rounded-xl h-11" /></div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0"><Button variant="outline" onClick={() => setIsGroupHeadModalOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button><Button onClick={() => handleAddNewOption(newGroupHead, 0, setIsAddingGroupHead, setIsGroupHeadModalOpen, () => setNewGroupHead(""), "Group Head")} disabled={isAddingGroupHead} className="rounded-xl w-full sm:w-auto">Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReasonModalOpen} onOpenChange={setIsReasonModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New Reason</DialogTitle>
            <DialogDescription className="sr-only">Add new reason option</DialogDescription>
          </DialogHeader>
          <div className="py-2"><Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason" className="rounded-xl h-11" /></div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0"><Button variant="outline" onClick={() => setIsReasonModalOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button><Button onClick={() => handleAddNewOption(newReason, 0, setIsAddingReason, setIsReasonModalOpen, () => setNewReason(""), "Reason")} disabled={isAddingReason} className="rounded-xl w-full sm:w-auto">Add</Button></DialogFooter>
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

      <Card className="border-[#ede9fe] shadow-xl shadow-violet-500/5 rounded-2xl overflow-hidden p-3 sm:p-6 space-y-4">
        <CardHeader className="bg-violet-50/70 border border-violet-100/80 rounded-xl p-3 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-slate-800 text-sm md:text-base font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-600" />
              All Transactions ({visibleTransactions.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
              <div className="relative w-full sm:w-44">
                <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <Select value={personFilter} onValueChange={setPersonFilter}>
                  <SelectTrigger className="pl-9 rounded-xl h-10"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Persons</SelectItem>
                    {dropdownOptions.personName.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="bg-[#7c3aed] text-white font-bold h-10 rounded-xl px-4 flex items-center justify-center gap-2 shadow-lg shadow-violet-100 w-full sm:w-auto">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-xs uppercase">Date</span>
                    <ChevronDown className="h-4 w-4" />
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

              <div className="relative w-full sm:flex-1 sm:min-w-[180px] lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Search..." className="pl-9 rounded-xl h-10 border-slate-200" />
              </div>
              
              {isFilterActive && (
                <Button 
                  variant="ghost" 
                  onClick={handleClearAllFilters}
                  className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center gap-2 transition-all border border-rose-100 bg-rose-50/30 w-full sm:w-auto"
                >
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full max-h-[500px]">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-10">
                <tr className="border-b border-violet-100">
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Date</th>
                  {currentUser.role === "admin" && <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Person</th>}
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Group Head</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Reason</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Income</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Expense</th>
                  <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Image</th>
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
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="p-3 sm:p-4 text-slate-600">{t.formattedDate}</td>
                      {currentUser.role === "admin" && <td className="p-3 sm:p-4 text-slate-700 font-medium">{t.personName}</td>}
                      <td className="p-3 sm:p-4"><span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-md bg-violet-50 text-violet-600">{t.groupHead}</span></td>
                      <td className="p-3 sm:p-4 text-slate-600">{t.reason}</td>
                      <td className="p-3 sm:p-4"><span className="inline-flex px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500">{t.mode}</span></td>
                      <td className="p-3 sm:p-4 text-right text-emerald-600 font-bold">{t.incoming > 0 ? `₹${t.incoming.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
                      <td className="p-3 sm:p-4 text-right text-rose-600 font-bold">{t.outgoing > 0 ? `₹${t.outgoing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
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
