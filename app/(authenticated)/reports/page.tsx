"use client"

import { useEffect, useState } from "react"
import ReportsView from "@/components/reports-view"
import ReportDetailView from "@/components/report-detail-view"
import type { AppUser } from "@/components/login-page"
import { Loader2 } from "lucide-react"

import { Transaction } from "@/lib/api/transactions"

interface DetailViewData {
  type: string
  value: string
  data: Transaction[]
}

export default function ReportsPage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [detailViewData, setDetailViewData] = useState<DetailViewData | null>(null)

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser")
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f5f3ff]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600 mb-4" />
        <p className="text-slate-500 animate-pulse">Preparing reports...</p>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      {detailViewData ? (
        <ReportDetailView
          detail={detailViewData}
          onBack={() => setDetailViewData(null)}
          currentUser={currentUser as any}
        />
      ) : (
        <ReportsView
          currentUser={currentUser as any}
          onDetailClick={(detail) => setDetailViewData(detail)}
        />
      )}
    </div>
  )
}
