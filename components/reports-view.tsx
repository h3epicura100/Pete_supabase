"use client"

import React, { useState, useEffect, useMemo } from "react";
import { Target, CreditCard, Calendar, Users, Loader2, Filter, X, ChevronRight, BarChart3, Search, TrendingUp, TrendingDown, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"

// --- INTERFACES ---
interface Transaction {
    id: string;
    personName: string;
    userId: string;
    date: string;
    monthName: string;
    incoming: number;
    outgoing: number;
    mode: string;
    groupHead: string;
    reason: string;
}

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
    reason: string;
    mode: string;
}

interface DropdownOptions {
    personNames: string[];
    reasons: string[];
    groupHeads: string[];
    modes: string[];
}

// --- UI COMPONENTS ---
const Card = ({ children, className = "", noBg, noBorder, ...props }: { children: React.ReactNode, className?: string, noBg?: boolean, noBorder?: boolean } & React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className={`${noBg ? '' : 'bg-white'} ${noBorder ? '' : 'border border-[#ede9fe]'} rounded-2xl shadow-xl shadow-violet-500/5 overflow-hidden transition-all duration-300 ${className}`}>
        {children}
    </div>
);
const CardHeader = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`px-6 py-5 border-b border-violet-100/80 bg-violet-50/70 ${className}`}>
        {children}
    </div>
);
const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <h3 className={`font-bold text-slate-800 flex items-center gap-2.5 ${className}`}>
        {children}
    </h3>
);
const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);
const Button = ({ children, onClick, variant = 'default', className = '', disabled, type = 'button' }: { children: React.ReactNode, onClick?: (e: any) => void, variant?: string, className?: string, disabled?: boolean, type?: 'button' | 'submit' | 'reset' }) => {
  const baseClasses = 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] shadow-lg';
  const variantClasses = variant === 'outline' 
    ? 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-none' 
    : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:opacity-90 shadow-violet-500/20';
  return <button type={type} onClick={onClick} className={`${baseClasses} ${variantClasses} ${className}`} disabled={disabled}>{children}</button>;
};
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full h-11 px-4 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-violet-500/5 focus:border-violet-300 transition-all outline-none text-slate-700 ${props.className || ''}`} />
);
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props} className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ${props.className || ''}`} />
);
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
    <select {...props} className={`w-full h-11 px-3 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-violet-500/5 focus:border-violet-300 transition-all outline-none text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat ${props.className || ''}`}>
        {children}
    </select>
);
const SelectItem = (props: React.OptionHTMLAttributes<HTMLOptionElement>) => <option {...props}>{props.children}</option>;

import { fetchTransactionsFromSupabase } from "@/lib/api/transactions";
import { fetchDropdownOptionsFromSupabase } from "@/lib/api/master";

