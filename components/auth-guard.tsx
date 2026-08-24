"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { AppUser } from "@/components/login-page"
import { Loader2 } from "lucide-react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = () => {
      const savedUser = sessionStorage.getItem("currentUser")
      if (!savedUser) {
        router.push("/login")
        return
      }
      
      const parsedUser: AppUser = JSON.parse(savedUser)
      setUser(parsedUser)
      
      // Check if user has permission for the current page
      const currentView = pathname.split("/").pop() || ""
      const isAdmin = parsedUser.role === "admin"
      
      if (
        currentView &&
        currentView !== "dashboard" &&
        !isAdmin &&
        !parsedUser.pages.includes(currentView)
      ) {
        router.push("/dashboard")
      }
      
      setLoading(false)
    }

    checkAuth()
  }, [router, pathname])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f5f3ff]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    )
  }

  return <>{children}</>
}
