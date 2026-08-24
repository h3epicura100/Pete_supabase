"use client"

import React, { useState } from "react"
import { ArrowLeft, FileText, TrendingUp, TrendingDown, LayoutDashboard, ChevronRight } from "lucide-react"

// --- INTERFACES ---
interface Transaction {
  id: string
  personName: string
  userId: string
  date: string
  incoming: number
  outgoing: number
  mode: string
  groupHead: string
  reason: string
}

interface AppUser {
  id: string
  name: string
  role: "user" | "admin"
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
    <h3 className={`text-sm font-bold text-slate-800 flex items-center gap-2.5 ${className}`}>
        {children}
    </h3>
);
const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);
const Button = ({ children, onClick, variant = 'default', className = '' }: { children: React.ReactNode, onClick?: () => void, variant?: string, className?: string }) => {
  const baseClasses = 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 active:scale-[0.98] shadow-lg';
  const variantClasses = variant === 'outline' 
    ? 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-none' 
    : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:opacity-90 shadow-violet-500/20';
  return <button onClick={onClick} className={`${baseClasses} ${variantClasses} ${className}`}>{children}</button>;
};
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'secondary' | 'outline' }) => {
    const variants = {
        default: "bg-violet-50 text-violet-600 border border-violet-100",
        secondary: "bg-slate-100 text-slate-500 border border-slate-200",
        outline: "bg-white border border-slate-200 text-slate-600"
    };
    return <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block ${variants[variant]}`}>{children}</span>
};

// --- HELPERS ---
const formatAbbreviatedIndian = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 10000000) return (value / 10000000).toFixed(1) + " Cr";
    if (abs >= 100000) return (value / 100000).toFixed(1) + " L";
    if (abs >= 1000) return (value / 1000).toFixed(1) + " K";
    return value.toString();
};

const formatExactIndian = (value: number): string => {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// --- MAIN COMPONENT ---
function ReportDetailView({
  detail,
  onBack,
  currentUser,
}: {
  detail: { type: string; value:string; data: Transaction[] }
  onBack: () => void
  currentUser: AppUser
}) {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({});

  const totalIncoming = detail.data.reduce((sum, t) => sum + t.incoming, 0)
  const totalOutgoing = detail.data.reduce((sum, t) => sum + t.outgoing, 0)
  const balance = totalIncoming - totalOutgoing

  const toggleMetric = (id: string) => {
    setVisibleMetrics(prev => ({ ...prev, [id]: !prev[id] }));
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
                        {isExpanded ? formatExactIndian(value) : formatAbbreviatedIndian(value)}
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
    <div className="p-2 bg-[#f5f3ff] min-h-screen space-y-6 animate-in fade-in duration-500">
      {/* Header Card */}
      <Card className="border-[#ede9fe] shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-violet-50/70 border-b border-violet-100/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 w-full">
                <div>
                   <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-violet-500" />
                      <h1 className="text-xl font-black text-slate-800 tracking-tight">
                        {detail.type === "groupHead" && "Group: "}
                        {detail.type === "mode" && "Mode: "}
                        {detail.type === "month" && "Month: "}
                        {detail.type === "person" && "Person: "}
                        <span className="text-violet-600">{detail.value}</span>
                      </h1>
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-7">{detail.data.length} transactions found</p>
                </div>
                <div className="ml-auto">
                    <Button onClick={onBack} variant="outline" className="h-10 px-4 rounded-xl text-xs bg-white/50 backdrop-blur-sm border-violet-100 hover:bg-violet-50">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
            id="income" label="Total Income" value={totalIncoming} icon={TrendingUp} 
            colorClass="text-emerald-600" bgClass="bg-emerald-50/50" iconBgClass="bg-emerald-100/50" 
        />
        <MetricCard 
            id="expense" label="Total Expense" value={totalOutgoing} icon={TrendingDown} 
            colorClass="text-rose-600" bgClass="bg-rose-50/50" iconBgClass="bg-rose-100/50" 
        />
        <MetricCard 
            id="deficit" label={balance >= 0 ? "Net Balance" : "Net Deficit"} value={Math.abs(balance)} icon={LayoutDashboard} 
            colorClass={balance >= 0 ? "text-violet-600" : "text-amber-600"} 
            bgClass={balance >= 0 ? "bg-violet-50/50" : "bg-amber-50/50"} 
            iconBgClass={balance >= 0 ? "bg-violet-100/50" : "bg-amber-100/50"} 
        />
      </div>

      {/* Detailed Transactions Table Card */}
      <Card className="border-[#ede9fe] shadow-xl shadow-violet-500/5 rounded-2xl overflow-hidden mt-0">
        <CardHeader className="bg-violet-50/70 border-b border-violet-100/80 px-4 py-3">
          <CardTitle className="text-slate-800 text-sm md:text-base font-bold flex items-center gap-2">
            Detailed Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-violet-50/80 sticky top-0 backdrop-blur-sm z-20">
                <tr className="border-b border-violet-100">
                  <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Date</th>
                  {currentUser.role === "admin" && <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Person</th>}
                  <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Group Head</th>
                  <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Reason</th>
                  <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-violet-600">Mode</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Income</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-violet-600">Expense</th>
                </tr>
              </thead>
              <tbody>
                {detail.data.length > 0 ? (
                  detail.data.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-600 font-medium">{new Date(transaction.date).toLocaleDateString('en-GB')}</td>
                      {currentUser.role === "admin" && <td className="p-4 text-slate-800 font-bold">{transaction.personName}</td>}
                      <td className="p-4">
                        <Badge variant="default">{transaction.groupHead}</Badge>
                      </td>
                      <td className="p-4 text-slate-600">{transaction.reason}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{transaction.mode}</Badge>
                      </td>
                      <td className="p-4 text-right text-emerald-600 font-bold">
                        {transaction.incoming > 0 ? `₹${transaction.incoming.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : "-"}
                      </td>
                      <td className="p-4 text-right text-rose-600 font-bold">
                        {transaction.outgoing > 0 ? `₹${transaction.outgoing.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No transactions found for this selection.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReportDetailView
