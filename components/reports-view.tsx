"use client"

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  CreditCard,
  Calendar,
  Users,
  Loader2,
  X,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Store,
  Layers,
  Wallet,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { fetchTransactionsFromSupabase, Transaction } from "@/lib/api/transactions";

interface AppUser {
  id: string;
  name: string;
  role: "user" | "admin";
  pages: string[];
}

interface AnalysisData {
  incoming: number;
  outgoing: number;
  count: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  personName: string;
  groupHead: string;
  vendorName: string;
  mode: string;
}

// --- UI COMPONENTS ---
const Card = ({ children, className = "", noBg, noBorder, ...props }: { children: React.ReactNode, className?: string, noBg?: boolean, noBorder?: boolean } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={`${noBg ? '' : 'bg-white'} ${noBorder ? '' : 'border border-[#ede9fe]'} rounded-2xl shadow-xl shadow-violet-500/5 overflow-hidden transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-5 py-4 border-b border-violet-100/80 bg-violet-50/70 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`font-bold text-slate-800 flex items-center gap-2.5 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-4 sm:p-5 ${className}`}>
    {children}
  </div>
);

const formatExactIndian = (value: number): string => {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const formatAbbreviatedIndian = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 10000000) return (value / 10000000).toFixed(2) + " Cr";
  if (abs >= 100000) return (value / 100000).toFixed(2) + " L";
  if (abs >= 1000) return (value / 1000).toFixed(1) + " K";
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

function ReportsView({ currentUser, onDetailClick }: { currentUser: AppUser, onDetailClick: (detail: { type: string, value: string, data: Transaction[] }) => void }) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    personName: 'all',
    groupHead: 'all',
    vendorName: 'all',
    mode: 'all'
  });

  useEffect(() => {
    const loadReportsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const txs = await fetchTransactionsFromSupabase();
        setTransactions(txs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadReportsData();
  }, []);

  // Filter options derived from current transactions
  const dropdownOptions = useMemo(() => {
    const persons = new Set<string>();
    const groupHeads = new Set<string>();
    const vendors = new Set<string>();
    const modes = new Set<string>();

    const baseTxs = currentUser.role === "admin"
      ? transactions
      : transactions.filter((t) => t.personName === currentUser.name);

    baseTxs.forEach(t => {
      const p = t.personName?.trim();
      if (p && p !== "-") persons.add(p);

      const g = t.groupHead?.trim();
      if (g && g !== "-") groupHeads.add(g);

      const v = t.vendorName?.trim();
      if (v && v !== "-") vendors.add(v);

      const m = t.mode?.trim();
      if (m && m !== "-") modes.add(m);
    });

    return {
      personNames: Array.from(persons).sort((a, b) => a.localeCompare(b)),
      groupHeads: Array.from(groupHeads).sort((a, b) => a.localeCompare(b)),
      vendorNames: Array.from(vendors).sort((a, b) => a.localeCompare(b)),
      modes: Array.from(modes).sort((a, b) => a.localeCompare(b)),
    };
  }, [transactions, currentUser]);

  // Active filtered transactions
  const userTransactions = useMemo(() => {
    let base = currentUser.role === "admin"
      ? transactions
      : transactions.filter((t) => t.personName === currentUser.name);

    return base.filter(t => {
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      if (filters.personName !== 'all' && t.personName !== filters.personName) return false;
      if (filters.groupHead !== 'all' && t.groupHead !== filters.groupHead) return false;
      if (filters.mode !== 'all' && t.mode !== filters.mode) return false;
      if (filters.vendorName !== 'all' && t.vendorName !== filters.vendorName) return false;
      return true;
    });
  }, [transactions, currentUser, filters]);

  const handleFilterChange = (name: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      personName: 'all',
      groupHead: 'all',
      vendorName: 'all',
      mode: 'all'
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.personName !== 'all') count++;
    if (filters.groupHead !== 'all') count++;
    if (filters.vendorName !== 'all') count++;
    if (filters.mode !== 'all') count++;
    return count;
  }, [filters]);

  const isFilterActive = activeFilterCount > 0;

  // Aggregate KPI Totals
  const totals = useMemo(() => {
    return userTransactions.reduce((acc, t) => {
      acc.incoming += t.incoming || 0;
      acc.outgoing += t.outgoing || 0;
      acc.count++;
      return acc;
    }, { incoming: 0, outgoing: 0, count: 0 });
  }, [userTransactions]);

  const netBalance = totals.incoming - totals.outgoing;

  // Analysis Breakdown by Categories
  const analysisData = useMemo(() => {
    const monthlyAcc: Record<string, AnalysisData> = {};
    const groupHeadAcc: Record<string, AnalysisData> = {};
    const vendorAcc: Record<string, AnalysisData> = {};
    const modeAcc: Record<string, AnalysisData> = {};
    const personAcc: Record<string, AnalysisData> = {};

    userTransactions.forEach(t => {
      const monthKey = t.monthName || 'Unknown Month';
      if (!monthlyAcc[monthKey]) monthlyAcc[monthKey] = { incoming: 0, outgoing: 0, count: 0 };
      monthlyAcc[monthKey].incoming += t.incoming || 0;
      monthlyAcc[monthKey].outgoing += t.outgoing || 0;
      monthlyAcc[monthKey].count++;

      const groupKey = t.groupHead?.trim() || 'Uncategorized';
      if (!groupHeadAcc[groupKey]) groupHeadAcc[groupKey] = { incoming: 0, outgoing: 0, count: 0 };
      groupHeadAcc[groupKey].incoming += t.incoming || 0;
      groupHeadAcc[groupKey].outgoing += t.outgoing || 0;
      groupHeadAcc[groupKey].count++;

      const vendorKey = t.vendorName?.trim() ? t.vendorName.trim() : 'No Vendor';
      if (!vendorAcc[vendorKey]) vendorAcc[vendorKey] = { incoming: 0, outgoing: 0, count: 0 };
      vendorAcc[vendorKey].incoming += t.incoming || 0;
      vendorAcc[vendorKey].outgoing += t.outgoing || 0;
      vendorAcc[vendorKey].count++;

      const modeKey = t.mode?.trim() || 'Unknown';
      if (!modeAcc[modeKey]) modeAcc[modeKey] = { incoming: 0, outgoing: 0, count: 0 };
      modeAcc[modeKey].incoming += t.incoming || 0;
      modeAcc[modeKey].outgoing += t.outgoing || 0;
      modeAcc[modeKey].count++;

      const personKey = t.personName?.trim() || 'Unknown User';
      if (!personAcc[personKey]) personAcc[personKey] = { incoming: 0, outgoing: 0, count: 0 };
      personAcc[personKey].incoming += t.incoming || 0;
      personAcc[personKey].outgoing += t.outgoing || 0;
      personAcc[personKey].count++;
    });

    const sortByVolume = (entries: [string, AnalysisData][]) => {
      return entries.sort((a, b) => (b[1].outgoing + b[1].incoming) - (a[1].outgoing + a[1].incoming));
    };

    return {
      monthly: sortByVolume(Object.entries(monthlyAcc)),
      groupHead: sortByVolume(Object.entries(groupHeadAcc)),
      vendor: sortByVolume(Object.entries(vendorAcc)),
      mode: sortByVolume(Object.entries(modeAcc)),
      person: sortByVolume(Object.entries(personAcc))
    };
  }, [userTransactions]);

  const handleDetailClick = (type: string, value: string) => {
    let filteredData: Transaction[] = [];
    switch (type) {
      case "groupHead":
        filteredData = userTransactions.filter((t) => (t.groupHead?.trim() || "Uncategorized") === value);
        break;
      case "vendor":
        filteredData = userTransactions.filter((t) => (t.vendorName?.trim() || "No Vendor") === value);
        break;
      case "mode":
        filteredData = userTransactions.filter((t) => (t.mode?.trim() || "Unknown") === value);
        break;
      case "month":
        filteredData = userTransactions.filter((t) => (t.monthName || "Unknown Month") === value);
        break;
      case "person":
        filteredData = userTransactions.filter((t) => (t.personName?.trim() || "Unknown User") === value);
        break;
    }
    onDetailClick({ type, value, data: filteredData });
  };

  // Card Definition List
  const allCards = useMemo(() => {
    const list = [
      {
        id: "vendor",
        title: "Vendor-wise Analysis",
        subtitle: "Suppliers & service providers",
        icon: Store,
        colorClass: "text-amber-500",
        bgClass: "bg-amber-500/10",
        data: analysisData.vendor,
        type: "vendor",
        adminOnly: false,
      },
      {
        id: "groupHead",
        title: "Group Head Analysis",
        subtitle: "Expense & income categories",
        icon: Target,
        colorClass: "text-violet-500",
        bgClass: "bg-violet-500/10",
        data: analysisData.groupHead,
        type: "groupHead",
        adminOnly: false,
      },
      {
        id: "month",
        title: "Monthly Analysis",
        subtitle: "Month-by-month cash flow",
        icon: Calendar,
        colorClass: "text-blue-500",
        bgClass: "bg-blue-500/10",
        data: analysisData.monthly,
        type: "month",
        adminOnly: false,
      },
      {
        id: "mode",
        title: "Payment Mode Analysis",
        subtitle: "Cash, Bank, UPI & other modes",
        icon: CreditCard,
        colorClass: "text-emerald-500",
        bgClass: "bg-emerald-500/10",
        data: analysisData.mode,
        type: "mode",
        adminOnly: false,
      },
      {
        id: "person",
        title: "Person-wise Analysis",
        subtitle: "Individual entries & handling",
        icon: Users,
        colorClass: "text-fuchsia-500",
        bgClass: "bg-fuchsia-500/10",
        data: analysisData.person,
        type: "person",
        adminOnly: true,
      },
    ];
    return list.filter(c => !c.adminOnly || currentUser.role === "admin");
  }, [analysisData, currentUser]);

  // Tab definitions
  const tabs = useMemo(() => {
    return [
      { id: "all", label: "All Categories", icon: Layers, count: allCards.length },
      ...allCards.map(c => ({ id: c.id, label: c.title.replace(" Analysis", ""), icon: c.icon, count: c.data.length }))
    ];
  }, [allCards]);

  const visibleCards = useMemo(() => {
    if (selectedTab === "all") return allCards;
    return allCards.filter(c => c.id === selectedTab);
  }, [allCards, selectedTab]);

  const AnalysisCard = ({
    title,
    subtitle,
    icon: Icon,
    colorClass,
    bgClass,
    data,
    type,
  }: {
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
    data: [string, AnalysisData][];
    type: string;
  }) => {
    const q = searchQuery.trim().toLowerCase();
    const filteredRows = q
      ? data.filter(([key]) => key.toLowerCase().includes(q))
      : data;

    const categoryTotalOutgoing = data.reduce((sum, [, item]) => sum + item.outgoing, 0);

    return (
      <Card className="hover:border-violet-200 transition-all duration-300 group/card flex flex-col h-full">
        <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass} shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-100/80 text-violet-700 shrink-0">
            {data.length} {data.length === 1 ? 'item' : 'items'}
          </span>
        </CardHeader>
        <CardContent className="!p-3 sm:!p-4 flex-1 flex flex-col justify-between">
          <div className="max-h-[22rem] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {filteredRows.length > 0 ? (
              filteredRows.map(([key, itemData]) => {
                const outgoingPercentage = categoryTotalOutgoing > 0
                  ? Math.round((itemData.outgoing / categoryTotalOutgoing) * 100)
                  : 0;

                return (
                  <div
                    key={key}
                    className="p-3 sm:p-3.5 rounded-xl bg-slate-50/60 hover:bg-violet-50/80 border border-slate-100 hover:border-violet-200 cursor-pointer transition-all duration-200 group gap-2 space-y-2"
                    onClick={() => handleDetailClick(type, key)}
                    title={`Click to view detailed transactions for ${key}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 group-hover:border-violet-200 transition-colors shrink-0">
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 group-hover:text-violet-700 transition-colors uppercase tracking-tight text-xs truncate">
                            {key}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{itemData.count} {itemData.count === 1 ? 'entry' : 'entries'}</span>
                            {outgoingPercentage > 0 && (
                              <span className="text-[9px] text-rose-500 font-semibold bg-rose-50 px-1.5 py-0.2 rounded">
                                {outgoingPercentage}% of exp
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2 space-y-0.5">
                        {itemData.incoming > 0 && (
                          <div className="text-emerald-600 font-bold text-xs sm:text-sm">
                            +₹{formatExactIndian(itemData.incoming)}
                          </div>
                        )}
                        {itemData.outgoing > 0 && (
                          <div className="text-rose-600 font-bold text-xs sm:text-sm">
                            -₹{formatExactIndian(itemData.outgoing)}
                          </div>
                        )}
                        {itemData.incoming === 0 && itemData.outgoing === 0 && (
                          <div className="text-slate-400 font-medium text-xs">₹0</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic space-y-1">
                <p>No matching records found</p>
                {q && <p className="text-[10px] text-slate-300">Try clearing the search filter</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#f5f3ff]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600 mb-4" /> 
        <span className="text-lg text-slate-600 font-bold animate-pulse">Compiling financial reports...</span>
        <span className="text-xs text-slate-400 mt-1">Aggregating vendors, groups, modes and timelines</span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 bg-[#f5f3ff] min-h-screen space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden animate-in fade-in duration-300">
      {/* 1. Header Banner with Direct Inline Filters */}
      <Card className="border-[#ede9fe] shadow-xl shadow-violet-500/5 rounded-2xl overflow-hidden">
        <CardHeader className="bg-violet-50/70 border-b border-violet-100/80 p-4 sm:p-5">
          <div className="flex flex-col gap-3.5">
            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-600 text-white rounded-xl shadow-md shadow-violet-200">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    Financial Reports & Analysis
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Breakdowns across Vendors, Group Heads, Months, Payment Modes, and Personnel
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Inline Filters Row (Replaces the Pop-up Dialog) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2.5 border-t border-violet-100/70">
              {/* Person Filter (Admin only) */}
              {currentUser.role === 'admin' && (
                <div className="relative w-full sm:w-36 md:w-40">
                  <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
                  <Select value={filters.personName} onValueChange={val => handleFilterChange('personName', val)}>
                    <SelectTrigger className="pl-8 rounded-xl h-10 text-xs bg-white border-slate-200 shadow-sm">
                      <SelectValue placeholder="All Persons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Persons</SelectItem>
                      {dropdownOptions.personNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Group Head Filter */}
              <div className="relative w-full sm:w-36 md:w-40">
                <Select value={filters.groupHead} onValueChange={val => handleFilterChange('groupHead', val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="All Group Heads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Group Heads</SelectItem>
                    {dropdownOptions.groupHeads.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor Filter */}
              <div className="relative w-full sm:w-36 md:w-40">
                <Select value={filters.vendorName} onValueChange={val => handleFilterChange('vendorName', val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {dropdownOptions.vendorNames.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Mode Filter */}
              <div className="relative w-full sm:w-32">
                <Select value={filters.mode} onValueChange={val => handleFilterChange('mode', val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    {dropdownOptions.modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className={`h-10 rounded-xl px-3.5 flex items-center justify-center gap-1.5 font-bold text-xs transition-all w-full sm:w-auto shadow-sm ${
                    filters.dateFrom || filters.dateTo
                      ? "bg-violet-600 text-white shadow-violet-200"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>{filters.dateFrom || filters.dateTo ? `${filters.dateFrom || '...'} to ${filters.dateTo || '...'}` : 'DATE'}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-72 max-w-xs p-4 rounded-2xl shadow-2xl border border-slate-100 bg-white z-[100]" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Range</span>
                      {(filters.dateFrom || filters.dateTo) && (
                        <button className="text-[10px] text-rose-500 font-bold hover:underline" onClick={() => { handleFilterChange('dateFrom', ''); handleFilterChange('dateTo', ''); }}>Clear</button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">From</label>
                        <input type="date" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">To</label>
                        <input type="date" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700" />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Live Search Across Cards */}
              <div className="relative flex-1 min-w-[150px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in cards..."
                  className="w-full h-10 pl-9 pr-8 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-slate-400 text-slate-700 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Clear All Filters Button */}
              {isFilterActive && (
                <button
                  onClick={clearFilters}
                  className="h-10 px-3.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
                >
                  <X className="h-3.5 w-3.5" /> Clear All
                </button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 2. Top KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Incoming */}
        <Card className="border-emerald-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Incoming</p>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-600">
                ₹{formatExactIndian(totals.incoming)}
              </h2>
              <p className="text-[11px] text-emerald-700/70 font-semibold">
                {formatAbbreviatedIndian(totals.incoming)} total collections
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Outgoing */}
        <Card className="border-rose-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outgoing</p>
              <h2 className="text-xl sm:text-2xl font-black text-rose-600">
                ₹{formatExactIndian(totals.outgoing)}
              </h2>
              <p className="text-[11px] text-rose-700/70 font-semibold">
                {formatAbbreviatedIndian(totals.outgoing)} total expenses
              </p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shrink-0">
              <TrendingDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className={`${netBalance >= 0 ? 'border-violet-100' : 'border-amber-100'} hover:shadow-lg transition-all duration-300`}>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {netBalance >= 0 ? "Net Surplus" : "Net Deficit"}
              </p>
              <h2 className={`text-xl sm:text-2xl font-black ${netBalance >= 0 ? 'text-violet-600' : 'text-amber-600'}`}>
                ₹{formatExactIndian(Math.abs(netBalance))}
              </h2>
              <p className={`text-[11px] font-semibold ${netBalance >= 0 ? 'text-violet-700/70' : 'text-amber-700/70'}`}>
                {netBalance >= 0 ? 'Positive cash balance' : 'Expenses exceed income'}
              </p>
            </div>
            <div className={`p-3 rounded-2xl shrink-0 ${netBalance >= 0 ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
              <Wallet className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Transactions Count */}
        <Card className="border-slate-100 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transactions</p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                {totals.count}
              </h2>
              <p className="text-[11px] text-slate-400 font-semibold">
                Analyzed entries
              </p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shrink-0">
              <LayoutDashboard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Category Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                isActive
                  ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                  : "bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-700 border border-violet-100/80"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-md ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Analysis Cards Grid */}
      <div className={`grid gap-4 sm:gap-6 pb-8 ${
        visibleCards.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
      }`}>
        {visibleCards.map((card, index) => (
          <div
            key={card.id}
            className={
              selectedTab === "all" && index === visibleCards.length - 1 && visibleCards.length % 2 !== 0
                ? "lg:col-span-2"
                : ""
            }
          >
            <AnalysisCard {...card} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportsView;