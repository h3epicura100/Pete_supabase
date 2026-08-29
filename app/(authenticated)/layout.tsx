"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth-guard'
import type { AppUser } from '@/components/login-page'

// UI Components
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LogOut,
  LayoutDashboard,
  FilePlus,
  BarChart3,
  Archive,
  Database,
  Settings,
} from 'lucide-react'

// Strict fixed sequence for sidebar items
const CANONICAL_PAGE_ORDER = [
  'dashboard',
  'form',
  'receiving',
  'reports',
  'master',
  'settings',
]

// Page Mappings (Sync with app/page.tsx)
const pageIcons: { [key: string]: React.ElementType } = {
  dashboard: LayoutDashboard,
  form: FilePlus,
  reports: BarChart3,
  receiving: Archive,
  master: Database,
  settings: Settings,
}

const pageLabels: { [key: string]: string } = {
  dashboard: 'Dashboard',
  form: 'Entries',
  reports: 'Reports',
  receiving: 'Receiving',
  master: 'Master',
  settings: 'Settings',
}

function AuthenticatedNav({
  currentUser,
  activeView,
  handleLogout,
  sortedPages,
}: {
  currentUser: AppUser
  activeView: string
  handleLogout: () => void
  sortedPages: string[]
}) {
  const { setOpenMobile } = useSidebar()

  return (
    <>
      {/* Mobile Top Navbar (Visible on screens < md) */}
      <header className="sticky top-0 z-30 flex h-14 md:hidden w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-4 backdrop-blur-md shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <SidebarTrigger className="h-9 w-9 text-slate-700 hover:bg-purple-50 hover:text-purple-700" />
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/H3-logo.svg" alt="H3 Logo" className="h-6 w-auto" />
            <span className="font-extrabold text-base bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              Pete App
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-800 max-w-[110px] truncate leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-slate-400 capitalize font-medium">
              {currentUser.role}
            </span>
          </div>
          <Avatar className="h-7 w-7 border border-purple-200">
            <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-xs">
              {currentUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Sidebar Component */}
      <Sidebar className="bg-white border-r border-slate-200">
        <SidebarHeader className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-purple-200 shrink-0">
              <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-base sm:text-lg">
                {currentUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-lg font-bold text-slate-800 truncate">
                {currentUser.name}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 capitalize">
                {currentUser.role}
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-3 sm:p-4">
          <SidebarMenu className="flex flex-col gap-1.5 sm:gap-2">
            {sortedPages.map((page) => {
              const Icon = pageIcons[page] || LayoutDashboard
              return (
                <SidebarMenuItem key={page}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={activeView === page}
                    tooltip={pageLabels[page]}
                    onClick={() => setOpenMobile(false)}
                    className="group text-slate-600 hover:bg-purple-50 hover:text-purple-700 data-[active=true]:bg-purple-100 data-[active=true]:text-purple-700 data-[active=true]:font-bold gap-3 sm:gap-4 rounded-xl"
                  >
                    <Link href={`/${page}`}>
                      <Icon className="size-5 text-slate-500 group-hover:text-purple-700 data-[active=true]:text-purple-700" />
                      <span className="text-sm sm:text-base font-semibold">{pageLabels[page]}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-3 sm:p-4 mt-auto border-t border-slate-100">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={() => {
                  setOpenMobile(false)
                  handleLogout()
                }}
                className="group w-full justify-start text-slate-600 hover:bg-red-50 hover:text-red-600 gap-3 sm:gap-4 rounded-xl"
              >
                <LogOut className="size-5 text-slate-500 group-hover:text-red-600" />
                <span className="text-sm sm:text-base font-semibold">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}

function AuthenticatedContent({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  
  // Extract active view from pathname (e.g., /dashboard -> dashboard)
  const activeView = pathname.split('/').pop() || 'dashboard'

  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser')
    if (savedUser) {
      const user: AppUser = JSON.parse(savedUser)
      let updated = false

      // Admin role automatically gets master and settings in sidebar
      if (user.role === 'admin') {
        if (!user.pages.includes('master')) {
          user.pages.push('master')
          updated = true
        }
        if (!user.pages.includes('settings')) {
          user.pages.push('settings')
          updated = true
        }
      }

      if (updated) {
        sessionStorage.setItem('currentUser', JSON.stringify(user))
      }

      setCurrentUser(user)
    }
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser')
    sessionStorage.removeItem('activeView')
    router.push('/login')
  }

  if (!currentUser) return null

  // Sort user pages strictly according to CANONICAL_PAGE_ORDER so Settings is always last
  const sortedPages = [...currentUser.pages]
    .filter((page) => pageLabels[page])
    .sort((a, b) => {
      const indexA = CANONICAL_PAGE_ORDER.indexOf(a) !== -1 ? CANONICAL_PAGE_ORDER.indexOf(a) : 99
      const indexB = CANONICAL_PAGE_ORDER.indexOf(b) !== -1 ? CANONICAL_PAGE_ORDER.indexOf(b) : 99
      return indexA - indexB
    })

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col md:flex-row bg-slate-50 overflow-x-hidden">
        <AuthenticatedNav
          currentUser={currentUser}
          activeView={activeView}
          handleLogout={handleLogout}
          sortedPages={sortedPages}
        />
        <div className="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-hidden bg-slate-50">
          <main className="flex-1 min-w-0 overflow-x-hidden bg-slate-50 pb-16">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </AuthGuard>
  )
}
