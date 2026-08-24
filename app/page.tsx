"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser")
    if (savedUser) {
      const user = JSON.parse(savedUser)
      const initialView = user.pages.includes("dashboard") ? "dashboard" : user.pages[0] || "dashboard"
      router.push(`/${initialView}`)
    } else {
      router.push("/login")
    }
  }, [router])

  return null // or a loading skeleton
}