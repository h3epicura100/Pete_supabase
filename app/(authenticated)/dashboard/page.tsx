"use client"

import { useEffect, useState } from "react"
import DashboardView from "@/components/dashboard-view"
import type { AppUser } from "@/components/login-page"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser")
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return <DashboardView currentUser={currentUser} />
}
