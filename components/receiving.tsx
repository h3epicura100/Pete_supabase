"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, ExternalLink, FilePlus, List, Search, Users, Filter, ChevronDown, CalendarIcon, X, Image as ImageIcon, FileText, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

// --- INTERFACES ---
interface ReceivingEntry {
  date: string;
  vendorName: string;
  invoiceAmt: number;
  invoiceNumber: string;
  mode: string;
  remarks: string;
}

interface ReceivingDropdownOptions {
  vendorNames: string[];
  modes: string[];
}

interface ReceivingPageProps {
  currentUser: {
    id: string;
    name: string;
    role: "user" | "admin";
  };
}

import {
  fetchReceivingRecordsFromSupabase,
  insertReceivingEntryToSupabase,
  updateReceivingEntryInSupabase,
  deleteReceivingEntryFromSupabase,
  ReceivingRecord,
} from "@/lib/api/receiving";
import { fetchDropdownOptionsFromSupabase, addVendorToSupabase } from "@/lib/api/master";

const isPdfFile = (url: string | null): boolean => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.pdf');
};

const ReceivingPage: React.FC<ReceivingPageProps> = ({ currentUser }) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<ReceivingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ReceivingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReceivingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<ReceivingEntry>({
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    invoiceAmt: 0,
    invoiceNumber: '',
    mode: '',
    remarks: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [dropdownOptions, setDropdownOptions] = useState<ReceivingDropdownOptions>({ vendorNames: [], modes: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sub-modal states
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);

  // Image preview modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [hasPreviewError, setHasPreviewError] = useState(false);

  // Filter States
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [tableSearch, setTableSearch] = useState("");

  const fetchDropdownOptions = async () => {
    try {
      const options = await fetchDropdownOptionsFromSupabase();
      setDropdownOptions({
        vendorNames: options.vendorNames,
        modes: options.mode,
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchRecords = async () => {
    setIsRecordsLoading(true);
    try {
      const recs = await fetchReceivingRecordsFromSupabase();
      setRecords(recs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRecordsLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDropdownOptions(); fetchRecords(); }, []);

  const visibleRecords = useMemo(() => {
    let base = records;
    if (vendorFilter !== "all") base = base.filter(r => r.vendorName === vendorFilter);
    if (dateRange?.from || dateRange?.to) {
      const start = dateRange.from ? startOfDay(dateRange.from) : null;
      const end = dateRange.to ? endOfDay(dateRange.to) : null;
      base = base.filter(r => {
        if (!r.date) return false;
        const rDate = parseISO(r.date);
        if (!rDate || isNaN(rDate.getTime())) return false;
        if (start && end) return isWithinInterval(rDate, { start, end });
        if (start) return rDate >= start;
        if (end) return rDate <= end;
        return true;
      });
    }
    const query = tableSearch.trim().toLowerCase();
    if (!query) return base;
    return base.filter(r => 
      r.vendorName.toLowerCase().includes(query) ||
      r.invoiceNumber.toLowerCase().includes(query) ||
      r.mode.toLowerCase().includes(query) ||
      (r.remarks && r.remarks.toLowerCase().includes(query))
    );
  }, [records, vendorFilter, dateRange, tableSearch]);

  const isFilterActive = useMemo(() => {
    return vendorFilter !== "all" || dateRange !== undefined || tableSearch.trim() !== "";
  }, [vendorFilter, dateRange, tableSearch]);

  const tableVendors = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const v = r.vendorName?.trim();
      if (v && v !== "-") set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const handleClearAllFilters = () => {
    setVendorFilter("all");
    setDateRange(undefined);
    setTempDateRange({ from: "", to: "" });
    setTableSearch("");
  };

  const handleOpenAddModal = () => {
    setEditRecord(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      vendorName: '',
      invoiceAmt: 0,
      invoiceNumber: '',
      mode: '',
      remarks: '',
    });
    setImageFile(null);
    setFileInputKey(Date.now());
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (rec: ReceivingRecord) => {
    setEditRecord(rec);
    setFormData({
      date: rec.date || new Date().toISOString().split('T')[0],
      vendorName: rec.vendorName,
      invoiceAmt: rec.invoiceAmt,
      invoiceNumber: rec.invoiceNumber,
      mode: rec.mode,
      remarks: rec.remarks || '',
    });
    setImageFile(null);
    setFileInputKey(Date.now());
    setIsFormOpen(true);
  };

  const handleAddNewVendor = async () => {
    const trimmed = newVendorName.trim();
    if (!trimmed) return;
    setIsAddingVendor(true);
    try {
      await addVendorToSupabase(trimmed);
      setNewVendorName('');
      setIsVendorModalOpen(false);
      await fetchDropdownOptions();
      setFormData(prev => ({ ...prev, vendorName: trimmed }));
      toast({ title: "Vendor Added", description: `"${trimmed}" added successfully.` });
    } catch (err: any) {
      toast({ title: "Failed to Add Vendor", description: err.message, variant: "destructive" });
      console.error(err);
    } finally {
      setIsAddingVendor(false);
    }
  };

  const openPreviewModal = (url: string) => {
    setHasPreviewError(false);
    setPreviewImageUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const actionText = editRecord ? "Updating" : "Submitting";
    const loadingToast = toast({ title: `${actionText} Receiving Entry...`, description: "Please wait.", duration: 900000 });

    try {
      if (editRecord) {
        await updateReceivingEntryInSupabase(
          editRecord.id,
          {
            date: formData.date,
            vendorName: formData.vendorName,
            invoiceAmt: Number(formData.invoiceAmt) || 0,
            invoiceNumber: formData.invoiceNumber,
            mode: formData.mode,
            remarks: formData.remarks,
          },
          imageFile,
          editRecord.imageLink
        );
        toast({ title: "Receiving Entry Updated!" });
      } else {
        await insertReceivingEntryToSupabase(
          {
            date: formData.date,
            vendorName: formData.vendorName,
            invoiceAmt: Number(formData.invoiceAmt) || 0,
            invoiceNumber: formData.invoiceNumber,
            mode: formData.mode,
            remarks: formData.remarks,
          },
          imageFile
        );
        toast({ title: "Receiving Entry Added!" });
      }

      setFormData({
        date: new Date().toISOString().split('T')[0],
        vendorName: '',
        invoiceAmt: 0,
        invoiceNumber: '',
        mode: '',
        remarks: '',
      });
      setEditRecord(null);
      setImageFile(null);
      setFileInputKey(Date.now());
      setIsFormOpen(false);
      await fetchRecords();
    } catch (err: any) {
      toast({ title: editRecord ? "Update Failed" : "Submission Failed", description: err.message, variant: "destructive" });
      console.error(err);
    } finally {
      loadingToast.dismiss();
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteReceivingEntryFromSupabase(deleteTarget.id);
      toast({ title: "Receiving Record Deleted", description: "Record removed successfully." });
      setDeleteTarget(null);
      await fetchRecords();
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDisplayTimestamp = (ts?: string) => {
    if (!ts) return '-';
    return ts;
  };

  const formatEntryDate = (d?: string) => {
    if (!d) return '-';
    try {
      const parsed = parseISO(d);
      if (!parsed || isNaN(parsed.getTime())) return d;
      return format(parsed, "dd/MM/yyyy");
    } catch {
      return d;
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600" /><p className="mt-2 text-slate-500">Loading Receiving Records...</p></div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-3 sm:p-6 bg-[#f5f3ff] min-h-screen space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      <Card className="border-[#ede9fe] shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-violet-50/70 border-b border-violet-100/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-slate-800 flex items-center gap-2 text-lg sm:text-xl font-bold">
              <List className="h-5 w-5 text-violet-600" /> Receiving Records
            </CardTitle>
            <Button onClick={handleOpenAddModal} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-violet-500/20 w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Receiving Entry
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[88vh] flex flex-col p-0 max-w-2xl sm:max-w-3xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
               <FilePlus className="h-5 w-5 text-violet-500" />
               {editRecord ? "Edit Receiving Entry" : "New Receiving Entry"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editRecord ? "Edit vendor invoice receiving entry" : "Add a new vendor invoice receiving entry"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</Label>
                <Input type="date" name="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} required className="rounded-xl h-11" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</Label>
                <div className="flex gap-2">
                  <Select value={formData.vendorName} onValueChange={val => setFormData(p => ({...p, vendorName: val}))}>
                    <SelectTrigger className="flex-1 rounded-xl h-11"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                    <SelectContent>{dropdownOptions.vendorNames.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="outline" onClick={() => setIsVendorModalOpen(true)} className="rounded-xl h-11 w-11 shrink-0"><PlusCircle className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Amount</Label>
                <Input type="number" step="0.01" value={formData.invoiceAmt || ''} onChange={e => setFormData(p => ({...p, invoiceAmt: parseFloat(e.target.value) || 0}))} className="rounded-xl h-11" required />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Number</Label>
                <Input type="text" value={formData.invoiceNumber} onChange={e => setFormData(p => ({...p, invoiceNumber: e.target.value}))} className="rounded-xl h-11" required />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Mode</Label>
                <Select value={formData.mode} onValueChange={val => setFormData(p => ({...p, mode: val}))}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Mode" /></SelectTrigger>
                  <SelectContent>{dropdownOptions.modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</Label>
                <Input type="text" value={formData.remarks} onChange={e => setFormData(p => ({...p, remarks: e.target.value}))} className="rounded-xl h-11" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {editRecord?.imageLink ? "Replace Attachment File (Optional)" : "Attachment File (Optional)"}
                </Label>
                <Input key={fileInputKey} type="file" onChange={e => setImageFile(e.target.files?.[0] || null)} className="rounded-xl h-11" />
                {editRecord?.imageLink && (
                  <p className="text-[11px] text-slate-400 mt-1">Current attachment document is preserved unless replaced.</p>
                )}
              </div>
            </div>
            <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-violet-600 text-white font-bold px-8 rounded-xl shadow-lg shadow-violet-200 w-full sm:w-auto">
                {isSubmitting ? "Processing..." : editRecord ? "Save Changes" : "Add Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl z-[100]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New Vendor</DialogTitle>
            <DialogDescription className="sr-only">Add new vendor option</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddNewVendor();
            }}
          >
            <div className="py-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Name</Label>
              <Input
                value={newVendorName}
                onChange={e => setNewVendorName(e.target.value)}
                placeholder="e.g. Apex Traders"
                className="rounded-xl h-11"
                autoFocus
              />
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsVendorModalOpen(false)} className="rounded-xl w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAddingVendor || !newVendorName.trim()}
                className="bg-violet-600 text-white rounded-xl w-full sm:w-auto"
              >
                {isAddingVendor ? "Adding..." : "Add Vendor"}
              </Button>
            </DialogFooter>
          </form>
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
              Confirm deletion of receiving entry
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 text-sm text-slate-600 space-y-3">
            <p>Are you sure you want to delete this receiving record?</p>
            {deleteTarget && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="text-slate-700">{formatEntryDate(deleteTarget.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vendor:</span>
                  <span className="text-slate-700 font-bold">{deleteTarget.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice #:</span>
                  <span className="text-slate-700">{deleteTarget.invoiceNumber || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-violet-700 font-bold font-mono">
                    ₹{deleteTarget.invoiceAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
            <p className="text-rose-600 text-xs font-semibold">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRecord}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl w-full sm:w-auto shadow-md shadow-rose-200"
            >
              {isDeleting ? "Deleting..." : "Delete Record"}
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
              <span className="truncate">{isPdfFile(previewImageUrl) ? "Receiving Invoice PDF Document" : "Receiving Invoice Attachment"}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview vendor invoice receiving attachment document or photo
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
                  alt="Receiving Attachment"
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
              <Filter className="h-4 w-4 text-violet-500" />
              History ({visibleRecords.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
              <div className="relative w-full sm:w-44">
                <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger className="pl-9 rounded-xl h-10"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {tableVendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
                      <h3 className="text-[10px] uppercase tracking-widest text-slate-400">Date Range</h3>
                      {(tempDateRange.from || tempDateRange.to) && (
                        <Button variant="ghost" className="h-auto p-0 text-[10px] text-rose-500" onClick={() => { setTempDateRange({ from: "", to: "" }); setDateRange(undefined); }}>Clear</Button>
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
          {/* Mobile Card-like View (Visible on phone screens < md) */}
          <div className="block md:hidden p-3 space-y-3">
            {isRecordsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
                <p className="text-xs text-slate-400 mt-2">Loading receiving records...</p>
              </div>
            ) : visibleRecords.length > 0 ? (
              visibleRecords.map(rec => (
                <div key={rec.id} className="p-3.5 bg-slate-50/70 hover:bg-violet-50/40 border border-slate-200/80 rounded-2xl space-y-2.5 shadow-sm transition-colors">
                  {/* Top Bar: Dates & Mode */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">{formatEntryDate(rec.date)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDisplayTimestamp(rec.timestamp)}</span>
                    </div>
                    <div>
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                        {rec.mode}
                      </span>
                    </div>
                  </div>

                  {/* Main Details: Vendor & Invoice Amount */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 truncate">{rec.vendorName}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Invoice: <span className="font-semibold text-slate-700">{rec.invoiceNumber || '-'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs uppercase font-black tracking-widest text-slate-400">Amount</div>
                      <div className="text-sm sm:text-base font-mono font-black text-violet-700">
                        ₹{rec.invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  {rec.remarks ? (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Remarks:</span>
                      <span className="truncate">{rec.remarks}</span>
                    </div>
                  ) : null}

                  {/* Bottom Bar: Attachment & Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                    <div>
                      {rec.imageLink ? (
                        <button
                          type="button"
                          onClick={() => openPreviewModal(rec.imageLink || "")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors border border-purple-200/60 shadow-sm shrink-0"
                        >
                          {isPdfFile(rec.imageLink) ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          <span>View Doc</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">No doc</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors border border-violet-100"
                        title="Edit record"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                        title="Delete record"
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
                No records found matching your filters.
              </div>
            )}
          </div>

          {/* Desktop Tabular View (Hidden on mobile < md) */}
          <div className="hidden md:block overflow-x-auto w-full max-h-[600px]">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-10">
                <tr className="border-b border-violet-100">
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Timestamp</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Entry Date</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Vendor</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Invoice #</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Amount</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                  <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Image</th>
                  <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {isRecordsLoading ? (
                  <tr><td colSpan={8} className="p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" /></td></tr>
                ) : visibleRecords.length > 0 ? (
                  visibleRecords.map(rec => (
                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 sm:p-4 text-slate-500 text-xs">{formatDisplayTimestamp(rec.timestamp)}</td>
                      <td className="p-3 sm:p-4 text-slate-600 font-medium">{formatEntryDate(rec.date)}</td>
                      <td className="p-3 sm:p-4 font-bold text-slate-800">{rec.vendorName}</td>
                      <td className="p-3 sm:p-4 text-slate-600">{rec.invoiceNumber}</td>
                      <td className="p-3 sm:p-4 text-right font-mono font-bold text-violet-700">₹{rec.invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 sm:p-4"><span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">{rec.mode}</span></td>
                      <td className="p-3 sm:p-4 text-center">
                        {rec.imageLink ? (
                          <button
                            type="button"
                            onClick={() => openPreviewModal(rec.imageLink || "")}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors border border-purple-200/60 shadow-sm"
                            title="Click to view attachment"
                          >
                            {isPdfFile(rec.imageLink) ? (
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
                            onClick={() => handleOpenEditModal(rec)}
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Edit record"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(rec)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic">No records found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceivingPage;