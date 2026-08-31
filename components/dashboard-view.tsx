"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Filter, DollarSign, FileText, TrendingUp, TrendingDown, LayoutDashboard,
    Loader2, List
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// --- INTERFACES ---
interface Transaction {
    id: string;
    timestamp: string;
    personName: string;
    userId: string;
    date: string;
    incoming: number;
    outgoing: number;
    mode: string;
    groupHead: string;
    reason: string;
    photoLink: string;
    monthName: string;
    formattedDate: string;
}

interface AppUser {
    id: string;
    name: string;
    role: "user" | "admin";
    pages: string[];
}

interface Filters {
    dateFrom: string;
    dateTo: string;
    personName: string;
    groupHead: string;
    reason: string;
    mode: string;
    monthName: string;
    search: string;
}

interface DropdownOptions {
    personNames: string[];
    reasons: string[];
    groupHeads: string[];
    modes: string[];
    months: string[];
}

import { fetchTransactionsFromSupabase } from "@/lib/api/transactions";
import { fetchDropdownOptionsFromSupabase } from "@/lib/api/master";

// --- HELPER FUNCTIONS ---
const formatXAxisDate = (tickItem: string): string => {
    if (!tickItem) return '';
    try {
        const date = new Date(tickItem);
        if (isNaN(date.getTime())) return tickItem;
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    } catch (e) {
        return tickItem;
    }
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white border border-[#ede9fe] rounded-2xl shadow-xl shadow-violet-500/5 overflow-hidden transition-all duration-300 ${className}`}>
        {children}
    </div>
);
const CardHeader = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`px-6 py-5 border-b border-violet-100/80 bg-violet-50/70 ${className}`}>
        {children}
    </div>
);
const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <h3 className={`text-sm font-bold text-slate-800 flex items-center gap-2.5 ${className}`}>
        {children}
    </h3>
);
const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);
const Button = ({ children, onClick, variant = 'default', className = '', disabled }: { children: React.ReactNode, onClick?: () => void, variant?: string, className?: string, disabled?: boolean }) => {
    const baseClasses = 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] shadow-lg';
    const variantClasses = variant === 'outline'
        ? 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-none'
        : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:opacity-90 shadow-violet-500/20';
    return <button onClick={onClick} className={`${baseClasses} ${variantClasses} ${className}`} disabled={disabled}>{children}</button>;
};
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full h-11 px-4 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-violet-500/5 focus:border-violet-300 transition-all outline-none text-slate-700 ${props.className || ''}`} />
);
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props} className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ${props.className || ''}`} />
);
const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: string, className?: string }) => {
    const base = "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block transition-colors";
    const variants: { [key: string]: string } = {
        default: "bg-violet-50 text-violet-600 border border-violet-100",
        secondary: "bg-slate-100 text-slate-500 border border-slate-200"
    };
    return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>
};

