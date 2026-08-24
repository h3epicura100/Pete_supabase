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

export default function AuthenticatedLayout({
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

  if (!currentUser) return null // Handled by AuthGuard

  const userInitial = currentUser.name.charAt(0).toUpperCase()

  // Sort user pages strictly according to CANONICAL_PAGE_ORDER so Settings is always last
  const sortedPages = [...currentUser.pages]
    .filter((page) => pageLabels[page])
    .sort((a, b) => {
      const indexA = CANONICAL_PAGE_ORDER.indexOf(a) !== -1 ? CANONICAL_PAGE_ORDER.indexOf(a) : 99
      const indexB = CANONICAL_PAGE_ORDER.indexOf(b) !== -1 ? CANONICAL_PAGE_ORDER.indexOf(b) : 99
      return indexA - indexB
    })

  return (
    <AuthGuard>
      <SidebarProvider>
        <Sidebar className="bg-white border-r border-slate-200">
          <SidebarHeader className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-lg">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-800">
                  {currentUser.name}
                </span>
                <span className="text-sm text-slate-500 capitalize">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarMenu className="flex flex-col gap-2">
              {sortedPages.map((page) => {
                const Icon = pageIcons[page] || LayoutDashboard
                return (
                  <SidebarMenuItem key={page}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={activeView === page}
                      tooltip={pageLabels[page]}
                      className="group text-slate-600 hover:bg-purple-50 hover:text-purple-700 data-[active=true]:bg-purple-100 data-[active=true]:text-purple-700 data-[active=true]:font-bold gap-4"
                    >
                      <Link href={`/${page}`}>
                        <Icon className="size-5 text-slate-500 group-hover:text-purple-700 data-[active=true]:text-purple-700" />
                        <span className="text-base">{pageLabels[page]}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  onClick={handleLogout}
                  className="group w-full justify-start text-slate-600 hover:bg-red-50 hover:text-red-600 gap-4"
                >
                  <LogOut className="size-5 text-slate-500 group-hover:text-red-600" />
                  <span className="text-base">Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="relative flex min-h-svh flex-1 flex-col bg-background">
          <main className="flex-1 overflow-auto bg-slate-50 pb-16">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </AuthGuard>
  )
}
