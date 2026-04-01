'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from './sidebar-context'

export function TopNavbar() {
  const { toggleMobile } = useSidebar()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-[#E2E8F0] flex items-center px-4 gap-3">
      {/* Left: logo + brand name */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="relative h-8 w-8 shrink-0">
          <Image src="/logo.jpg" alt="CCS Center" fill className="object-contain" priority />
        </div>
        <span
          className="font-semibold text-[#0F172A] truncate"
          style={{ fontSize: '18px', letterSpacing: '0.5px' }}
        >
          CCS Center
        </span>
      </div>

      {/* Right: user email + logout + mobile hamburger */}
      <div className="flex items-center gap-2 shrink-0">
        {email && (
          <span className="hidden md:block text-sm text-[#64748B] truncate max-w-[14rem]">
            {email}
          </span>
        )}

        {/* Logout button — visible on md+ */}
        <button
          onClick={handleLogout}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-xs font-medium">Salir</span>
        </button>

        {/* Mobile: hamburger on right */}
        <button
          onClick={toggleMobile}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
