"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, ExternalLink, FilePlus, List, Search, Users, Filter, ChevronDown, CalendarIcon, X, Image as ImageIcon, FileText } from "lucide-react";
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

import { fetchReceivingRecordsFromSupabase, insertReceivingEntryToSupabase, ReceivingRecord } from "@/lib/api/receiving";
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

  const handleClearAllFilters = () => {
    setVendorFilter("all");
    setDateRange(undefined);
    setTempDateRange({ from: "", to: "" });
    setTableSearch("");
  };

  const handleAddNewVendor = async () => {
    if (!newVendorName.trim()) return;
    setIsAddingVendor(true);
    try {
      await addVendorToSupabase(newVendorName);
      setNewVendorName('');
      setIsVendorModalOpen(false);
      await fetchDropdownOptions();
    } catch (err) {
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
    const loadingToast = toast({ title: "Submitting Receiving Entry...", description: "Please wait.", duration: 900000 });

    try {
      await insertReceivingEntryToSupabase(
        {
          date: formData.date,
          vendorName: formData.vendorName,
          invoiceAmt: formData.invoiceAmt,
          invoiceNumber: formData.invoiceNumber,
          mode: formData.mode,
          remarks: formData.remarks,
        },
        imageFile
      );
      toast({ title: "Receiving Entry Added!" });
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
      setIsFormOpen(false);
      await fetchRecords();
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
      console.error(err);
    } finally {
      loadingToast.dismiss();
      setIsSubmitting(false);
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
            <Button onClick={() => setIsFormOpen(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-violet-500/20 w-full sm:w-auto">
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
               New Receiving Entry
            </DialogTitle>
            <DialogDescription className="sr-only">Add a new vendor invoice receiving entry</DialogDescription>
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attachment File (Optional)</Label>
                <Input key={fileInputKey} type="file" onChange={e => setImageFile(e.target.files?.[0] || null)} className="rounded-xl h-11" />
              </div>
            </div>
            <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-violet-600 text-white font-bold px-8 rounded-xl shadow-lg shadow-violet-200 w-full sm:w-auto">{isSubmitting ? "Processing..." : "Add Entry"}</Button>
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
          <div className="py-2 space-y-2"><Label>Vendor Name</Label><Input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Name" className="rounded-xl h-11" /></div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0"><Button variant="outline" onClick={() => setIsVendorModalOpen(false)} className="rounded-xl w-full sm:w-auto">Cancel</Button><Button onClick={handleAddNewVendor} disabled={isAddingVendor} className="rounded-xl w-full sm:w-auto">Add Vendor</Button></DialogFooter>
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
                    {dropdownOptions.vendorNames.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
          <div className="overflow-x-auto w-full max-h-[600px]">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-10">
                <tr className="border-b border-violet-100">
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Timestamp</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Entry Date</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Vendor</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Invoice #</th>
                  <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Amount</th>
                  <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                  <th className="p-3 sm:p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-600">Image</th>
                </tr>
              </thead>
              <tbody>
                {isRecordsLoading ? (
                  <tr><td colSpan={7} className="p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" /></td></tr>
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
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No records found matching your filters.</td></tr>
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