function ReportsView({ currentUser, onDetailClick }: { currentUser: AppUser, onDetailClick: (detail: { type: string, value: string, data: Transaction[] }) => void }) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', reason: 'all', mode: 'all' });
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({ personNames: [], reasons: [], groupHeads: [], modes: [] });

  useEffect(() => {
    const loadReportsData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [txs, options] = await Promise.all([
                fetchTransactionsFromSupabase(),
                fetchDropdownOptionsFromSupabase()
            ]);
            setTransactions(txs);
            setDropdownOptions({
                personNames: options.personName,
                reasons: options.reason,
                groupHeads: options.groupHead,
                modes: options.mode,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    loadReportsData();
  }, []);

  const userTransactions = useMemo(() => {
    let base = currentUser.role === "admin" ? transactions : transactions.filter((t) => t.personName === currentUser.name);
    return base.filter(t => {
        if (filters.dateFrom && t.date < filters.dateFrom) return false;
        if (filters.dateTo && t.date > filters.dateTo) return false;
        if (filters.personName !== 'all' && t.personName !== filters.personName) return false;
        if (filters.groupHead !== 'all' && t.groupHead !== filters.groupHead) return false;
        if (filters.mode !== 'all' && t.mode !== filters.mode) return false;
        if (filters.reason !== 'all' && t.reason !== filters.reason) return false;
        return true;
    });
  }, [transactions, currentUser, filters]);

  const handleFilterChange = (name: keyof Filters, value: string) => setFilters(prev => ({ ...prev, [name]: value }));
  const clearFilters = () => setFilters({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', reason: 'all', mode: 'all' });
  const isFilterActive = useMemo(() => Object.values(filters).some(v => v !== '' && v !== 'all'), [filters]);

  const analysisData = useMemo(() => {
    const monthlyAcc: Record<string, AnalysisData> = {};
    const groupHeadAcc: Record<string, AnalysisData> = {};
    const modeAcc: Record<string, AnalysisData> = {};
    const personAcc: Record<string, AnalysisData> = {};

    userTransactions.forEach(t => {
      const monthKey = t.monthName;
      if (!monthlyAcc[monthKey]) monthlyAcc[monthKey] = { incoming: 0, outgoing: 0, count: 0 };
      monthlyAcc[monthKey].incoming += t.incoming;
      monthlyAcc[monthKey].outgoing += t.outgoing;
      monthlyAcc[monthKey].count++;

      const groupKey = t.groupHead || 'Uncategorized';
      if (!groupHeadAcc[groupKey]) groupHeadAcc[groupKey] = { incoming: 0, outgoing: 0, count: 0 };
      groupHeadAcc[groupKey].incoming += t.incoming;
      groupHeadAcc[groupKey].outgoing += t.outgoing;
      groupHeadAcc[groupKey].count++;

      const modeKey = t.mode || 'Unknown';
      if (!modeAcc[modeKey]) modeAcc[modeKey] = { incoming: 0, outgoing: 0, count: 0 };
      modeAcc[modeKey].incoming += t.incoming;
      modeAcc[modeKey].outgoing += t.outgoing;
      modeAcc[modeKey].count++;

      const personKey = t.personName || 'Unknown User';
      if (!personAcc[personKey]) personAcc[personKey] = { incoming: 0, outgoing: 0, count: 0 };
      personAcc[personKey].incoming += t.incoming;
      personAcc[personKey].outgoing += t.outgoing;
      personAcc[personKey].count++;
    });

    return {
      monthly: Object.entries(monthlyAcc),
      groupHead: Object.entries(groupHeadAcc),
      mode: Object.entries(modeAcc),
      person: Object.entries(personAcc)
    };
  }, [userTransactions]);

  const handleDetailClick = (type: string, value: string) => {
    let filteredData: Transaction[] = [];
    switch (type) {
      case "groupHead":
        filteredData = userTransactions.filter((t) => (t.groupHead || "Uncategorized") === value);
        break;
      case "mode":
        filteredData = userTransactions.filter((t) => (t.mode || "Unknown") === value);
        break;
      case "month":
        filteredData = userTransactions.filter((t) => t.monthName === value);
        break;
      case "person":
        filteredData = userTransactions.filter((t) => (t.personName || "Unknown User") === value);
        break;
    }
    onDetailClick({ type, value, data: filteredData });
  };
  
    const AnalysisCard = ({ title, icon: Icon, data, type }: { title: string, icon: React.ElementType, data: [string, AnalysisData][], type: string }) => (
        <Card className="hover:border-violet-200 group/card">
          <CardHeader>
            <CardTitle className="text-sm"><Icon className="h-4 w-4 text-violet-500" /> {title}</CardTitle>
          </CardHeader>
          <CardContent className="!p-4">
            <div className="max-h-[22rem] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {data.map(([key, itemData]) => (
                <div
                  key={key}
                  className="flex justify-between items-center p-4 rounded-xl hover:bg-violet-50/50 border border-transparent hover:border-violet-100 cursor-pointer transition-all duration-300 group"
                  onClick={() => handleDetailClick(type, key)}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-white transition-colors">
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors uppercase tracking-tight text-xs">{key}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{itemData.count} entries</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4 space-y-0.5">
                    <div className="text-emerald-600 font-bold text-sm">+₹{itemData.incoming.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                    <div className="text-rose-500 font-bold text-sm">-₹{itemData.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    const cards = [
        { title: "Group Head Analysis", icon: Target, data: analysisData.groupHead, type: "groupHead", adminOnly: false },
        { title: "Monthly Analysis", icon: Calendar, data: analysisData.monthly, type: "month", adminOnly: false },
        { title: "Payment Mode Analysis", icon: CreditCard, data: analysisData.mode, type: "mode", adminOnly: false },
        { title: "Person-wise Analysis", icon: Users, data: analysisData.person, type: "person", adminOnly: true },
    ].filter(c => !c.adminOnly || currentUser.role === "admin");

  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({});

  const totals = useMemo(() => {
    return userTransactions.reduce((acc, t) => {
        acc.incoming += t.incoming;
        acc.outgoing += t.outgoing;
        return acc;
    }, { incoming: 0, outgoing: 0 });
  }, [userTransactions]);

  const toggleMetric = (id: string) => setVisibleMetrics(prev => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center h-screen bg-[#f5f3ff]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600 mb-4" /> 
        <span className="text-lg text-slate-500 font-medium animate-pulse">Analyzing reports...</span>
    </div>
  );

  const formatAbbreviatedIndianLocal = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 10000000) return (value / 10000000).toFixed(1) + " Cr";
    if (abs >= 100000) return (value / 100000).toFixed(1) + " L";
    if (abs >= 1000) return (value / 1000).toFixed(1) + " K";
    return value.toString();
  };

  const formatExactIndianLocal = (value: number): string => {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const MetricCard = ({ id, label, value, icon: Icon, colorClass, bgClass, iconBgClass }: { id: string, label: string, value: number, icon: any, colorClass: string, bgClass: string, iconBgClass: string }) => {
    const isExpanded = visibleMetrics[id];
    return (
        <Card 
            noBg noBorder
            className={`group hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-300 relative overflow-hidden ${bgClass} backdrop-blur-sm`}
            onClick={() => toggleMetric(id)}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="h-24 w-24 -mr-8 -mt-8" />
            </div>
            <CardContent className="p-6 flex justify-between items-center relative z-10">
                <div className="space-y-1">
                    <div className={`text-2xl font-black ${colorClass} tracking-tight`}>
                        {isExpanded ? formatExactIndianLocal(value) : formatAbbreviatedIndianLocal(value)}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400/80">{label}</div>
                </div>
                <div className={`p-4 rounded-2xl ${iconBgClass} transition-colors shadow-sm`}>
                    <Icon className={`h-6 w-6 ${colorClass}`} />
                </div>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="p-2 bg-[#f5f3ff] min-h-screen space-y-6">

       <Card className="border-[#ede9fe] shadow-xl shadow-violet-500/5 rounded-2xl overflow-hidden">
        <CardHeader className="bg-violet-50/70 border-b border-violet-100/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-slate-800 flex items-center gap-2.5 text-2xl">
              <BarChart3 className="h-5 w-5 text-violet-500" />
              Summary Reports
            </CardTitle>
            <div className="flex items-center gap-3">
                {isFilterActive && (
                    <Button variant="outline" onClick={clearFilters} className="h-10 px-4 text-[10px] text-rose-500 border-rose-100 hover:bg-rose-50">
                        <X className="h-4 w-4 mr-2" /> Clear Filters
                    </Button>
                )}
                <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-10 px-5 gap-2">
                            <Filter className="h-4 w-4" />
                            Report Filters
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-violet-500" />
                                Filter Parameters
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            <div><Label>From Date</Label><Input type="date" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} /></div>
                            <div><Label>To Date</Label><Input type="date" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} /></div>
                            {currentUser.role === 'admin' && (
                                <div><Label>Person Name</Label>
                                    <Select value={filters.personName} onChange={e => handleFilterChange('personName', e.target.value)}>
                                        <SelectItem value="all">All Persons</SelectItem>
                                        {dropdownOptions.personNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </Select>
                                </div>
                            )}
                            <div><Label>Group Head</Label>
                                <Select value={filters.groupHead} onChange={e => handleFilterChange('groupHead', e.target.value)}>
                                    <SelectItem value="all">All Groups</SelectItem>
                                    {dropdownOptions.groupHeads.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </Select>
                            </div>
                            <div><Label>Mode</Label>
                                <Select value={filters.mode} onChange={e => handleFilterChange('mode', e.target.value)}>
                                    <SelectItem value="all">All Modes</SelectItem>
                                    {dropdownOptions.modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </Select>
                            </div>
                            <div><Label>Reason</Label>
                                <Select value={filters.reason} onChange={e => handleFilterChange('reason', e.target.value)}>
                                    <SelectItem value="all">All Reasons</SelectItem>
                                    {dropdownOptions.reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                             <Button variant="outline" onClick={() => setIsFilterDialogOpen(false)}>Close</Button>
                             <Button onClick={() => setIsFilterDialogOpen(false)}>Apply Filters</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {cards.map((card, index) => (
            <div key={card.title} className={index === cards.length - 1 && cards.length % 2 !== 0 ? "lg:col-span-2" : ""}>
                <AnalysisCard {...card} />
            </div>
        ))}
      </div>
    </div>
  );
}

export default ReportsView;