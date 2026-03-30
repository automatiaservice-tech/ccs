'use client'

import Image from 'next/image'
import { Menu } from 'lucide-react'
import { useSidebar } from './sidebar-context'

export function MobileHeader() {
  const { toggleMobile } = useSidebar()

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3">
      <button
        onClick={toggleMobile}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8">
          <Image src="/logo.svg" alt="CCS Center" fill className="object-contain" priority />
        </div>
        <span className="text-sm font-bold text-slate-100">CCS Center</span>
      </div>
    </header>
  )
}
