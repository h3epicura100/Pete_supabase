"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { Loader2 } from "lucide-react"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser")
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        const initialView = user.pages.includes("dashboard") ? "dashboard" : user.pages[0] || "dashboard"
        router.replace(`/${initialView}`)
      } catch (e) {
        router.replace("/login")
      }
    } else {
      router.replace("/login")
    }
  }, [router])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f5f3ff]">
      <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
    </div>
  )
}