// --- DASHBOARD VIEW COMPONENT ---
function DashboardView({ currentUser }: { currentUser: AppUser }) {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filters, setFilters] = useState<Filters>({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', reason: 'all', mode: 'all', monthName: 'all', search: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

    const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({
        personNames: [],
        reasons: [],
        groupHeads: [],
        modes: [],
        months: [],
    });

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [txs, options] = await Promise.all([
                    fetchTransactionsFromSupabase(),
                    fetchDropdownOptionsFromSupabase()
                ]);

                setAllTransactions(txs);

                const monthsSet = new Set<string>();
                txs.forEach((t) => {
                    if (t.monthName) monthsSet.add(t.monthName);
                });

                setDropdownOptions({
                    personNames: options.personName,
                    reasons: options.reason,
                    groupHeads: options.groupHead,
                    modes: options.mode,
                    months: Array.from(monthsSet),
                });
            } catch (err: any) {
                setError(err.message);
                console.error("Error fetching dashboard data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboardData();
    }, []);

    const filteredTransactions = useMemo(() => {
        let userVisibleTransactions = currentUser.role === 'admin'
            ? allTransactions
            : allTransactions.filter(t => t.personName === currentUser.name);

        return userVisibleTransactions.filter(t => {
            if (filters.dateFrom && t.date < filters.dateFrom) return false;
            if (filters.dateTo && t.date > filters.dateTo) return false;
            if (filters.personName !== 'all' && t.personName !== filters.personName) return false;
            if (filters.groupHead !== 'all' && t.groupHead !== filters.groupHead) return false;
            if (filters.mode !== 'all' && t.mode !== filters.mode) return false;
            if (filters.reason !== 'all' && t.reason !== filters.reason) return false;
            if (filters.monthName !== 'all' && t.monthName !== filters.monthName) return false;
            if (filters.search.trim()) {
                const query = filters.search.trim().toLowerCase();
                const matches = [
                    t.personName,
                    t.groupHead,
                    t.reason,
                    t.mode,
                    t.monthName,
                    t.timestamp,
                ].some(value => value?.toLowerCase().includes(query));
                if (!matches) return false;
            }
            return true;
        });
    }, [allTransactions, filters, currentUser]);

    const totalIncoming = useMemo(() => filteredTransactions.reduce((sum, t) => sum + t.incoming, 0), [filteredTransactions]);
    const totalOutgoing = useMemo(() => filteredTransactions.reduce((sum, t) => sum + t.outgoing, 0), [filteredTransactions]);
    const balance = totalIncoming - totalOutgoing;

    const timeSeriesData = useMemo(() => {
        const dailyData = new Map<string, { date: string, income: number, expense: number }>();
        const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let cumulativeBalance = 0;
        sorted.forEach(t => {
            const dateKey = t.date;
            if (!dailyData.has(dateKey)) dailyData.set(dateKey, { date: dateKey, income: 0, expense: 0 });
            const entry = dailyData.get(dateKey)!;
            entry.income += t.incoming;
            entry.expense += t.outgoing;
        });
        return Array.from(dailyData.values()).map(d => {
            cumulativeBalance += d.income - d.expense;
            return { ...d, balance: cumulativeBalance };
        });
    }, [filteredTransactions]);

    const expenseByGroupHeadData = useMemo(() => {
        const groupMap = new Map<string, number>();
        filteredTransactions.forEach(t => {
            if (t.outgoing > 0 && t.groupHead) {
                groupMap.set(t.groupHead, (groupMap.get(t.groupHead) || 0) + t.outgoing);
            }
        });
        return Array.from(groupMap.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredTransactions]);
    const totalExpenseByGroupHead = useMemo(
        () => expenseByGroupHeadData.reduce((sum, d) => sum + d.value, 0),
        [expenseByGroupHeadData]
    );
    const pieExpenseData = useMemo(() => {
        if (totalExpenseByGroupHead <= 0) return [];
        return [...expenseByGroupHeadData]
            .sort((a, b) => b.value - a.value)
            .map(item => ({
                ...item,
                percent: (item.value / totalExpenseByGroupHead) * 100,
            }));
    }, [expenseByGroupHeadData, totalExpenseByGroupHead]);

    const MAX_VISIBLE_LEGEND_ITEMS = 6;
    const majorExpenseItems = useMemo(
        () => pieExpenseData.slice(0, MAX_VISIBLE_LEGEND_ITEMS),
        [pieExpenseData]
    );
    const minorExpenseItems = useMemo(
        () => pieExpenseData.slice(MAX_VISIBLE_LEGEND_ITEMS),
        [pieExpenseData]
    );
    const minorExpensePercentTotal = useMemo(
        () => minorExpenseItems.reduce((sum, item) => sum + item.percent, 0),
        [minorExpenseItems]
    );
    const minorExpenseHoverText = useMemo(
        () => minorExpenseItems
            .map(item => `${item.name}: ${item.percent.toFixed(1)}% (₹${item.value.toLocaleString('en-IN')})`)
            .join('\n'),
        [minorExpenseItems]
    );

    const recentTransactions = useMemo(() => filteredTransactions.slice(0, 5), [filteredTransactions]);
    const handleFilterChange = (name: keyof Filters, value: string) => setFilters(prev => ({ ...prev, [name]: value }));
    const clearFilters = () => setFilters({ dateFrom: '', dateTo: '', personName: 'all', groupHead: 'all', reason: 'all', mode: 'all', monthName: 'all', search: '' });

    const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];
    const getPieColor = (index: number) => PIE_COLORS[index % PIE_COLORS.length];

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#f5f3ff]">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-4" />
            <span className="text-lg text-slate-500 font-medium animate-pulse">Loading Dashboard...</span>
        </div>
    );
    if (error) return (
        <div className="flex items-center justify-center h-screen bg-[#f5f3ff] p-6">
            <div className="max-w-md w-full p-6 text-center bg-red-50 border border-red-100 rounded-2xl">
                <p className="font-bold text-red-800 text-lg mb-2">Dashboard Error</p>
                <p className="text-red-600/80">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="p-3 sm:p-6 md:p-8 bg-[#f5f3ff] min-h-screen space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            <div className="flex justify-between items-center mb-1 sm:mb-3">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Overview</h2>
                <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 bg-white border-violet-200 text-violet-600 hover:bg-violet-50 hover:text-violet-700 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm">
                            <Filter className="h-4 w-4" />
                            Filter
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl w-[calc(100vw-1.5rem)] sm:w-full max-h-[88vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl z-[100]" aria-describedby={undefined}>
                        <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Filter className="h-5 w-5 text-violet-500" />
                                Filter Transactions
                            </DialogTitle>
                            <DialogDescription className="sr-only">Filter transactions overview</DialogDescription>
                        </DialogHeader>
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-h-0">
                            <div className="space-y-1">
                                <Label htmlFor="dateFrom">From Date</Label>
                                <Input id="dateFrom" type="date" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} className="rounded-xl h-11" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="dateTo">To Date</Label>
                                <Input id="dateTo" type="date" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} className="rounded-xl h-11" />
                            </div>

                            {currentUser.role === 'admin' && (
                                <div className="space-y-1">
                                    <Label>Person Name</Label>
                                    <Select value={filters.personName} onValueChange={val => handleFilterChange('personName', val)}>
                                        <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200">
                                            <SelectValue placeholder="All Persons" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Persons</SelectItem>
                                            {dropdownOptions.personNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label>Group Head</Label>
                                <Select value={filters.groupHead} onValueChange={val => handleFilterChange('groupHead', val)}>
                                    <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200">
                                        <SelectValue placeholder="All Groups" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Groups</SelectItem>
                                        {dropdownOptions.groupHeads.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Mode</Label>
                                <Select value={filters.mode} onValueChange={val => handleFilterChange('mode', val)}>
                                    <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200">
                                        <SelectValue placeholder="All Modes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Modes</SelectItem>
                                        {dropdownOptions.modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Reason</Label>
                                <Select value={filters.reason} onValueChange={val => handleFilterChange('reason', val)}>
                                    <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200">
                                        <SelectValue placeholder="All Reasons" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Reasons</SelectItem>
                                        {dropdownOptions.reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Month</Label>
                                <Select value={filters.monthName} onValueChange={val => handleFilterChange('monthName', val)}>
                                    <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200">
                                        <SelectValue placeholder="All Months" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Months</SelectItem>
                                        {dropdownOptions.months.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                            <Button onClick={clearFilters} variant="outline" className="w-full sm:w-auto">Clear All</Button>
                            <Button onClick={() => setIsFilterDialogOpen(false)} className="w-full sm:w-auto">Apply Filters</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <Card className="group hover:scale-[1.02] active:scale-[0.98]">
                    <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                        <div className="space-y-1">
                            <div className="text-xl sm:text-2xl font-bold text-emerald-600">₹{totalIncoming.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Income</div>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group hover:scale-[1.02] active:scale-[0.98]">
                    <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                        <div className="space-y-1">
                            <div className="text-xl sm:text-2xl font-bold text-rose-600">₹{totalOutgoing.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Expense</div>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors">
                            <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group hover:scale-[1.02] active:scale-[0.98]">
                    <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                        <div className="space-y-1">
                            <div className="text-xl sm:text-2xl font-bold text-violet-600">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Balance</div>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group hover:scale-[1.02] active:scale-[0.98]">
                    <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                        <div className="space-y-1">
                            <div className="text-xl sm:text-2xl font-bold text-slate-600">{allTransactions.length}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transactions</div>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5">
                    <CardTitle className="text-sm sm:text-base"><List className="w-4 h-4 text-violet-500" /> Recent Transactions</CardTitle>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 5 entries</span>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm min-w-[620px]">
                            <thead>
                                <tr className="bg-violet-50/80 border-b border-violet-100">
                                    <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Date</th>
                                    {currentUser.role === 'admin' && <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Person</th>}
                                    <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Group Head</th>
                                    <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Reason</th>
                                    <th className="p-3 sm:p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                                    <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Income</th>
                                    <th className="p-3 sm:p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Expense</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.length > 0 ? (
                                    recentTransactions.map(t => (
                                        <tr key={t.id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3 sm:p-4 text-slate-600">{t.formattedDate}</td>
                                            {currentUser.role === 'admin' && <td className="p-3 sm:p-4 text-slate-700 font-medium">{t.personName}</td>}
                                            <td className="p-3 sm:p-4"><Badge>{t.groupHead}</Badge></td>
                                            <td className="p-3 sm:p-4 text-slate-600">{t.reason}</td>
                                            <td className="p-3 sm:p-4"><Badge variant="secondary">{t.mode}</Badge></td>
                                            <td className="p-3 sm:p-4 text-right text-emerald-600 font-bold">{t.incoming > 0 ? `₹${t.incoming.toLocaleString('en-IN')}` : '-'}</td>
                                            <td className="p-3 sm:p-4 text-right text-rose-600 font-bold">{t.outgoing > 0 ? `₹${t.outgoing.toLocaleString('en-IN')}` : '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={currentUser.role === 'admin' ? 7 : 6} className="p-8 text-center text-slate-400 italic">
                                            No recent transactions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader className="p-4 sm:p-5"><CardTitle className="text-sm sm:text-base">Income, Expense & Balance Trend</CardTitle></CardHeader>
                    <CardContent className="h-72 sm:h-80 p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={formatXAxisDate} tick={{ fontSize: 11 }} />
                                <YAxis
                                    width={60}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(value: number) => {
                                        if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                                        if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                                        return `₹${value}`;
                                    }}
                                />
                                <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                                <Line type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                                <Line type="monotone" dataKey="balance" name="Balance" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader className="p-4 sm:p-5"><CardTitle className="text-sm sm:text-base">Expense by Group Head</CardTitle></CardHeader>
                    <CardContent className="h-72 sm:h-80 p-2 sm:p-6 flex flex-col items-center justify-center">
                        <div className="w-full h-full">
                            {pieExpenseData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                        <Pie
                                            data={pieExpenseData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="45%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={70}
                                            paddingAngle={3}
                                        >
                                            {pieExpenseData.map((_, i) => (
                                                <Cell key={`cell-${i}`} fill={getPieColor(i)} />
                                            ))}
                                        </Pie>
                                        <Legend
                                            layout="vertical"
                                            align="right"
                                            verticalAlign="middle"
                                            iconType="circle"
                                            iconSize={8}
                                            content={() => {
                                                return (
                                                    <ul className="ml-2 sm:ml-4 text-[11px] sm:text-xs text-slate-600 space-y-1 max-h-56 overflow-y-auto pr-1">
                                                        {majorExpenseItems.map((item, i: number) => (
                                                            <li key={`legend-major-${item.name}-${i}`} className="flex items-center gap-1.5 sm:gap-2">
                                                                <div
                                                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                                                                    style={{ backgroundColor: getPieColor(i) }}
                                                                />
                                                                <span className="truncate max-w-[90px] sm:max-w-[120px]">
                                                                    {item.name}
                                                                    <span className="ml-1 text-slate-400 font-semibold">
                                                                        ({Math.round(item.percent)}%)
                                                                    </span>
                                                                </span>
                                                            </li>
                                                        ))}
                                                        {minorExpenseItems.length > 0 && (
                                                            <li
                                                                className="flex items-center gap-1.5 sm:gap-2 text-slate-500 cursor-help"
                                                                title={minorExpenseHoverText}
                                                            >
                                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-300 shrink-0" />
                                                                <span className="truncate max-w-[90px] sm:max-w-[120px]">
                                                                    Others ({minorExpenseItems.length})
                                                                    <span className="ml-1 font-semibold">
                                                                        ({Math.round(minorExpensePercentTotal)}%)
                                                                    </span>
                                                                </span>
                                                            </li>
                                                        )}
                                                    </ul>
                                                );
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                            formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm italic">
                                    No expense data
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}

export default DashboardView;
