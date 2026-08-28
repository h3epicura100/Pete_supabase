"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginPage from "@/components/login-page"
import type { AppUser } from "@/components/login-page"

export default function LoginPageContainer() {
  const router = useRouter()

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser")
    if (savedUser) {
      try {
        const user: AppUser = JSON.parse(savedUser)
        const initialView = user.pages.includes("dashboard") ? "dashboard" : user.pages[0] || "dashboard"
        router.replace(`/${initialView}`)
      } catch (e) {
        sessionStorage.removeItem("currentUser")
      }
    }
  }, [router])

  const handleLogin = (user: AppUser) => {
    sessionStorage.setItem("currentUser", JSON.stringify(user))
    const initialView = user.pages.includes("dashboard") ? "dashboard" : user.pages[0] || "dashboard"
    router.push(`/${initialView}`)
  }

  return <LoginPage onLogin={handleLogin} />
}
